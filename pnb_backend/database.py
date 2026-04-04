# database.py
from sqlalchemy import create_engine, Column, Integer, String, Float, JSON, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./pnb_hackathon.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class AssetScan(Base):
    __tablename__ = "asset_scans"
    id             = Column(Integer, primary_key=True, index=True)
    target_url     = Column(String, index=True)
    ip_address     = Column(String)
    scan_date      = Column(DateTime, default=datetime.datetime.utcnow)

    # TLS / Cipher
    tls_version    = Column(String)
    cipher_suite   = Column(String)
    key_exchange   = Column(String)

    # Certificate details
    public_key_algo = Column(String)
    key_size        = Column(Integer)
    signature_algo  = Column(String)
    issuer          = Column(String)
    subject         = Column(String)
    valid_from      = Column(String)
    valid_to        = Column(String)

    # NEW: Asset classification & cert health
    asset_type      = Column(String, default="Web App")   # Web App | API | Server | VPN
    cert_status     = Column(String, default="Valid")     # Valid | Expiring | Expired

    # Risk & PQC
    risk_tier       = Column(String)   # Elite-PQC | Standard | Legacy | Critical
    simple_score    = Column(Float)    # 0–10
    risk_score      = Column(Integer)  # 0–1000
    is_pqc          = Column(Boolean, default=False)
    pqc_method      = Column(String)
    recommendations = Column(JSON)
    cbom_json       = Column(JSON)

    # NEW: Trust and application security
    trust_status    = Column(String, default="Valid")     # Valid | Self-signed | Hostname-mismatch | Chain-invalid
    app_security_score = Column(Float, default=0.0)       # 0–10
    security_headers = Column(JSON)                       # Dict of security headers present

# Create / migrate tables (adds new columns if they don't exist via SQLite ALTER TABLE)
Base.metadata.create_all(bind=engine)

# Safe migration: add new columns to existing DB without data loss
import sqlalchemy as sa
from sqlalchemy import inspect

def migrate():
    """Add missing columns to existing databases (idempotent)."""
    insp = inspect(engine)
    existing_cols = {c["name"] for c in insp.get_columns("asset_scans")}
    new_cols = {
        "asset_type":  "VARCHAR DEFAULT 'Web App'",
        "cert_status": "VARCHAR DEFAULT 'Valid'",
        "trust_status": "VARCHAR DEFAULT 'Valid'",
        "app_security_score": "FLOAT DEFAULT 0.0",
        "security_headers": "JSON",
    }
    with engine.connect() as conn:
        for col, definition in new_cols.items():
            if col not in existing_cols:
                conn.execute(sa.text(f"ALTER TABLE asset_scans ADD COLUMN {col} {definition}"))
                print(f"[migrate] Added column: {col}")
        conn.commit()

migrate()
