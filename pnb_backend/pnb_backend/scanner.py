# scanner.py
import ssl
import socket
from cryptography import x509
from cryptography.hazmat.backends import default_backend

def scan_target(hostname: str, port: int = 443):
    context = ssl.create_default_context()
    # For scanning purposes, we bypass hostname checking to see exactly what is presented
    context.check_hostname = False 
    context.verify_mode = ssl.CERT_NONE

    scan_data = {
        "target": hostname,
        "error": None
    }

    try:
        with socket.create_connection((hostname, port), timeout=5) as sock:
            scan_data['ip_address'] = sock.getpeername()[0]
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                
                # 1. Get TLS Version and Cipher Suite
                cipher_info = ssock.cipher()
                scan_data['tls_version'] = cipher_info[1]
                scan_data['cipher_suite'] = cipher_info[0]

                # 2. Extract Certificate
                der_cert = ssock.getpeercert(binary_form=True)
                cert = x509.load_der_x509_certificate(der_cert, default_backend())

                # 3. Parse Certificate Details for CBOM
                scan_data['issuer'] = cert.issuer.rfc4514_string()
                scan_data['subject'] = cert.subject.rfc4514_string()
                scan_data['valid_from'] = cert.not_valid_before.isoformat()
                scan_data['valid_to'] = cert.not_valid_after.isoformat()
                scan_data['signature_algo'] = cert.signature_algorithm_oid._name
                
                # 4. Extract Public Key Details
                public_key = cert.public_key()
                scan_data['public_key_algo'] = public_key.__class__.__name__
                scan_data['key_size'] = public_key.key_size

    except Exception as e:
        scan_data['error'] = str(e)

    return scan_data

def generate_cbom(scan_data):
    """Formats the scan data into the CERT-In Annexure-A format specified in your SRS"""
    if scan_data.get('error'):
        return {}
        
    cbom = {
        "Algorithms": [
            {
                "Name": scan_data['cipher_suite'],
                "Asset Type": "algorithm",
                "Primitive": scan_data['signature_algo']
            }
        ],
        "Keys": [
            {
                "Name": "Public Key",
                "Asset Type": "key",
                "Size": scan_data['key_size'],
                "State": "active"
            }
        ],
        "Protocols": [
            {
                "Name": "TLS",
                "Asset Type": "protocol",
                "Version": scan_data['tls_version']
            }
        ],
        "Certificates": [
            {
                "Asset Type": "certificate",
                "Subject Name": scan_data['subject'],
                "Issuer Name": scan_data['issuer'],
                "Signature Algorithm Reference": scan_data['signature_algo']
            }
        ]
    }
    return cbom
