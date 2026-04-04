# evaluator.py
"""
Scoring engine aligned with the PSB Hackathon problem statement.

Score breakdown (0–10):
  TLS version quality    : 0–4 pts
  Cipher suite quality   : 0–3 pts
  Key size               : 0–2 pts
  Forward secrecy        : 0–1 pt
  ─────────────────────────────────
  Max                    : 10.0

Tier thresholds (risk_score = simple_score × 100):
  Elite-PQC  : PQC detected              → 10.0  (1000)
  Excellent  : score ≥ 8.5               → 850–999
  Standard   : score ≥ 7.0               → 700–849
  Legacy     : score ≥ 2.0               → 200–699
  Critical   : score < 2.0  or conn fail → 0–199
"""

STRONG_CIPHERS = {
    "TLS_AES_256_GCM_SHA384", "TLS_AES_128_GCM_SHA256",
    "TLS_CHACHA20_POLY1305_SHA256",
    "ECDHE-RSA-AES256-GCM-SHA384", "ECDHE-ECDSA-AES256-GCM-SHA384",
    "ECDHE-RSA-AES128-GCM-SHA256", "ECDHE-ECDSA-AES128-GCM-SHA256",
    "DHE-RSA-AES256-GCM-SHA384",
}
WEAK_CIPHER_FRAGMENTS = [
    "DES", "RC4", "NULL", "EXPORT", "EXP-", "ADH-", "ANULL", "ENULL",
    "3DES", "CBC3",
]
WEAK_TLS = {"SSLv2", "SSLv3", "TLSv1", "TLSv1.0", "TLSv1.1"}


def _cipher_score(cipher: str | None) -> tuple[float, list[str]]:
    if not cipher:
        return 1.0, []   # unknown cipher — partial credit, no penalty
    cu = cipher.upper()
    if cu in {c.upper() for c in STRONG_CIPHERS}:
        return 3.0, []
    for frag in WEAK_CIPHER_FRAGMENTS:
        if frag in cu:
            return 0.0, [
                f"Weak cipher detected: '{cipher}'. "
                "Disable all CBC, 3DES, RC4 and NULL cipher suites immediately."
            ]
    return 1.5, [
        f"Cipher '{cipher}' is acceptable but not optimal. "
        "Prefer ECDHE-RSA-AES256-GCM-SHA384 or TLS 1.3 equivalents."
    ]


def evaluate_risk(scan_data: dict) -> tuple[str, float, float, list[str]]:
    """Returns (tier, combined_score 0–10, app_score 0–10, recommendations)."""

    # Connection failure
    if scan_data.get("error"):
        return (
            "Critical", 0.0, 0.0,
            [
                "Connection failed — host may be behind firewall or VPN.",
                "Verify the asset is publicly reachable on port 443.",
                "Run a manual TLS audit once access is confirmed.",
                "Implement NIST PQC algorithms (ML-KEM FIPS 203) once accessible.",
            ]
        )

    score = 0.0
    rec:  list[str] = []

    tls    = (scan_data.get("tls_version") or "").strip()
    cipher = (scan_data.get("cipher_suite") or "").strip()
    ks     = scan_data.get("key_size") or 0
    pqc    = scan_data.get("pqc_detected", False)
    ke     = (scan_data.get("key_exchange") or "").upper()
    cert_status = (scan_data.get("cert_status") or "Valid").strip()
    trust_status = (scan_data.get("trust_status") or "Valid").strip()

    # ── Certificate health ──────────────────────────────────────────────────
    if cert_status == "Expired":
        return (
            "Critical", 0.0, 0.0,
            [
                "Certificate is expired. Replace it immediately.",
                "Expired certificates break trust and should not score higher.",
                "Verify the TLS trust chain and use a valid certificate authority.",
            ]
        )

    # ── Certificate trust validation ────────────────────────────────────────
    if trust_status in ("Self-signed", "Hostname-mismatch", "Chain-invalid"):
        return (
            "Critical", 0.0, 0.0,
            [
                f"Certificate trust failure: {trust_status}.",
                "This indicates a fundamental security issue that cannot be scored highly.",
                "Replace with a properly signed certificate from a trusted CA.",
                "Ensure the certificate matches the hostname exactly.",
            ]
        )

    # ── PQC detected → Elite, max score ──────────────────────────────────────
    if pqc:
        method = scan_data.get("pqc_method", "Unknown")
        return (
            "Elite-PQC", 10.0, 10.0,
            [
                f"Asset is Quantum-Safe via {method}.",
                "Awarded 'PQC-Ready' label per NIST FIPS 203/204/205.",
                "Maintain certificate rotation schedule.",
                "Continue monitoring for new NIST PQC standard updates.",
            ]
        )

    # ── TLS version (0–4 pts) ─────────────────────────────────────────────────
    if tls == "TLSv1.3":
        score += 4.0
    elif tls == "TLSv1.2":
        score += 2.5
        rec.append("Upgrade to TLS 1.3 for improved security (NIST recommendation).")
    elif tls == "TLSv1.1":
        score += 1.0
        rec.append("TLS 1.1 is deprecated (RFC 8996). Upgrade to TLS 1.3 immediately.")
    elif tls in WEAK_TLS or tls in ("TLSv1", "TLSv1.0"):
        score += 0.5
        rec.append(f"CRITICAL: {tls} is deprecated. Disable and enforce TLS 1.2+ minimum.")
    elif tls:
        score += 0.0
        rec.append(f"Unknown protocol '{tls}' — verify TLS configuration.")
    else:
        # No TLS version captured — give partial credit (scanning limitation)
        score += 1.0
        rec.append("TLS version could not be determined. Verify TLS 1.3 is configured.")

    # ── Cipher suite (0–3 pts) ────────────────────────────────────────────────
    c_score, c_recs = _cipher_score(cipher)
    score += c_score
    rec.extend(c_recs)

    # ── Key size (0–2 pts) ────────────────────────────────────────────────────
    if ks >= 4096:
        score += 2.0
    elif ks >= 3072:
        score += 1.5
    elif ks >= 2048:
        score += 1.0
        rec.append("RSA/ECC key is 2048-bit. Upgrade to 3072-bit+ for post-quantum resilience.")
    elif ks >= 1024:
        score += 0.0
        rec.append("RSA key is 1024-bit — cryptographically weak. Rotate certificate immediately.")
    elif ks > 0:
        score += 0.0
        rec.append(f"Key size {ks}-bit is dangerously small. Replace certificate urgently.")
    else:
        # Key size not captured — give partial credit
        score += 0.5
        rec.append("Key size could not be determined. Verify certificate uses ≥ 2048-bit key.")

    # ── Forward secrecy (0–1 pt) ──────────────────────────────────────────────
    if "ECDH" in ke or "DHE" in ke or "X25519" in ke or "ECDHE" in cipher.upper():
        score += 1.0
    else:
        rec.append(
            "Forward secrecy may not be enabled. Use ECDHE key exchange "
            "to protect past sessions from future decryption."
        )

    if cert_status == "Expiring":
        score = max(score - 1.5, 0.0)
        rec.append(
            "Certificate is expiring soon. Renew it before expiration to avoid a trust failure."
        )

    score = round(min(score, 10.0), 1)

    # ── Application security score (0–10) ────────────────────────────────────
    app_score = 0.0
    security_headers = scan_data.get("security_headers", {})

    # Security headers (up to 6 points)
    if security_headers.get("Strict-Transport-Security"):
        app_score += 1.5  # HSTS prevents downgrade attacks
    if security_headers.get("Content-Security-Policy"):
        app_score += 1.5  # CSP prevents XSS
    if security_headers.get("X-Frame-Options"):
        app_score += 1.0  # Prevents clickjacking
    if security_headers.get("X-Content-Type-Options"):
        app_score += 1.0  # Prevents MIME sniffing
    if security_headers.get("Referrer-Policy"):
        app_score += 0.5  # Controls referrer leakage
    if security_headers.get("Permissions-Policy"):
        app_score += 0.5  # Restricts browser features

    # HTTP status and content type checks
    if scan_data.get("http_status") == 200:
        app_score += 1.0  # Successful response
    else:
        rec.append("HTTP response indicates potential issues.")

    if "text/html" in (scan_data.get("content_type") or "").lower():
        app_score += 0.5  # Web application detected

    # Penalize for HTTP errors
    if scan_data.get("http_error"):
        app_score = max(app_score - 2.0, 0.0)
        rec.append(f"HTTP request failed: {scan_data['http_error']}")

    app_score = round(min(app_score, 10.0), 1)

    # ── Combined score (weighted: 60% TLS, 40% Application) ─────────────────
    combined_score = round((score * 0.6) + (app_score * 0.4), 1)

    # ── PQC migration recommendations (always for non-PQC assets) ────────────
    rec.append(
        "Implement NIST PQC algorithms: ML-KEM (FIPS 203) for key encapsulation, "
        "ML-DSA (FIPS 204) for digital signatures."
    )
    rec.append(
        "Consider hybrid PQC+classical (e.g., X25519+Kyber768) "
        "during migration for backward compatibility."
    )

    # ── Tier based on combined score ──────────────────────────────────────────
    if combined_score >= 8.5:
        tier = "Excellent"
    elif combined_score >= 7.0:
        tier = "Standard"
    elif combined_score >= 2.0:
        tier = "Legacy"
    else:
        tier = "Critical"

    return tier, combined_score, app_score, rec
