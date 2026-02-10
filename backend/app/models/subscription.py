from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean, Enum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
import enum

class SubscriptionStatus(enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELED = "canceled"

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(String(50), primary_key=True) # prematur, starter, basic, pro, advanced, supreme
    name = Column(String(100), nullable=False)
    price_idr = Column(Numeric(15, 2), nullable=False)
    duration_days = Column(Integer, nullable=False)
    ig_account_limit = Column(Integer, nullable=False)
    proxy_slot_limit = Column(Integer, default=0)
    features = Column(JSON) # e.g. ["follow", "like", "reels"]
    allow_addons = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(String(50), ForeignKey("subscription_plans.id"), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="active") # active, expired, canceled
    
    user = relationship("User")
    plan = relationship("SubscriptionPlan")

class AddonType(enum.Enum):
    PROXY = "proxy"
    QUOTA = "quota"
    CROSS_POSTING = "cross_posting"

class SubscriptionAddon(Base):
    __tablename__ = "subscription_addons"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    addon_type = Column(String(30), nullable=False) # proxy, quota, cross_posting
    sub_type = Column(String(50)) # shared, private, dedicated
    quantity = Column(Integer, nullable=False)
    price_paid = Column(Numeric(15, 2), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    fulfilled_at = Column(DateTime(timezone=True))  # When admin fulfilled proxy order
    
    user = relationship("User")
    proxy_assignments = relationship("ProxyAssignment", back_populates="addon")

class ProxyAssignment(Base):
    __tablename__ = "proxy_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    addon_id = Column(Integer, ForeignKey("subscription_addons.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    proxy_ip = Column(String(255), nullable=False)
    proxy_port = Column(Integer, default=80)
    proxy_username = Column(String(100))
    proxy_password = Column(String(255))
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Admin user_id
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", foreign_keys=[user_id])
    admin = relationship("User", foreign_keys=[assigned_by])
    addon = relationship("SubscriptionAddon", back_populates="proxy_assignments")
