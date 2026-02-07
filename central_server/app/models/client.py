from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.models.base import Base


class Client(Base):
    """
    Model untuk manage client/tenant yang menyewa tools Instagram.
    Setiap client adalah satu pelanggan yang punya credentials unik.
    """
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, unique=True, index=True, nullable=False)  # e.g. "pelanggan_jakarta_1"
    company_name = Column(String, nullable=True)  # Optional company info
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # Authentication
    hashed_password = Column(String, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=False)  # Unique API key per client
    
    # Session Management (Single Device Enforcement)
    current_session_id = Column(String, nullable=True, index=True)  # Active session UUID
    current_device_info = Column(JSON, nullable=True)  # Device fingerprint (OS, hostname, MAC)
    session_started_at = Column(DateTime(timezone=True), nullable=True)
    
    # License Management
    is_active = Column(Boolean, default=True, index=True)  # Admin can disable anytime
    license_type = Column(String, nullable=True)  # e.g. "monthly", "yearly", "lifetime"
    license_start = Column(DateTime(timezone=True), nullable=True)
    license_end = Column(DateTime(timezone=True), nullable=True)  # Null = no expiry
    
    # Limits (optional - can be used for quota management)
    max_accounts = Column(Integer, default=100)
    max_proxies = Column(Integer, default=50)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_active = Column(DateTime(timezone=True), nullable=True)
    last_ip = Column(String, nullable=True)
    
    # Notes for admin
    notes = Column(String, nullable=True)
