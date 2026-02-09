from sqlalchemy import Column, Integer, String, Boolean
from app.models.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    avatar = Column(String, nullable=True)
    role = Column(String, default="operator")  # roles: admin, operator
    is_active = Column(Boolean, default=True)
