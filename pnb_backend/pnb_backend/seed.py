import asyncio
from database import SessionLocal, AssetScan
import scanner
import evaluator

# A curated list of 100% REAL domains to guarantee a colorful, diverse dashboard.
# BadSSL is an industry-standard testing tool for TLS/Crypto validation.
DOMAINS_TO_SCAN = [
    # --- Expected: STANDARD / ELITE (Modern Crypto) ---
    "pnbindia.in",             # PNB Main site
    "netpnb.com",              # PNB Net Banking
    "pnbhousing.com",          # PNB Housing
    "google.com",              # Tech standard
    "cloudflare.com",          # Tech standard
    
    # --- Expected: LEGACY (Older Protocols / Weaker Ciphers) ---
    "tls-v1-1.badssl.com",     # Forces TLS 1.1
    "tls-v1-2.badssl.com",     # Forces TLS 1.2
    "sha1-intermediate.badssl.com", # Older SHA1 signature
    "3des.badssl.com",         # Weak 3DES cipher
    
    # --- Expected: CRITICAL (Broken/Insecure Crypto) ---
    "expired.badssl.com",      # Expired Certificate
    "wrong.host.badssl.com",   # Hostname mismatch
    "self-signed.badssl.com",  # Untrusted issuer
    "untrusted-root.badssl.com",# Untrusted root CA
    "rc4.badssl.com",          # Highly vulnerable RC4 cipher
    "dh480.badssl.com",        # Weak Diffie-Hellman key (480-bit)
]

async def scan_and_prepare(domain: str):
    """Scans a real domain and prepares the database record."""
    print(f"[*] Connecting to {domain}...")
    try:
        # Run the synchronous scanner in an async thread
        loop = asyncio.get_running_loop()
        scan_data = await loop.run_in_executor(None, scanner.scan_target, domain)

        # Even if there's a TLS error (like an expired cert), our scanner script 
        # should ideally capture the error or the weak cert details.
        
        tier, score, simple_score = evaluator.evaluate_risk(scan_data)
        cbom = scanner.generate_cbom(scan_data)
        
        print(f"[+] Finished {domain} -> Result: {tier} ({simple_score}/10)")
        
        return AssetScan(
            target_url=domain,
            ip_address=scan_data.get('ip_address', 'Unknown'),
            port=443,
            tls_version=scan_data.get('tls_version', 'Unknown'),
            cipher_suite=scan_data.get('cipher_suite', 'Unknown'),
            issuer=scan_data.get('issuer', 'Unknown'),
            subject=scan_data.get('subject', 'Unknown'),
            valid_from=scan_data.get('valid_from'),
            valid_to=scan_data.get('valid_to'),
            public_key_algo=scan_data.get('public_key_algo', 'Unknown'),
            key_size=scan_data.get('key_size', 0),
            signature_algo=scan_data.get('signature_algo', 'Unknown'),
            risk_tier=tier,
            risk_score=score,
            simple_score=simple_score,
            cbom_json=cbom
        )
    except Exception as e:
        print(f"[!] Network failure scanning {domain}: {e}")
        return None

async def main():
    print("=== STARTING LIVE DATA SEEDING ===")
    db = SessionLocal()
    
    print("1. Wiping old database records...")
    db.query(AssetScan).delete()
    db.commit()

    print(f"2. Launching concurrent live scans for {len(DOMAINS_TO_SCAN)} domains...")
    # Run all scans at the exact same time for speed
    tasks = [scan_and_prepare(domain) for domain in DOMAINS_TO_SCAN]
    results = await asyncio.gather(*tasks)

    # Filter out any that completely failed to resolve via DNS
    successful_scans = [res for res in results if res is not None]
    
    print(f"\n3. Saving {len(successful_scans)} live records to the database...")
    db.add_all(successful_scans)
    db.commit()
    db.close()
    
    print("=== DATABASE POPULATION COMPLETE ===")
    print("You can now start your uvicorn server!")

if __name__ == "__main__":
    asyncio.run(main())
