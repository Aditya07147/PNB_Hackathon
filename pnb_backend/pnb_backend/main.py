from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime, timezone

import database
import scanner
import evaluator

app = FastAPI(title="Quantum-Proof Systems Scanner API")

# Allow Frontend to communicate with Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Model for incoming requests
class ScanRequest(BaseModel):
    target_url: str

@app.post("/api/scan")
def trigger_scan(request: ScanRequest, db: Session = Depends(get_db)):
    target = request.target_url.replace("https://", "").replace("http://", "").split("/")[0]
    
    # 1. Run the Scanner
    scan_results = scanner.scan_target(target)
    
    if scan_results.get('error'):
        raise HTTPException(status_code=400, detail=f"Scan failed: {scan_results['error']}")

    # 2. Generate CBOM
    cbom = scanner.generate_cbom(scan_results)

    # 3. Evaluate Risk
    tier, score, simple_score = evaluator.evaluate_risk(scan_results)

    # 4. Save to Database
    db_scan = database.AssetScan(
        target_url=target,
        ip_address=scan_results.get('ip_address'),
        tls_version=scan_results.get('tls_version'),
        cipher_suite=scan_results.get('cipher_suite'),
        issuer=scan_results.get('issuer'),
        subject=scan_results.get('subject'),
        valid_from=scan_results.get('valid_from'),
        valid_to=scan_results.get('valid_to'),
        public_key_algo=scan_results.get('public_key_algo'),
        key_size=scan_results.get('key_size'),
        signature_algo=scan_results.get('signature_algo'),
        risk_tier=tier,
        risk_score=score,
        simple_score=simple_score,
        cbom_json=cbom
    )
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)

    return {"message": "Scan complete", "data": db_scan}


# main.py updates

@app.get("/api/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """100% Dynamic API matching the complex Screenshot Layout"""
    all_scans = db.query(database.AssetScan).order_by(database.AssetScan.id.desc()).all()
    total_assets = len(all_scans)
    
    tier_counts = {"Elite-PQC": 0, "Standard": 0, "Legacy": 0, "Critical": 0}
    web_apps = 0
    apis = 0
    
    now = datetime.now(timezone.utc)
    exp_30, exp_60, exp_90, exp_safe, expired = 0, 0, 0, 0, 0
    
    formatted_scans = []

    for s in all_scans:
        # 1. Risk Distribution
        if s.risk_tier in tier_counts: tier_counts[s.risk_tier] += 1
        
        # 2. Asset Type Heuristics
        is_api = 'api' in s.target_url.lower()
        if is_api: apis += 1
        else: web_apps += 1

        # 3. Certificate Expiry Calculation
        cert_status = "Unknown"
        try:
            # Handle standard ISO formats
            cert_date_str = s.valid_to.replace('Z', '+00:00')
            cert_date = datetime.fromisoformat(cert_date_str)
            days_left = (cert_date - now).days
            
            if days_left < 0:
                expired += 1; cert_status = "Expired"
            elif days_left <= 30:
                exp_30 += 1; cert_status = "Expiring"
            elif days_left <= 60:
                exp_60 += 1; cert_status = "Valid"
            elif days_left <= 90:
                exp_90 += 1; cert_status = "Valid"
            else:
                exp_safe += 1; cert_status = "Valid"
        except:
            pass # Fallback if date parsing fails
            
        # Extract clean Issuer Name
        issuer_clean = s.issuer.split(',')[0].replace('CN=', '') if s.issuer else "Unknown"

        formatted_scans.append({
            "id": s.id,
            "target_url": s.target_url,
            "ip_address": s.ip_address,
            "type": "API" if is_api else "Web App",
            "risk_tier": s.risk_tier,
            "cert_status": cert_status,
            "key_length": f"{s.key_size}-bit",
            "cipher_suite": s.cipher_suite,
            "tls_version": s.tls_version,
            "issuer": issuer_clean,
            "scan_date": s.scan_date.isoformat(),
            "simple_score": s.simple_score
        })

    avg_score = round(sum(s.simple_score for s in all_scans if s.simple_score) / total_assets, 1) if total_assets else 0.0

    return {
        "kpis": {
            "total": total_assets,
            "web": web_apps,
            "apis": apis,
            "servers": total_assets, # Assuming 1:1 for this mockup
            "expiring_certs": exp_30 + expired,
            "high_risk": tier_counts["Critical"]
        },
        "risk_distribution": tier_counts,
        "asset_types": [
            {"name": "Web Apps", "value": web_apps, "color": "#8b5cf6"},
            {"name": "APIs", "value": apis, "color": "#3b82f6"},
            {"name": "Servers", "value": total_assets, "color": "#10b981"}
        ],
        "cert_expiry": [
            {"range": "0-30 Days", "count": exp_30, "color": "#ef4444"},
            {"range": "30-60 Days", "count": exp_60, "color": "#f97316"},
            {"range": "60-90 Days", "count": exp_90, "color": "#facc15"},
            {"range": ">90 Days", "count": exp_safe, "color": "#22c55e"}
        ],
        "recent_scans": formatted_scans, # Sending the rich array
        "avg_score": avg_score
    }


@app.post("/api/scan-all")
def trigger_mass_scan(db: Session = Depends(get_db)):
    """Live scans a predefined list of PNB infrastructure"""
    domains_to_scan = [
        "pnbindia.in", "pnb.co.in", "netpnb.com", 
        "wrong.host.badssl.com", "tls-v1-1.badssl.com" # Mixed in for demo variety
    ]
    
    scanned_count = 0
    for target in domains_to_scan:
        scan_results = scanner.scan_target(target)
        if not scan_results.get('error'):
            tier, score, simple_score = evaluator.evaluate_risk(scan_results)
            cbom = scanner.generate_cbom(scan_results)
            
            db_scan = database.AssetScan(
                target_url=target,
                ip_address=scan_results.get('ip_address'),
                tls_version=scan_results.get('tls_version'),
                cipher_suite=scan_results.get('cipher_suite'),
                issuer=scan_results.get('issuer'),
                subject=scan_results.get('subject'),
                valid_from=scan_results.get('valid_from'),
                valid_to=scan_results.get('valid_to'),
                public_key_algo=scan_results.get('public_key_algo'),
                key_size=scan_results.get('key_size'),
                signature_algo=scan_results.get('signature_algo'),
                risk_tier=tier,
                risk_score=score,
                simple_score=simple_score,
                cbom_json=cbom
            )
            db.add(db_scan)
            scanned_count += 1
            
    db.commit()
    return {"message": f"Successfully scanned {scanned_count} assets."}

@app.get("/api/cbom-dashboard")
def get_cbom_dashboard(db: Session = Depends(get_db)):
    """Powers the Cryptographic Bill of Materials UI (Screenshot 11)"""
    total_apps = db.query(database.AssetScan).count()
    weak_crypto = db.query(database.AssetScan).filter(database.AssetScan.risk_tier.in_(["Legacy", "Critical"])).count()
    
    # Group by Key Size for the Bar Chart
    key_lengths = db.query(database.AssetScan.key_size, func.count(database.AssetScan.id)).group_by(database.AssetScan.key_size).all()
    
    # Group by Cipher Suite for the list
    cipher_usage = db.query(database.AssetScan.cipher_suite, func.count(database.AssetScan.id)).group_by(database.AssetScan.cipher_suite).order_by(func.count(database.AssetScan.id).desc()).limit(5).all()
    
    # Group by TLS Version for the Donut Chart
    tls_versions = db.query(database.AssetScan.tls_version, func.count(database.AssetScan.id)).group_by(database.AssetScan.tls_version).all()

    return {
        "summary": {
            "total_applications": total_apps,
            "active_certificates": total_apps, 
            "weak_cryptography": weak_crypto,
        },
        "charts": {
            "key_length_distribution": [{"size": str(k[0]), "count": k[1]} for k in key_lengths if k[0]],
            "cipher_usage": [{"cipher": c[0], "count": c[1]} for c in cipher_usage if c[0]],
            "tls_protocols": [{"version": t[0], "count": t[1]} for t in tls_versions if t[0]]
        }
    }


@app.get("/api/pqc-compliance")
def get_pqc_compliance(db: Session = Depends(get_db)):
    """Powers the PQC Compliance Dashboard UI (Screenshot 12)"""
    elite = db.query(database.AssetScan).filter(database.AssetScan.risk_tier == "Elite-PQC").count()
    standard = db.query(database.AssetScan).filter(database.AssetScan.risk_tier == "Standard").count()
    legacy = db.query(database.AssetScan).filter(database.AssetScan.risk_tier == "Legacy").count()
    critical = db.query(database.AssetScan).filter(database.AssetScan.risk_tier == "Critical").count()
    total = elite + standard + legacy + critical or 1 # Prevent division by zero

    assets_list = db.query(database.AssetScan).with_entities(
        database.AssetScan.target_url, database.AssetScan.ip_address, database.AssetScan.risk_tier
    ).limit(10).all()

    return {
        "classification_grade": {
            "Elite": elite,
            "Standard": standard,
            "Legacy": legacy,
            "Critical": critical
        },
        "percentages": {
            "Elite-PQC Ready": round((elite/total)*100),
            "Standard": round((standard/total)*100),
            "Legacy": round((legacy/total)*100),
            "Critical Apps": round((critical/total)*100)
        },
        "assets_table": [
            {"name": f"{a[0]} ({a[1]})", "pqc_support": "Yes" if "Elite" in a[2] else "No"} 
            for a in assets_list
        ]
    }

# Add this at the bottom of main.py

@app.get("/api/export/all")
def get_all_scans_for_export(db: Session = Depends(get_db)):
    """Returns all asset scan data for CSV export."""
    all_scans = db.query(database.AssetScan).all()
    
    # Calculate cumulative score
    total_scans = len(all_scans)
    if total_scans > 0:
        average_score = sum(s.simple_score for s in all_scans if s.simple_score) / total_scans
    else:
        average_score = 0
        
    return {
        "scans": all_scans,
        "summary": {
            "total_assets": total_scans,
            "cumulative_score": round(average_score, 2)
        }
    }

@app.delete("/api/scan/{scan_id}")
def delete_scan(scan_id: int, db: Session = Depends(get_db)):
    """Deletes a specific scan record from the database by ID"""
    scan_record = db.query(database.AssetScan).filter(database.AssetScan.id == scan_id).first()
    
    if not scan_record:
        raise HTTPException(status_code=404, detail=f"Scan ID {scan_id} not found")
        
    db.delete(scan_record)
    db.commit()
    
    return {"message": f"Scan ID {scan_id} successfully deleted."}
