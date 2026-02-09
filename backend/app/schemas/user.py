from typing import Optional
from pydantic import BaseModel

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    role: Optional[str] = "operator"
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
