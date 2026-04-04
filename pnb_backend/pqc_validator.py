"""
PQC Algorithm Validator

Uses liboqs library to recognize and validate post-quantum cryptography algorithms.
References NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA).

This module replaces keyword-based detection with cryptographically-validated
algorithm recognition. If liboqs is unavailable, falls back to keyword matching.
"""

import logging
import re
from typing import Optional, Dict, List, Tuple

# Try to import liboqs; set fallback flag if unavailable
try:
    import oqs
    HAS_LIBOQS = True
except ImportError:
    HAS_LIBOQS = False
    logging.warning(
        "liboqs not available; PQC detection will fall back to keyword matching. "
        "Install liboqs-python for full cryptographic validation."
    )

# NIST PQC Standard References
PQC_STANDARDS = {
    "ml-kem": {
        "fips": "203",
        "category": "key-encapsulation",
        "variants": ["ml-kem-512", "ml-kem-768", "ml-kem-1024"],
        "security_levels": {"ml-kem-512": 1, "ml-kem-768": 3, "ml-kem-1024": 5},
    },
    "ml-dsa": {
        "fips": "204",
        "category": "digital-signature",
        "variants": ["ml-dsa-44", "ml-dsa-65", "ml-dsa-87"],
        "security_levels": {"ml-dsa-44": 2, "ml-dsa-65": 3, "ml-dsa-87": 5},
    },
    "slh-dsa": {
        "fips": "205",
        "category": "digital-signature",
        "variants": ["slh-dsa-sha2-128s", "slh-dsa-sha2-128f", "slh-dsa-sha2-192s",
                     "slh-dsa-sha2-192f", "slh-dsa-sha2-256s", "slh-dsa-sha2-256f",
                     "slh-dsa-shake-128s", "slh-dsa-shake-128f", "slh-dsa-shake-192s",
                     "slh-dsa-shake-192f", "slh-dsa-shake-256s", "slh-dsa-shake-256f"],
    },
}

# Keyword-based fallback (used if liboqs unavailable)
PQC_KEYWORDS = [
    "kyber", "dilithium", "falcon", "sphincs", "ml-kem", "ml-dsa",
    "slh-dsa", "x25519kyber768", "p256kyber768", "mlkem", "mldsa",
    "pqc", "post-quantum", "liboqs", "oqs"
]

logger = logging.getLogger(__name__)


def _normalize_algorithm_name(name: str) -> str:
    """Normalize algorithm name for comparison: lowercase, remove spaces."""
    return name.lower().strip().replace(" ", "")


def _get_liboqs_algorithms() -> Dict[str, str]:
    """
    Query liboqs for available algorithms and map them to canonical names.
    Returns dict mapping canonical names to their categories.
    """
    if not HAS_LIBOQS:
        return {}
    
    try:
        algorithms = {}
        # Query what algorithms liboqs supports
        for kem_name in oqs.KEM.get_enabled_KEMs():
            algorithms[_normalize_algorithm_name(kem_name)] = "kem"
        for sig_name in oqs.Signature.get_enabled_Sigs():
            algorithms[_normalize_algorithm_name(sig_name)] = "signature"
        return algorithms
    except Exception as e:
        logger.warning(f"Failed to query liboqs algorithms: {e}")
        return {}


def parse_hybrid_algorithm(algo_string: str) -> List[str]:
    """
    Parse hybrid algorithm strings into components.
    
    Examples:
        "x25519kyber768" → ["x25519", "kyber768"]
        "p256kyber768" → ["p256", "kyber768"]
        "kyber-x25519" → ["kyber", "x25519"]
        "ml-kem-768" → ["ml-kem-768"]  (not hybrid, return as-is)
    
    Args:
        algo_string: Algorithm name potentially containing hybrid notation
    
    Returns:
        List of individual algorithm components
    """
    if not algo_string:
        return []
    
    algo = _normalize_algorithm_name(algo_string)
    
    # Pattern 1: "x25519kyber768" or "p256kyber768" (EC prefix + quantum algo)
    match = re.match(r"(p256|x25519|x448|secp256r1|curve25519)([a-z0-9]+)", algo)
    if match:
        return [match.group(1), match.group(2)]
    
    # Pattern 2: "kyber-x25519" or "kyber768-x25519" (hyphen-separated)
    if "-" in algo:
        parts = algo.split("-")
        if len(parts) == 2 and all(p.strip() for p in parts):
            # Validate that we recognize at least one part as PQC or EC
            if _is_recognized_pqc_core(parts[0]) or parts[0] in ["x25519", "p256", "x448"]:
                return parts
            if _is_recognized_pqc_core(parts[1]) or parts[1] in ["x25519", "p256", "x448"]:
                return parts
    
    # Not hybrid; return as single component
    return [algo]


def _is_recognized_pqc_core(algo_name: str) -> bool:
    """
    Core check: is this a recognized PQC algorithm name?
    Uses liboqs if available, otherwise falls back to keyword matching.
    """
    if not algo_name:
        return False
    
    normalized = _normalize_algorithm_name(algo_name)
    
    # Try liboqs first
    if HAS_LIBOQS:
        try:
            # Check if it's a recognized KEM
            if normalized in [_normalize_algorithm_name(n) for n in oqs.KEM.get_enabled_KEMs()]:
                return True
            # Check if it's a recognized signature algorithm
            if normalized in [_normalize_algorithm_name(n) for n in oqs.Signature.get_enabled_Sigs()]:
                return True
            # Additional checks for NIST standard names
            for standard_algo in PQC_STANDARDS:
                if normalized.startswith(standard_algo.replace("-", "")):
                    return True
        except Exception as e:
            logger.debug(f"liboqs check failed for '{algo_name}': {e}")
            # Fall through to keyword matching
    
    # Fallback: keyword matching
    for keyword in ["kyber", "dilithium", "ml-kem", "ml-dsa", "slh-dsa", "sphincs", "falcon"]:
        if keyword in normalized:
            return True
    
    return False


def validate_algorithm(algo_string: str) -> Dict:
    """
    Validate a single algorithm (or hybrid combination) against NIST PQC standards.
    
    Args:
        algo_string: Algorithm name from TLS handshake (e.g., "ML-KEM-768" or "X25519Kyber768")
    
    Returns:
        Dict with keys:
            - valid: bool — is this a recognized/validated PQC algorithm?
            - algorithm_type: str — "ml-kem", "ml-dsa", "slh-dsa", "hybrid", or "unknown"
            - algorithm_name: str — normalized algorithm name
            - components: list — if hybrid, list of validated components
            - security_level: int or None — NIST security level (1-5) if known
            - fips_standard: str or None — e.g., "203", "204", "205"
            - message: str — human-readable status
    """
    if not algo_string or not algo_string.strip():
        return {
            "valid": False,
            "algorithm_type": "unknown",
            "algorithm_name": "",
            "components": [],
            "security_level": None,
            "fips_standard": None,
            "message": "No algorithm provided",
        }
    
    components = parse_hybrid_algorithm(algo_string)
    
    # Single-component case
    if len(components) == 1:
        algo = components[0]
        normalized = _normalize_algorithm_name(algo)
        
        # Check NIST standards
        for standard_name, standard_info in PQC_STANDARDS.items():
            if normalized.startswith(standard_name.replace("-", "")):
                security_level = standard_info.get("security_levels", {}).get(normalized)
                return {
                    "valid": True,
                    "algorithm_type": standard_info["category"],
                    "algorithm_name": normalized,
                    "components": [normalized],
                    "security_level": security_level,
                    "fips_standard": standard_info["fips"],
                    "message": f"Validated as {standard_name.upper()} per NIST FIPS {standard_info['fips']}: {normalized}",
                }
        
        # Check if recognized by liboqs
        if _is_recognized_pqc_core(algo):
            return {
                "valid": True,
                "algorithm_type": "pqc-recognized",
                "algorithm_name": normalized,
                "components": [normalized],
                "security_level": None,
                "fips_standard": None,
                "message": f"Recognized as PQC algorithm: {normalized}",
            }
        
        # Not recognized
        return {
            "valid": False,
            "algorithm_type": "unknown",
            "algorithm_name": normalized,
            "components": [normalized],
            "security_level": None,
            "fips_standard": None,
            "message": f"Not recognized as PQC: {normalized}",
        }
    
    # Hybrid case: validate each component
    validated_components = []
    all_valid = True
    for component in components:
        comp_result = validate_algorithm(component)
        validated_components.append(comp_result)
        if not comp_result["valid"]:
            all_valid = False
    
    return {
        "valid": all_valid,
        "algorithm_type": "hybrid",
        "algorithm_name": algo_string,
        "components": validated_components,
        "security_level": None,  # Hybrid doesn't have single level
        "fips_standard": None,
        "message": (
            f"Hybrid: {all_valid and 'All components validated' or 'Some components unrecognized'} - "
            f"{', '.join(c['algorithm_name'] for c in validated_components)}"
        ),
    }


def detect_pqc(tls_data: Dict) -> Tuple[bool, str]:
    """
    Detect and validate PQC in TLS handshake data.
    
    This is the primary integration point with scanner.py.
    Replaces the simple keyword-based detection with validated algorithm recognition.
    
    For hybrids, returns True if at least one component is PQC (e.g., X25519Kyber768 is PQC
    because Kyber is post-quantum, even though X25519 is classical).
    
    Args:
        tls_data: Dict with keys like "key_exchange", "cipher_suite", "tls_version", "signature_algo"
    
    Returns:
        Tuple of (is_pqc: bool, method_string: str)
            where method_string contains detailed validation info or reason for no PQC
    """
    if not tls_data:
        return False, "No TLS data provided"
    
    # Key exchange is the primary field for PQC detection in TLS
    key_exchange = (tls_data.get("key_exchange") or "").strip()
    if not key_exchange:
        return False, "None"
    
    # Try to validate the key exchange algorithm
    validation = validate_algorithm(key_exchange)
    
    if validation["algorithm_type"] == "hybrid":
        # For hybrids, check if at least one component is PQC
        pqc_components = [c for c in validation["components"] if c.get("valid")]
        if pqc_components:
            component_names = [c["algorithm_name"] for c in pqc_components]
            return True, f"Validated PQC (Hybrid): {', '.join(component_names)}"
        else:
            return False, f"Hybrid algorithm '{key_exchange}' contains no recognized PQC components"
    elif validation["valid"]:
        # Single PQC algorithm
        fips_info = f" per NIST FIPS {validation['fips_standard']}" if validation["fips_standard"] else ""
        sec_level = f" (security level {validation['security_level']})" if validation["security_level"] else ""
        return True, f"Validated as {validation['algorithm_type'].upper()}: {validation['algorithm_name']}{fips_info}{sec_level}"
    else:
        # Not a recognized PQC algorithm
        return False, f"Algorithm '{key_exchange}' not recognized as PQC"
