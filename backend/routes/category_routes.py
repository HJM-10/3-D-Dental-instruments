from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from utils.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role in ["admin", "super_admin"]:
        return db.query(models.Category).all()
    else:
        return db.query(models.Category).filter(models.Category.is_private == False).all()

@router.post("/", response_model=schemas.CategoryResponse)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    new_category = models.Category(
        name=category.name,
        description=category.description,
        image=category.image,
        is_private=category.is_private
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    
    # Assign products if provided
    if category.product_ids:
        products = db.query(models.Product).filter(models.Product.id.in_(category.product_ids)).all()
        for p in products:
            p.category_id = new_category.id
        db.commit()
        
    return new_category

@router.put("/{category_id}", response_model=schemas.CategoryResponse)
def update_category(category_id: int, category: schemas.CategoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    target = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Category not found")
        
    target.name = category.name
    target.description = category.description
    target.image = category.image
    if category.is_private is not None:
        target.is_private = category.is_private
        
    db.commit()
    db.refresh(target)
    return target

@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    target = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Category not found")
        
    db.delete(target)
    db.commit()
    return {"detail": "Category deleted"}
