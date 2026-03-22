# seed.py
"""
Populates the database with live TLS scan data.
Run once before the demo: python seed.py

Strategy:
  - Real PNB public domains (for authenticity)
  - badssl.com test domains (guarantee all 4 risk tiers appear)
  - Reliable public HTTPS sites (ensure enough data for charts)
"""
import asyncio
import datetime
import database
from database import SessionLocal, AssetScan
import scanner
import evaluator

TARGET_DOMAINS = [
    # ── Real PNB / PSB public-facing assets ──────────────────────────────────
    "pnbindia.in",
    "pnb.co.in",
    "netpnb.com",
    "pnbmetlife.com",
    "pnbgilts.com",
    "www.pnbhousing.com",

    # ── PNB subdomain discovery (may partially resolve) ───────────────────────
    "mail.pnbindia.in",
    "api.pnb.co.in",
    "corporate.pnbindia.in",

    # ── High-quality TLS (likely Elite / Standard) ────────────────────────────
    "cloudflare.com",          # typically TLS 1.3 + strong cipher
    "google.com",
    "github.com",
    "microsoft.com",
    "amazon.com",

    # ── Standard TLS 1.2 assets ───────────────────────────────────────────────
    "tls-v1-2.badssl.com",     # TLS 1.2 → Standard / Legacy
    "sha256.badssl.com",       # SHA-256 cert → Standard
    "rsa2048.badssl.com",      # RSA 2048-bit → Standard
    "ecc384.badssl.com",       # ECC 384-bit → good score

    # ── Legacy TLS (guarantees Legacy tier in DB) ─────────────────────────────
    "tls-v1-1.badssl.com",     # TLS 1.1 → Legacy
    "sha1-intermediate.badssl.com",  # SHA-1 intermediate → Legacy

    # ── Critical / broken certs (guarantees Critical tier) ───────────────────
    "expired.badssl.com",           # Expired cert
    "self-signed.badssl.com",       # Self-signed → Critical
    "wrong.host.badssl.com",        # Hostname mismatch → Critical
]


async def scan_and_prepare(domain: str) -> database.AssetScan | None:
    print(f"  [*] Scanning: {domain}...", flush=True)
    try:
        loop = asyncio.get_running_loop()
        scan_data = await loop.run_in_executor(None, scanner.scan_target, domain)

        if scan_data.get("error"):
            print(f"  [!] {domain} → skipped: {scan_data['error']}", flush=True)
            return None

        tier, simple_score, recommendations = evaluator.evaluate_risk(scan_data)
        risk_score = int(simple_score * 100)
        cbom = scanner.generate_cbom(scan_data)

        record = database.AssetScan(
            target_url=domain,
            ip_address=scan_data.get("ip_address"),
            tls_version=scan_data.get("tls_version"),
            cipher_suite=scan_data.get("cipher_suite"),
            key_exchange=scan_data.get("key_exchange"),
            issuer=scan_data.get("issuer"),
            subject=scan_data.get("subject"),
            valid_from=scan_data.get("valid_from"),
            valid_to=scan_data.get("valid_to"),
            public_key_algo=scan_data.get("public_key_algo"),
            key_size=scan_data.get("key_size"),
            signature_algo=scan_data.get("signature_algo"),
            asset_type=scan_data.get("asset_type", "Web App"),
            cert_status=scan_data.get("cert_status", "Valid"),
            risk_tier=tier,
            risk_score=risk_score,
            simple_score=simple_score,
            is_pqc=scan_data.get("pqc_detected", False),
            pqc_method=scan_data.get("pqc_method"),
            recommendations=recommendations,
            cbom_json=cbom,
        )

        tier_label = {
            "Elite-PQC": "✅ Elite-PQC",
            "Standard":  "🟡 Standard",
            "Legacy":    "🟠 Legacy",
            "Critical":  "🔴 Critical",
        }.get(tier, tier)
        print(f"  [+] {domain} → {tier_label} | Score: {simple_score}/10", flush=True)
        return record

    except Exception as e:
        print(f"  [!] {domain} → exception: {e}", flush=True)
        return None


async def main():
    print("\n" + "═" * 60)
    print("  PNB PSB Hackathon 2026 — Database Seed Script")
    print("  Scanning live targets to populate pnb_hackathon.db")
    print("═" * 60 + "\n")

    db = SessionLocal()

    # Clear old data for a clean demo
    print("  Clearing existing data...", flush=True)
    db.query(AssetScan).delete()
    db.commit()

    # Run all scans concurrently (bounded by OS thread pool)
    tasks = [scan_and_prepare(domain) for domain in TARGET_DOMAINS]
    results = await asyncio.gather(*tasks)

    successful = [r for r in results if r is not None]

    if successful:
        db.add_all(successful)
        db.commit()
        print(f"\n  ✅ {len(successful)}/{len(TARGET_DOMAINS)} scans saved to database.")
    else:
        print("\n  ⚠️  No scans succeeded. Check your network / OpenSSL installation.")

    # Print tier summary
    tiers = {"Elite-PQC": 0, "Standard": 0, "Legacy": 0, "Critical": 0}
    for r in successful:
        tiers[r.risk_tier] = tiers.get(r.risk_tier, 0) + 1

    print("\n  Risk Tier Summary:")
    print(f"    ✅ Elite-PQC : {tiers['Elite-PQC']}")
    print(f"    🟡 Standard  : {tiers['Standard']}")
    print(f"    🟠 Legacy    : {tiers['Legacy']}")
    print(f"    🔴 Critical  : {tiers['Critical']}")
    print("\n" + "═" * 60)
    print("  Seed complete. Start the API with: uvicorn main:app --reload")
    print("═" * 60 + "\n")

    db.close()


if __name__ == "__main__":
    asyncio.run(main())