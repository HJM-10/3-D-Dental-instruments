from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="user") # "super_admin", "admin", or "user"
    profile_image = Column(String, nullable=True)
    business = Column(String, nullable=True)
    country = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    is_approved = Column(Boolean, default=False)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    carts = relationship("Cart", back_populates="user")
    orders = relationship("Order", back_populates="user")
    analytics = relationship("Analytics", back_populates="user")
    product_engagements = relationship("ProductEngagement", back_populates="user")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)
    is_private = Column(Boolean, default=False)
    
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    base_price = Column(Float, nullable=False)
    stock_amount = Column(Integer, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    configurable = Column(Boolean, default=False)
    images = Column(JSON, nullable=True)
    model_3d_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    category = relationship("Category", back_populates="products")
    configurations = relationship("ProductConfiguration", back_populates="product")
    cart_items = relationship("CartItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
    analytics = relationship("Analytics", back_populates="product")
    engagements = relationship("ProductEngagement", back_populates="product")

class ProductConfiguration(Base):
    __tablename__ = "product_configurations"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    field_name = Column(String, nullable=False) # e.g. size, color
    field_type = Column(String, nullable=False) # text, dropdown, number
    options = Column(JSON, nullable=True) # list of valid options
    
    product = relationship("Product", back_populates="configurations")

class Cart(Base):
    __tablename__ = "carts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("User", back_populates="carts")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(Base):
    __tablename__ = "cart_items"
    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("carts.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=1)
    configuration = Column(JSON, nullable=True) # Selected configuration
    
    cart = relationship("Cart", back_populates="items")
    product = relationship("Product", back_populates="cart_items")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_price = Column(Float, nullable=False)
    status = Column(String, default="pending_approval")
    shipping_id = Column(String, nullable=True)
    contact_method = Column(String, nullable=True)
    contact_value = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=1)
    configuration = Column(JSON, nullable=True)
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class Analytics(Base):
    __tablename__ = "analytics"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_type = Column(String, nullable=False) # view, click, add_to_cart
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="analytics")
    product = relationship("Product", back_populates="analytics")

class ProductEngagement(Base):
    __tablename__ = "product_engagements"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String, nullable=True, index=True)
    interaction_type = Column(String, nullable=False, index=True)
    view_started_at = Column(DateTime, nullable=True)
    view_ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    product = relationship("Product", back_populates="engagements")
    user = relationship("User", back_populates="product_engagements")
