from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class Fingerprint(Base):
    __tablename__ = "fingerprints"
    
    id = Column(Integer, primary_key=True, index=True)
    user_agent = Column(String, nullable=False)
    browser_version = Column(String)
    os_type = Column(String)
    device_memory = Column(Integer)
    hardware_concurrency = Column(Integer)
    screen_resolution = Column(String)
    timezone = Column(String)
    language = Column(String)
    raw_fingerprint = Column(JSON) # Store full fingerprint data
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Initially nullable for migration
    user = relationship("User")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # accounts = relationship("Account", back_populates="fingerprint")

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_encrypted = Column(String, nullable=True)
    seed_2fa = Column(String, nullable=True) # For 2FA
    proxy = Column(String, nullable=True)
    
    login_method = Column(Integer, default=1) # 1=Pass, 2=2FA, 3=Cookies
    cookies = Column(JSON, nullable=True) # Store session cookies
    last_login_state = Column(JSON, nullable=True) # Store instagrapi session dict
    
    fingerprint_id = Column(Integer, ForeignKey("fingerprints.id"), nullable=True)
    fingerprint = relationship(Fingerprint)
    
    is_active = Column(Boolean, default=True)
    is_checker = Column(Boolean, default=False)
    status = Column(String, default="offline") # offline, active, banned, challenge
    last_error = Column(String, nullable=True)  # Store last login error reason
    
    # Threads integration
    threads_profile_id = Column(String, nullable=True) # ID as string to avoid precision issues
    has_threads = Column(Boolean, default=False)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Initially nullable for migration
    user = relationship("User")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # tasks = relationship("Task", back_populates="account")
