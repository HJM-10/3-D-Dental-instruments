from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# User Schemas
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    business: Optional[str] = None
    country: Optional[str] = None
    phone_number: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    profile_image: Optional[str] = None
    business: Optional[str] = None
    country: Optional[str] = None
    phone_number: Optional[str] = None
    is_approved: bool
    ip_address: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Category Schemas
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    product_ids: Optional[List[int]] = []
    is_private: Optional[bool] = False

class CategoryResponse(CategoryCreate):
    id: int
    class Config:
        from_attributes = True

# Product Configuration Schema
class ProductConfigCreate(BaseModel):
    field_name: str
    field_type: str
    options: Optional[List[str]] = None

class ProductConfigResponse(ProductConfigCreate):
    id: int
    product_id: int
    class Config:
        from_attributes = True

# Product Schemas
class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    description: Optional[str] = None
    base_price: float
    stock_amount: int = 0
    category_id: Optional[int] = None
    configurable: bool = False
    configurations: Optional[List[ProductConfigCreate]] = []
    images: Optional[List[str]] = []
    model_3d_url: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    stock_amount: Optional[int] = None
    category_id: Optional[int] = None
    configurable: Optional[bool] = None
    images: Optional[List[str]] = None
    model_3d_url: Optional[str] = None

class ProductResponse(BaseModel):
    id: int
    sku: Optional[str]
    name: str
    description: Optional[str]
    base_price: float
    stock_amount: int
    category_id: Optional[int]
    configurable: bool
    images: Optional[List[str]] = []
    model_3d_url: Optional[str]
    created_at: datetime
    configurations: List[ProductConfigResponse] = []
    class Config:
        from_attributes = True

# Cart Schemas
class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1
    configuration: Optional[Dict[str, Any]] = None

class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    configuration: Optional[Dict[str, Any]]
    product: ProductResponse
    class Config:
        from_attributes = True

class CartResponse(BaseModel):
    id: int
    user_id: int
    items: List[CartItemResponse] = []
    user: Optional[UserResponse] = None
    class Config:
        from_attributes = True

# Order Schemas
class OrderCreate(BaseModel):
    contact_method: str
    contact_value: str

class OrderReview(BaseModel):
    action: str # "approve", "deny", "requote"
    new_price: Optional[float] = None

class CustomOrderCreate(BaseModel):
    product_id: int
    slots: Dict[str, Any]
    display_slots: Optional[Dict[str, Any]] = None

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    configuration: Optional[Dict[str, Any]]
    product: ProductResponse
    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_price: float
    status: str
    shipping_id: Optional[str]
    contact_method: Optional[str] = None
    contact_value: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse] = []
    class Config:
        from_attributes = True

# Analytics Schema
class AnalyticsResponse(BaseModel):
    id: int
    user_id: Optional[int]
    event_type: str
    product_id: Optional[int]
    timestamp: datetime
    class Config:
        from_attributes = True

class ProductEngagementCreate(BaseModel):
    product_id: int
    session_id: Optional[str] = None
    interaction_type: str
    view_started_at: Optional[datetime] = None
    view_ended_at: Optional[datetime] = None
    duration_seconds: float = 0.0
