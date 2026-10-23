from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from utils.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/cart", tags=["cart"])

@router.get("/all", response_model=List[schemas.CartResponse])
def get_all_carts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    # Returns all carts that have items in them
    carts = db.query(models.Cart).filter(models.Cart.items.any()).all()
    return carts

@router.get("/", response_model=schemas.CartResponse)
def get_cart(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cart = db.query(models.Cart).filter(models.Cart.user_id == current_user.id).first()
    if not cart:
        cart = models.Cart(user_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart

@router.post("/add", response_model=schemas.CartItemResponse)
def add_to_cart(item: schemas.CartItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cart = db.query(models.Cart).filter(models.Cart.user_id == current_user.id).first()
    if not cart:
        cart = models.Cart(user_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    
    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    cart_item = models.CartItem(
        cart_id=cart.id,
        product_id=item.product_id,
        quantity=item.quantity,
        configuration=item.configuration
    )
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    return cart_item

@router.delete("/remove/{item_id}")
def remove_from_cart(item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cart = db.query(models.Cart).filter(models.Cart.user_id == current_user.id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
        
    cart_item = db.query(models.CartItem).filter(models.CartItem.id == item_id, models.CartItem.cart_id == cart.id).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Item not found in cart")
        
    db.delete(cart_item)
    db.commit()
    return {"message": "Item removed from cart"}
