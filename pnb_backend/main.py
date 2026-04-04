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
    """
    On-demand scan for a single target.
    Fulfills: validate deployment of quantum-proof cipher for a specific asset.
    """
    target = (
        request.target_url
        .replace("https://", "")
        .replace("http://", "")
        .split("/")[0]
        .strip()
    )

    scan_results = scanner.scan_target(target)

    if scan_results.get("error"):
        raise HTTPException(
            status_code=400,
            detail=f"Scan failed: {scan_results['error']}"
        )

    tier, simple_score, recommendations = evaluator.evaluate_risk(scan_results)
    db_scan = save_scan_to_db(db, scan_results, tier, simple_score, recommendations)

    return {
        "message": "Scan complete",
        "data": scan_to_dict(db_scan),
    }


@app.post("/api/scan-all")
def trigger_mass_scan(db: Session = Depends(get_db)):
    """
    Bulk scan of key PNB domains + a few test domains to ensure data diversity.
    Fulfills: 'Crypto inventory discovery — TLS, TLS-based VPN, APIs'.
    """
    domains = [
        # Real PNB public-facing assets
        "pnbindia.in",
        "pnb.co.in",
        "netpnb.com",
        "pnbmetlife.com",
        # Test domains that reliably expose different TLS postures
        "tls-v1-2.badssl.com",      # TLS 1.2 → Standard/Legacy
        "tls-v1-1.badssl.com",      # TLS 1.1 → Legacy
        "expired.badssl.com",       # Expired cert → Critical
        "sha256.badssl.com",        # SHA-256 → Standard
        "ecc384.badssl.com",        # ECC 384-bit → good score
        "rsa2048.badssl.com",       # RSA 2048 → Standard
    ]

    saved = []
    errors = []
    for target in domains:
        res = scanner.scan_target(target)
        if res.get("error"):
            errors.append({"target": target, "error": res["error"]})
            continue
        tier, s_score, recs = evaluator.evaluate_risk(res)
        db_scan = save_scan_to_db(db, res, tier, s_score, recs)
        saved.append(scan_to_dict(db_scan))

    return {
        "message": f"Mass scan complete. {len(saved)} succeeded, {len(errors)} failed.",
        "scanned": saved,
        "errors":  errors,
    }


@app.post("/api/discover-pnb")
def discover_pnb(db: Session = Depends(get_db)):
    """
    Auto-discovers subdomains of pnbindia.in and scans each one.
    Fulfills: 'Crypto inventory discovery (TLS Certificate, TLS-based VPN, APIs)'.
    """
    targets = scanner.discover_inventory("pnbindia.in")
    new_assets = []
    errors = []

    for target in targets:
        # Skip if already scanned today (avoid duplicates)
        today = datetime.datetime.utcnow().date()
        existing = (
            db.query(database.AssetScan)
            .filter(database.AssetScan.target_url == target)
            .filter(func.date(database.AssetScan.scan_date) == today)
            .first()
        )
        if existing:
            continue

        res = scanner.scan_target(target)
        if res.get("error"):
            errors.append({"target": target, "error": res["error"]})
            continue

        tier, score, recs = evaluator.evaluate_risk(res)
        db_scan = save_scan_to_db(db, res, tier, score, recs)
        new_assets.append(scan_to_dict(db_scan))

    return {
        "status":         "Discovery complete",
        "new_assets_found": len(new_assets),
        "assets":         new_assets,
        "errors":         errors,
    }


# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Powers the Home dashboard (stat cards + bar chart + live table).
    Returns all fields the upgraded Home.jsx expects.
    """
    scans = db.query(database.AssetScan).all()
    total = len(scans)

    dist = {"Elite-PQC": 0, "Standard": 0, "Legacy": 0, "Critical": 0}
    for s in scans:
        dist[s.risk_tier] = dist.get(s.risk_tier, 0) + 1

    avg = round(sum(s.simple_score for s in scans if s.simple_score) / total, 1) if total > 0 else 0

    # Derived counts for the stat cards
    public_web_apps = sum(1 for s in scans if (s.asset_type or "Web App") == "Web App")
    exposed_apis    = sum(1 for s in scans if (s.asset_type or "") == "API")
    servers         = sum(1 for s in scans if (s.asset_type or "") in ("Server", "Mail Server", "VPN"))
    expiring_certs  = sum(1 for s in scans if (s.cert_status or "Valid") in ("Expiring", "Expired"))

    recent = (
        db.query(database.AssetScan)
        .order_by(database.AssetScan.id.desc())
        .limit(10)
        .all()
    )

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


# ─────────────────────────────────────────────────────────────────────────────
# CBOM DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/cbom-dashboard")
def get_cbom_dashboard(db: Session = Depends(get_db)):
    """
    Powers the Cryptographic Bill of Materials UI.
    Fulfills: 'create cryptographic bill of material inventory'.
    """
    all_scans  = db.query(database.AssetScan).all()
    total_apps = len(all_scans)
    weak_crypto = sum(1 for s in all_scans if s.risk_tier in ("Legacy", "Critical"))
    cert_issues = sum(1 for s in all_scans if (s.cert_status or "Valid") in ("Expiring", "Expired"))

    # ── Key length distribution ───────────────────────────────────────────────
    kl_rows = (
        db.query(database.AssetScan.key_size, func.count(database.AssetScan.id))
        .filter(database.AssetScan.key_size.isnot(None))
        .group_by(database.AssetScan.key_size)
        .order_by(database.AssetScan.key_size.desc())
        .all()
    )
    key_length_distribution = [{"size": str(k[0]), "count": k[1]} for k in kl_rows]

    # ── Cipher usage ──────────────────────────────────────────────────────────
    cu_rows = (
        db.query(database.AssetScan.cipher_suite, func.count(database.AssetScan.id))
        .filter(database.AssetScan.cipher_suite.isnot(None))
        .group_by(database.AssetScan.cipher_suite)
        .order_by(func.count(database.AssetScan.id).desc())
        .limit(7)
        .all()
    )
    # Mark weak ciphers for the frontend
    weak_set = {"DES-CBC3-SHA", "RC4-SHA", "RC4-MD5", "TLS_RSA_WITH_DES_CBC_SHA", "NULL"}
    cipher_usage = [
        {
            "name":  c[0],
            "count": c[1],
            "weak":  any(w.upper() in (c[0] or "").upper() for w in weak_set),
        }
        for c in cu_rows
    ]

    # ── TLS protocol distribution ─────────────────────────────────────────────
    tls_rows = (
        db.query(database.AssetScan.tls_version, func.count(database.AssetScan.id))
        .filter(database.AssetScan.tls_version.isnot(None))
        .group_by(database.AssetScan.tls_version)
        .all()
    )
    tls_colors = {
        "TLSv1.3": "#9b1c31",
        "TLSv1.2": "#f59e0b",
        "TLSv1.1": "#ef4444",
        "TLSv1.0": "#ef4444",
        "TLSv1":   "#ef4444",
    }
    encryption_protocols = [
        {
            "name":  t[0],
            "value": t[1],
            "color": tls_colors.get(t[0], "#94a3b8"),
        }
        for t in tls_rows
    ]

    # ── Top Certificate Authorities ───────────────────────────────────────────
    ca_colors = ["#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#94a3b8"]
    ca_rows = (
        db.query(database.AssetScan.issuer, func.count(database.AssetScan.id))
        .filter(database.AssetScan.issuer.isnot(None))
        .group_by(database.AssetScan.issuer)
        .order_by(func.count(database.AssetScan.id).desc())
        .limit(5)
        .all()
    )
    # Extract O= (Organization) from issuer DN for display
    def extract_org(issuer_dn: str) -> str:
        import re
        m = re.search(r"O=([^,/]+)", issuer_dn or "")
        return m.group(1).strip() if m else issuer_dn or "Unknown"

    top_cas = [
        {"name": extract_org(c[0]), "count": c[1], "color": ca_colors[i % len(ca_colors)]}
        for i, c in enumerate(ca_rows)
    ]

    # ── Top certificates detail table ─────────────────────────────────────────
    detail_scans = (
        db.query(database.AssetScan)
        .filter(database.AssetScan.cipher_suite.isnot(None))
        .limit(8)
        .all()
    )
    top_certificates = [
        {
            "app":    s.target_url,
            "keyLen": f"{s.key_size}-Bit" if s.key_size else "—",
            "cipher": s.cipher_suite or "—",
            "ca":     extract_org(s.issuer) if s.issuer else "—",
            "weak":   s.risk_tier in ("Legacy", "Critical"),
        }
        for s in detail_scans
    ]

    return {
        "summary": {
            "total_applications":  total_apps,
            "sites_surveyed":      total_apps,
            "active_certificates": total_apps,
            "weak_cryptography":   weak_crypto,
            "certificate_issues":  cert_issues,
        },
        "charts": {
            "key_length_distribution": key_length_distribution,
            "cipher_usage":            cipher_usage,
            "encryption_protocols":    encryption_protocols,
            "top_cas":                 top_cas,
        },
        "top_certificates": top_certificates,
    }


# ─────────────────────────────────────────────────────────────────────────────
# PQC COMPLIANCE / POSTURE
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/pqc-compliance")
def get_pqc_compliance(db: Session = Depends(get_db)):
    """
    Powers the Posture of PQC dashboard.
    Fulfills: 'Quantum-Safe Label' and NIST FIPS 203/204/205 compliance check.
    """
    all_scans = db.query(database.AssetScan).all()
    total = len(all_scans) or 1  # avoid division by zero

    elite    = sum(1 for s in all_scans if s.risk_tier == "Elite-PQC")
    standard = sum(1 for s in all_scans if s.risk_tier == "Standard")
    legacy   = sum(1 for s in all_scans if s.risk_tier == "Legacy")
    critical = sum(1 for s in all_scans if s.risk_tier == "Critical")

    # Assets table for PqcPosture.jsx
    assets_table = [
        {
            "name":        f"{s.target_url} ({s.ip_address or '—'})",
            "pqc_support": "Yes" if s.is_pqc else "No",
            "tier":        s.risk_tier,
            "score":       s.simple_score,
        }
        for s in all_scans[:10]
    ]

    # Standard recommendations (problem statement actionables)
    recommendations = [
        "Upgrade to TLS 1.3 with PQC hybrid key exchange.",
        "Implement ML-KEM (FIPS 203) for key encapsulation on all APIs.",
        "Replace RSA/ECC signatures with ML-DSA (FIPS 204) or SLH-DSA (FIPS 205).",
        "Develop and execute a PQC Migration Plan aligned with NIST guidelines.",
        "Update cryptographic libraries (OpenSSL 3.x with OQS provider).",
        "Conduct quarterly CBOM audits to track migration progress.",
    ]

    # Summary stats for pie/bar charts in PqcPosture.jsx
    stats = {
        "elite":       elite,
        "standard":    standard,
        "legacy":      legacy,
        "critical":    critical,
        "total":       total,
        "elitePct":    round((elite    / total) * 100),
        "standardPct": round((standard / total) * 100),
        "legacyPct":   round((legacy   / total) * 100),
        "criticalCount": critical,
    }

    # Selected app detail (most recent scan)
    latest = db.query(database.AssetScan).order_by(database.AssetScan.id.desc()).first()
    selected_app = None
    if latest:
        selected_app = {
            "name":     latest.target_url,
            "owner":    "PNB IT Security",
            "exposure": "Internet",
            "tls":      f"{latest.public_key_algo or 'RSA'} / {latest.tls_version or 'TLS'}",
            "score":    latest.risk_score or int((latest.simple_score or 0) * 100),
            "status":   latest.risk_tier,
        }

    return {
        "stats":          stats,
        "assets_table":   assets_table,
        "recommendations": recommendations,
        "selected_app":   selected_app,
        # Legacy shape kept for backwards compatibility
        "classification_grade": {
            "Elite": elite, "Standard": standard,
            "Legacy": legacy, "Critical": critical,
        },
        "percentages": {
            "Elite-PQC Ready": stats["elitePct"],
            "Standard":        stats["standardPct"],
            "Legacy":          stats["legacyPct"],
            "Critical Apps":   round((critical / total) * 100),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# EXPORT / CYBER RATING
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/export/all")
def get_all_scans_for_export(db: Session = Depends(get_db)):
    """
    Used by CyberRating, Reporting, and AssetInventory pages.
    Returns all scans as dicts (serialized) + cumulative summary.
    """
    all_scans = db.query(database.AssetScan).order_by(database.AssetScan.id.desc()).all()
    total = len(all_scans)

    # Cumulative score: average risk_score (0–1000) for the Cyber Rating page
    if total > 0:
        avg_risk_score = round(
            sum(s.risk_score or int((s.simple_score or 0) * 100) for s in all_scans) / total
        )
        avg_simple = round(sum(s.simple_score or 0 for s in all_scans) / total, 2)
    else:
        avg_risk_score = 0
        avg_simple = 0

    dist = {"Elite-PQC": 0, "Standard": 0, "Legacy": 0, "Critical": 0}
    for s in all_scans:
        dist[s.risk_tier] = dist.get(s.risk_tier, 0) + 1

    return {
        "scans": [scan_to_dict(s) for s in all_scans],
        "summary": {
            "total_assets":      total,
            "cumulative_score":  avg_risk_score,   # 0–1000 for CyberRating page
            "avg_simple_score":  avg_simple,        # 0–10
            "risk_distribution": dist,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# DELETE
# ─────────────────────────────────────────────────────────────────────────────

@app.delete("/api/scan/{scan_id}")
def delete_scan(scan_id: int, db: Session = Depends(get_db)):
    """Hard-delete a scan record by ID."""
    record = db.query(database.AssetScan).filter(database.AssetScan.id == scan_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Scan ID {scan_id} not found.")
    db.delete(record)
    db.commit()
    return {"message": f"Scan ID {scan_id} deleted successfully."}
@app.delete("/api/scans/all")
def delete_all_scans(db: Session = Depends(get_db)):
    """Deletes all scan records from the database."""
    try:
        num_deleted = db.query(database.AssetScan).delete()
        db.commit()
        return {"message": f"Successfully deleted {num_deleted} records."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {
        "status":  "ok",
        "service": "PNB Quantum-Proof Systems Scanner",
        "version": "2.0.0 — PSB Hackathon 2026",
    }