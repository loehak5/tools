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
    
    user = relationship("User")
