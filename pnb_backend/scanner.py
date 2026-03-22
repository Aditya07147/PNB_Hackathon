# scanner.py
"""
Primary scanner using Python's built-in ssl + cryptography modules.
No reliance on OpenSSL CLI binary for core data — that is used only
as a secondary pass to capture key exchange / PQC group info.
"""
import ssl
import socket
import subprocess
import re
import json
import datetime

try:
    from cryptography import x509 as cx509
    from cryptography.hazmat.primitives.asymmetric import rsa, ec
    HAS_CRYPTOGRAPHY = True
except ImportError:
    HAS_CRYPTOGRAPHY = False

# ── PQC keywords (NIST FIPS 203/204/205 + drafts) ────────────────────────────
PQC_KEYWORDS = [
    "kyber", "dilithium", "falcon", "sphincs", "ml-kem", "ml-dsa",
    "slh-dsa", "x25519kyber768", "p256kyber768", "mlkem", "mldsa",
    "pqc", "post-quantum", "liboqs", "oqs"
]

def detect_asset_type(hostname: str) -> str:
    h = hostname.lower()
    if any(k in h for k in ["api", "rest", "graphql", "ws.", "webhook", "gateway"]):
        return "API"
    if any(k in h for k in ["vpn", "remote", "sslvpn"]):
        return "VPN"
    if any(k in h for k in ["mail", "smtp", "imap", "exchange"]):
        return "Mail Server"
    if any(k in h for k in ["corp", "intranet", "uat", "dev", "staging"]):
        return "Server"
    return "Web App"

def discover_inventory(domain: str = "pnbindia.in") -> list:
    prefixes = ["api", "vpn", "netbanking", "mobile", "corp", "mail",
                "uat", "portal", "retail", "internet", "b2b", "www", "secure"]
    return [f"{p}.{domain}" for p in prefixes]

def _cert_status_from_datetime(not_after) -> str:
    try:
        # Strip timezone for comparison
        if hasattr(not_after, 'tzinfo') and not_after.tzinfo is not None:
            not_after = not_after.replace(tzinfo=None)
        delta = (not_after - datetime.datetime.utcnow()).days
        if delta < 0:   return "Expired"
        if delta <= 30: return "Expiring"
        return "Valid"
    except Exception:
        return "Valid"

# ── Python ssl primary scan ───────────────────────────────────────────────────
def _scan_ssl_module(hostname: str) -> dict:
    """
    Uses Python ssl.SSLSocket to get TLS version, cipher suite,
    and raw DER certificate. Handles invalid/expired certs gracefully.
    """
    result = {}
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE   # capture expired / self-signed too

    try:
        with socket.create_connection((hostname, 443), timeout=10) as raw:
            with ctx.wrap_socket(raw, server_hostname=hostname) as tls:
                # TLS version
                ver = tls.version() or ""
                result["tls_version"] = ver  # e.g. "TLSv1.3"

                # Cipher: (name, protocol, bits)
                cipher = tls.cipher()
                if cipher:
                    result["cipher_suite"] = cipher[0]

                # DER certificate for deep parsing
                der = tls.getpeercert(binary_form=True)
                if der and HAS_CRYPTOGRAPHY:
                    result.update(_parse_der_cert(der))
                elif der:
                    result.update(_parse_cert_dict(tls.getpeercert()))

    except ssl.SSLCertVerificationError:
        pass   # cert is bad but connection succeeded — we still got data above
    except (ConnectionRefusedError, socket.timeout, socket.gaierror, OSError) as e:
        result["error"] = str(e)
    except Exception as e:
        result["error"] = str(e)

    return result

def _parse_der_cert(der: bytes) -> dict:
    """Deep parse using the cryptography library."""
    out = {}
    try:
        cert = cx509.load_der_x509_certificate(der)

        # Subject / Issuer
        try:   out["subject"] = cert.subject.rfc4514_string()
        except Exception: out["subject"] = str(cert.subject)
        try:   out["issuer"]  = cert.issuer.rfc4514_string()
        except Exception: out["issuer"]  = str(cert.issuer)

        # Dates
        nb = getattr(cert, 'not_valid_before_utc', None) or cert.not_valid_before
        na = getattr(cert, 'not_valid_after_utc',  None) or cert.not_valid_after
        out["valid_from"] = nb.strftime("%b %d %H:%M:%S %Y GMT") if nb else None
        out["valid_to"]   = na.strftime("%b %d %H:%M:%S %Y GMT") if na else None
        out["cert_status"] = _cert_status_from_datetime(na)

        # Public key
        pub = cert.public_key()
        if isinstance(pub, rsa.RSAPublicKey):
            out["public_key_algo"] = "RSA"
            out["key_size"]        = pub.key_size
        elif isinstance(pub, ec.EllipticCurvePublicKey):
            out["public_key_algo"] = "ECC"
            out["key_size"]        = pub.key_size
        else:
            out["public_key_algo"] = type(pub).__name__
            out["key_size"]        = getattr(pub, 'key_size', None)

        # Signature algorithm
        try:
            out["signature_algo"] = cert.signature_hash_algorithm.name.upper() \
                if cert.signature_hash_algorithm else "Unknown"
        except Exception:
            out["signature_algo"] = "Unknown"

    except Exception:
        pass
    return out

def _parse_cert_dict(cert_dict: dict) -> dict:
    """Fallback parser using ssl.getpeercert() dict (no binary_form)."""
    out = {}
    if not cert_dict:
        return out
    try:
        nb = cert_dict.get("notBefore", "")
        na = cert_dict.get("notAfter",  "")
        out["valid_from"] = nb
        out["valid_to"]   = na
        if na:
            dt = datetime.datetime.strptime(na, "%b %d %H:%M:%S %Y %Z")
            out["cert_status"] = _cert_status_from_datetime(dt)

        subject = dict(x[0] for x in cert_dict.get("subject", []))
        issuer  = dict(x[0] for x in cert_dict.get("issuer",  []))
        out["subject"] = subject.get("commonName", str(cert_dict.get("subject", "")))
        out["issuer"]  = issuer.get("organizationName", str(cert_dict.get("issuer", "")))
    except Exception:
        pass
    return out

# ── OpenSSL secondary scan (key exchange + PQC) ───────────────────────────────
def _scan_openssl_kex(hostname: str) -> dict:
    """
    Runs openssl s_client to get Server Temp Key (key exchange group).
    This is the only reliable way to detect X25519Kyber768 and similar PQC KEMs.
    Returns {} silently if openssl binary is unavailable.
    """
    try:
        proc = subprocess.run(
            ["openssl", "s_client", "-connect", f"{hostname}:443",
             "-servername", hostname],
            input="Q\n", capture_output=True, text=True, timeout=10
        )
        out = proc.stdout + proc.stderr
        data = {}
        m = re.search(r"Server Temp Key:\s*(.+)", out)
        if m:
            data["key_exchange"] = m.group(1).strip()
        # TLS version from openssl (backup)
        m = re.search(r"Protocol\s*:\s*(TLSv[\d.]+)", out)
        if m:
            data["tls_version_openssl"] = m.group(1)
        # Cipher (backup)
        m = re.search(r"Cipher\s*:\s*([\w\-]+)", out)
        if m:
            data["cipher_openssl"] = m.group(1)
        return data
    except Exception:
        return {}

# ── PQC detection ─────────────────────────────────────────────────────────────
def _detect_pqc(data: dict) -> tuple[bool, str]:
    haystack = " ".join([
        data.get("key_exchange", "") or "",
        data.get("cipher_suite",  "") or "",
        data.get("tls_version",   "") or "",
        data.get("signature_algo","") or "",
    ]).lower()
    for kw in PQC_KEYWORDS:
        if kw in haystack:
            return True, f"Detected '{kw}' in TLS handshake"
    return False, "None"

# ── Public entry point ────────────────────────────────────────────────────────
def scan_target(hostname: str) -> dict:
    data: dict = {
        "target":     hostname,
        "ip_address": None,
        "asset_type": detect_asset_type(hostname),
        "error":      None,
    }

    # DNS
    try:
        data["ip_address"] = socket.gethostbyname(hostname)
    except socket.gaierror as e:
        data["error"] = f"DNS resolution failed: {e}"
        return data

    # Primary: Python ssl module
    ssl_result = _scan_ssl_module(hostname)
    if ssl_result.get("error"):
        data["error"] = ssl_result["error"]
        return data

    data.update({k: v for k, v in ssl_result.items() if k != "error"})

    # Secondary: OpenSSL for key_exchange
    openssl_result = _scan_openssl_kex(hostname)
    if openssl_result.get("key_exchange"):
        data["key_exchange"] = openssl_result["key_exchange"]
    if not data.get("tls_version") and openssl_result.get("tls_version_openssl"):
        data["tls_version"] = openssl_result["tls_version_openssl"]
    if not data.get("cipher_suite") and openssl_result.get("cipher_openssl"):
        data["cipher_suite"] = openssl_result["cipher_openssl"]

    # PQC
    data["pqc_detected"], data["pqc_method"] = _detect_pqc(data)

    # Ensure cert_status default
    if not data.get("cert_status"):
        data["cert_status"] = "Valid"

    return data

# ── CBOM generator ────────────────────────────────────────────────────────────
def generate_cbom(data: dict) -> dict:
    if data.get("error"):
        return {"error": data["error"]}
    pqc = data.get("pqc_detected", False)
    tls = data.get("tls_version", "Unknown")
    if pqc:
        quantum_status, pqc_label = "Quantum-Safe (PQC / Hybrid)", "PQC-Ready ✓"
    elif tls == "TLSv1.3":
        quantum_status, pqc_label = "Modern — Not Yet Quantum-Safe", "Upgrade Recommended"
    else:
        quantum_status, pqc_label = "Legacy / Weak", "Immediate Remediation Required"
    return {
        "target":      data["target"],
        "ip":          data.get("ip_address"),
        "asset_type":  data.get("asset_type", "Web App"),
        "cert_status": data.get("cert_status", "Valid"),
        "protocols":   [{"name": "TLS", "version": tls}],
        "ciphers":     [{"name": data.get("cipher_suite"), "exchange": data.get("key_exchange")}],
        "certificate": {
            "issuer":    data.get("issuer"),
            "subject":   data.get("subject"),
            "valid_from":data.get("valid_from"),
            "valid_to":  data.get("valid_to"),
            "key_algo":  data.get("public_key_algo"),
            "key_size":  data.get("key_size"),
            "sig_algo":  data.get("signature_algo"),
        },
        "quantum_security": {
            "status":       quantum_status,
            "pqc_label":    pqc_label,
            "pqc_detected": pqc,
            "pqc_method":   data.get("pqc_method"),
        },
    }

if __name__ == "__main__":
    for t in ["pnbindia.in", "cloudflare.com", "expired.badssl.com"]:
        print(f"\n{'='*50}\n{t}")
        r = scan_target(t)
        print(json.dumps(generate_cbom(r), indent=2, default=str))