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

    id = Column(Integer, primary_key=True, index=True)
    target_url = Column(String, index=True)
    ip_address = Column(String)
    port = Column(Integer, default=443)
    company_name = Column(String, default="Punjab National Bank")
    scan_date = Column(DateTime, default=datetime.datetime.utcnow)
    
    # TLS & Protocol
    tls_version = Column(String)
    cipher_suite = Column(String)
    
    # Certificate Info
    issuer = Column(String)
    subject = Column(String)
    valid_from = Column(String)
    valid_to = Column(String)
    is_expired = Column(Boolean, default=False)
    
    # Cryptographic Details
    public_key_algo = Column(String)
    key_size = Column(Integer)
    signature_algo = Column(String)
    
    # Evaluation Results
    risk_tier = Column(String)  # 'Elite-PQC', 'Standard', 'Legacy', 'Critical'
    risk_score = Column(Integer)
    simple_score = Column(Float)
    cbom_json = Column(JSON)

Base.metadata.create_all(bind=engine)
