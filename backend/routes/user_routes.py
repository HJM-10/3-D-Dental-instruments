from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import models, schemas
from database import get_db
from utils.auth import get_current_user, get_password_hash, get_current_super_admin

router = APIRouter(prefix="/users", tags=["users"])

class UserUpdate(BaseModel):
    name: str
    password: Optional[str] = None
    profile_image: Optional[str] = None

class UserRoleUpdate(BaseModel):
    role: str

@router.put("/me", response_model=schemas.UserResponse)
def update_profile(user_update: UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    current_user.name = user_update.name
    
    if user_update.password:
        current_user.password = get_password_hash(user_update.password)
        
    if user_update.profile_image:
        # Strict limit done on frontend, but we can check string length (2MB base64 ~ 2.8 million chars)
        if len(user_update.profile_image) > 3000000:
            raise HTTPException(status_code=400, detail="Image is too large. Max 2MB allowed.")
        current_user.profile_image = user_update.profile_image
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_super_admin)):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()

@router.put("/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_super_admin)
):
    allowed_roles = {"user", "admin"}
    if role_update.role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Invalid role assignment")

    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot change your own super admin role")

    if target_user.role == "super_admin":
        raise HTTPException(status_code=400, detail="Super admin role cannot be changed")

    target_user.role = role_update.role
    db.commit()
    db.refresh(target_user)
    return target_user

@router.put("/{user_id}/approve", response_model=schemas.UserResponse)
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_super_admin)
):
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    target_user.is_approved = True
    db.commit()
    db.refresh(target_user)
    return target_user
