# evaluator.py

def evaluate_risk(scan_data):
    """
    Advanced NIST-aligned PQC Evaluator.
    Uses a weighted deduction system (Start: 10.0).
    """
    if scan_data.get('error'):
        return "Critical", 0, 0.0

    score = 10.0
    tls = scan_data.get('tls_version', 'Unknown')
    key_size = scan_data.get('key_size', 0)
    cipher = scan_data.get('cipher_suite', '')
    algo = scan_data.get('public_key_algo', '')

    # --- 1. TLS Version Deductions ---
    if tls == "TLSv1.3":
        pass # Perfect
    elif tls == "TLSv1.2":
        score -= 1.0 # Secure but not cutting edge
    elif tls in ["TLSv1.1", "TLSv1.0"]:
        score -= 4.0 # Deprecated
    else:
        score -= 7.0 # SSLv3/v2 is critical

    # --- 2. Key Strength Deductions ---
    if "RSA" in algo:
        if key_size < 1024: score -= 8.0
        elif key_size < 2048: score -= 4.0
    elif "EC" in algo or "ed25519" in algo.lower():
        if key_size < 256: score -= 3.0

    # --- 3. Cipher Suite Deductions (HNDL Risk) ---
    if "CBC" in cipher: score -= 1.5 # Vulnerable to padding attacks
    if "RC4" in cipher or "DES" in cipher: score -= 5.0 # Broken ciphers
    if "SHA1" in scan_data.get('signature_algo', ''): score -= 2.0 # Weak hash

    # --- 4. THE PQC MULTIPLIER (The Hackathon Winner) ---
    # We look for "Kyber", "Dilithium", or "X25519Kyber" in the cipher/key exchange
    is_pqc = any(x in cipher.upper() or x in algo.upper() for x in ["KYBER", "ML-KEM", "DILITHIUM", "FALCON", "SPHINCS"])
    
    # Final Tier Assignment
    if is_pqc and score > 8.0:
        tier = "Elite-PQC"
        score = max(9.5, score) # Boost PQC sites to the top
    elif score >= 7.0:
        tier = "Standard"
    elif score >= 4.0:
        tier = "Legacy"
    else:
        tier = "Critical"

    return tier, int(score * 100), round(max(0.0, score), 1)
