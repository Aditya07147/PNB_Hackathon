# main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
import datetime

import database
import scanner
import evaluator

app = FastAPI(title="PNB Quantum-Proof Systems Scanner API — PSB Hackathon 2026")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB dependency ─────────────────────────────────────────────────────────────
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Helpers ───────────────────────────────────────────────────────────────────
def scan_to_dict(s: database.AssetScan) -> dict:
    """Serialize an AssetScan ORM object to a JSON-safe dict."""
    return {
        "id":            s.id,
        "target_url":    s.target_url,
        "ip_address":    s.ip_address,
        "scan_date":     s.scan_date.isoformat() if s.scan_date else None,
        "tls_version":   s.tls_version,
        "cipher_suite":  s.cipher_suite,
        "key_exchange":  s.key_exchange,
        "public_key_algo": s.public_key_algo,
        "key_size":      s.key_size,
        "signature_algo": s.signature_algo,
        "issuer":        s.issuer,
        "subject":       s.subject,
        "valid_from":    s.valid_from,
        "valid_to":      s.valid_to,
        "asset_type":    s.asset_type or "Web App",
        "cert_status":   s.cert_status or "Valid",
        "trust_status":  s.trust_status or "Valid",
        "app_security_score": s.app_security_score or 0.0,
        "security_headers": s.security_headers or {},
        "risk_tier":     s.risk_tier,
        "simple_score":  s.simple_score,
        "risk_score":    s.risk_score,
        "is_pqc":        s.is_pqc,
        "pqc_method":    s.pqc_method,
        "recommendations": s.recommendations,
        "cbom_json":     s.cbom_json,
    }


def save_scan_to_db(
    db: Session,
    scan_results: dict,
    tier: str,
    simple_score: float,
    app_score: float,
    recommendations: list,
) -> database.AssetScan:
    """Persist a scan result and return the saved ORM object."""
    risk_score = int(simple_score * 100)   # 0–10 → 0–1000
    cbom = scanner.generate_cbom(scan_results)

    db_scan = database.AssetScan(
        target_url=scan_results.get("target"),
        ip_address=scan_results.get("ip_address"),
        tls_version=scan_results.get("tls_version"),
        cipher_suite=scan_results.get("cipher_suite"),
        key_exchange=scan_results.get("key_exchange"),
        issuer=scan_results.get("issuer"),
        subject=scan_results.get("subject"),
        valid_from=scan_results.get("valid_from"),
        valid_to=scan_results.get("valid_to"),
        public_key_algo=scan_results.get("public_key_algo"),
        key_size=scan_results.get("key_size"),
        signature_algo=scan_results.get("signature_algo"),
        asset_type=scan_results.get("asset_type", "Web App"),
        cert_status=scan_results.get("cert_status", "Valid"),
        trust_status=scan_results.get("trust_status", "Valid"),
        app_security_score=app_score,
        security_headers=scan_results.get("security_headers", {}),
        risk_tier=tier,
        risk_score=risk_score,
        simple_score=simple_score,
        is_pqc=scan_results.get("pqc_detected", False),
        pqc_method=scan_results.get("pqc_method"),
        recommendations=recommendations,
        cbom_json=cbom,
    )
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)
    return db_scan


# ─────────────────────────────────────────────────────────────────────────────
# REQUEST MODELS
# ─────────────────────────────────────────────────────────────────────────────
class ScanRequest(BaseModel):
    target_url: str


# ─────────────────────────────────────────────────────────────────────────────
# SCAN ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/scan")
def trigger_scan(request: ScanRequest, db: Session = Depends(get_db)):
    """On-demand scan for a single target."""
    target = request.target_url.replace("https://", "").replace("http://", "").split("/")[0].strip()
    scan_results = scanner.scan_target(target)

    if scan_results.get("error"):
        raise HTTPException(status_code=400, detail=f"Scan failed: {scan_results['error']}")

    # FIXED: Unpacking 4 values
    tier, simple_score, app_score, recommendations = evaluator.evaluate_risk(scan_results)
    db_scan = save_scan_to_db(db, scan_results, tier, simple_score, app_score, recommendations)

    return {"message": "Scan complete", "data": scan_to_dict(db_scan)}


@app.post("/api/scan-all")
def trigger_mass_scan(db: Session = Depends(get_db)):
    """Bulk scan of key domains."""
    domains = [
        "pnbindia.in", "pnb.co.in", "netpnb.com", "pnbmetlife.com",
        "tls-v1-2.badssl.com", "tls-v1-1.badssl.com", "expired.badssl.com",
        "sha256.badssl.com", "ecc384.badssl.com", "rsa2048.badssl.com",
    ]
    saved = []
    errors = []
    for target in domains:
        res = scanner.scan_target(target)
        if res.get("error"):
            errors.append({"target": target, "error": res["error"]})
            continue
        
        # FIXED: Unpacking 4 values
        tier, s_score, app_score, recs = evaluator.evaluate_risk(res)
        db_scan = save_scan_to_db(db, res, tier, s_score, app_score, recs)
        saved.append(scan_to_dict(db_scan))

    return {
        "message": f"Mass scan complete. {len(saved)} succeeded, {len(errors)} failed.",
        "scanned": saved,
        "errors":  errors,
    }


@app.post("/api/discover-pnb")
def discover_pnb(db: Session = Depends(get_db)):
    """Auto-discovers subdomains and scans them."""
    targets = scanner.discover_inventory("pnbindia.in")
    new_assets = []
    errors = []

    for target in targets:
        today = datetime.datetime.utcnow().date()
        existing = db.query(database.AssetScan).filter(database.AssetScan.target_url == target).filter(func.date(database.AssetScan.scan_date) == today).first()
        if existing: continue

        res = scanner.scan_target(target)
        if res.get("error"):
            errors.append({"target": target, "error": res["error"]})
            continue

        # FIXED: Unpacking 4 values
        tier, score, app_score, recs = evaluator.evaluate_risk(res)
        db_scan = save_scan_to_db(db, res, tier, score, app_score, recs)
        new_assets.append(scan_to_dict(db_scan))

    return {"status": "Discovery complete", "new_assets_found": len(new_assets), "assets": new_assets, "errors": errors}


# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    scans = db.query(database.AssetScan).all()
    total = len(scans)

    dist = {"Elite-PQC": 0, "Standard": 0, "Legacy": 0, "Critical": 0, "Excellent": 0}
    for s in scans:
        dist[s.risk_tier] = dist.get(s.risk_tier, 0) + 1

    avg = round(sum(s.simple_score for s in scans if s.simple_score) / total, 1) if total > 0 else 0

    public_web_apps = sum(1 for s in scans if (s.asset_type or "Web App") == "Web App")
    exposed_apis    = sum(1 for s in scans if (s.asset_type or "") == "API")
    servers         = sum(1 for s in scans if (s.asset_type or "") in ("Server", "Mail Server", "VPN"))
    expiring_certs  = sum(1 for s in scans if (s.cert_status or "Valid") in ("Expiring", "Expired"))

    recent = db.query(database.AssetScan).order_by(database.AssetScan.id.desc()).limit(10).all()

    return {
        "total_assets_scanned": total,
        "public_web_apps":      public_web_apps,
        "exposed_apis":         exposed_apis,
        "servers":              servers,
        "expiring_certs":       expiring_certs,
        "risk_distribution":    dist,
        "avg_score":            avg,
        "recent_scans":         [scan_to_dict(s) for s in recent],
    }


@app.get("/api/cbom-dashboard")
def get_cbom_dashboard(db: Session = Depends(get_db)):
    return get_dashboard_stats(db) # Basic integration for prototype


@app.get("/api/pqc-compliance")
def get_pqc_compliance(db: Session = Depends(get_db)):
    data = get_dashboard_stats(db)
    return {
        "percentages": {k: round((v/data['total_assets_scanned'])*100) if data['total_assets_scanned']>0 else 0 for k,v in data['risk_distribution'].items()},
        "classification_grade": data['risk_distribution'],
        "assets_table": [{"name": s['target_url'], "pqc_support": "Yes" if s['is_pqc'] else "No"} for s in data['recent_scans']]
    }


@app.get("/api/export/all")
def get_all_scans_for_export(db: Session = Depends(get_db)):
    all_scans = db.query(database.AssetScan).order_by(database.AssetScan.id.desc()).all()
    total = len(all_scans)
    avg = round(sum(s.simple_score or 0 for s in all_scans) / total, 2) if total > 0 else 0

    return {
        "scans": [scan_to_dict(s) for s in all_scans],
        "summary": {
            "total_assets":      total,
            "cumulative_score":  int(avg * 100),
            "avg_simple_score":  avg,
        },
    }

# ─────────────────────────────────────────────────────────────────────────────
# DELETION ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.delete("/api/scan/{scan_id}")
def delete_scan(scan_id: int, db: Session = Depends(get_db)):
    db.query(database.AssetScan).filter(database.AssetScan.id == scan_id).delete()
    db.commit()
    return {"message": "Deleted successfully"}

@app.delete("/api/scans/all")
def delete_all_scans(db: Session = Depends(get_db)):
    db.query(database.AssetScan).delete()
    db.commit()
    return {"message": "All records deleted"}

@app.get("/")
def health():
    return {"status": "ok"}
