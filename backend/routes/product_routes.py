from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from utils.auth import get_current_user, get_current_admin
import os
import uuid
import shutil

router = APIRouter(prefix="/products", tags=["products"])

@router.post("/upload-image")
def upload_image(file: UploadFile = File(...), current_user: models.User = Depends(get_current_admin)):
    UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    new_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOADS_DIR, new_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/uploads/{new_filename}"}


@router.get("/", response_model=List[schemas.ProductResponse])
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()

@router.get("/uncategorized", response_model=List[schemas.ProductResponse])
def get_uncategorized_products(db: Session = Depends(get_db)):
    return db.query(models.Product).filter(models.Product.category_id == None).all()

@router.get("/{id}", response_model=schemas.ProductResponse)
def get_product(id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    new_product = models.Product(
        name=product.name,
        sku=product.sku,
        description=product.description,
        base_price=product.base_price,
        stock_amount=product.stock_amount,
        category_id=product.category_id,
        configurable=product.configurable,
        images=product.images,
        model_3d_url=product.model_3d_url
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    if product.configurable and product.configurations:
        for config in product.configurations:
            new_config = models.ProductConfiguration(
                product_id=new_product.id,
                field_name=config.field_name,
                field_type=config.field_type,
                options=config.options
            )
            db.add(new_config)
        db.commit()
        db.refresh(new_product)
        
    return new_product

@router.put("/{id}", response_model=schemas.ProductResponse)
def update_product(id: int, product_update: schemas.ProductUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    product = db.query(models.Product).filter(models.Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)
    
    db.commit()
    db.refresh(product)
    return product
