from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
import models, schemas
from database import get_db
from utils.auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

import urllib.request
import json

def get_ip_location(ip: str):
    if not ip or ip in ("127.0.0.1", "localhost", "::1"):
        return None
    try:
        url = f"http://ip-api.com/json/{ip}"
        with urllib.request.urlopen(url, timeout=3) as response:
            data = json.loads(response.read().decode())
            if data.get("status") == "success":
                return data.get("country")
    except:
        pass
    return None

@router.post("/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # First user owns the platform. Later role changes are controlled by the super admin.
    is_first_user = db.query(models.User).count() == 0
    role = "super_admin" if is_first_user else "user"
    is_approved = True if is_first_user else False
    
    raw_ip = request.client.host if request.client else None
    ip_address = raw_ip
    if raw_ip:
        location = get_ip_location(raw_ip)
        if location:
            ip_address = f"{raw_ip} ({location})"
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        name=user.name, 
        email=user.email, 
        password=hashed_password, 
        role=role,
        business=user.business,
        country=user.country,
        phone_number=user.phone_number,
        is_approved=is_approved,
        ip_address=ip_address
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Auto-create cart for new user
    new_cart = models.Cart(user_id=new_user.id)
    db.add(new_cart)
    db.commit()
    
    return new_user

@router.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    if not db_user.is_approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account pending admin approval")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email, "role": db_user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": db_user.id, "name": db_user.name, "email": db_user.email, "role": db_user.role, "profile_image": db_user.profile_image}}

@router.get("/me", response_model=schemas.UserResponse)
def read_auth_user(current_user: models.User = Depends(get_current_user)):
    return current_user
