import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
from utils.auth import get_password_hash

def create_default_admin():
    db = SessionLocal()
    admin_email = "admin@gmail.com"
    admin_user = db.query(models.User).filter(models.User.email == admin_email).first()
    
    if not admin_user:
        hashed_password = get_password_hash("admin123")
        admin_user = models.User(
            name="Admin User",
            email=admin_email,
            password=hashed_password,
            role="super_admin",
            is_approved=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Create cart for admin
        admin_cart = models.Cart(user_id=admin_user.id)
        db.add(admin_cart)
        db.commit()
        
        print("Default super admin created: admin@gmail.com / admin123")
    else:
        if admin_user.role != "super_admin":
            admin_user.role = "super_admin"
            db.commit()
            print("Existing admin@gmail.com promoted to super admin.")
        else:
            print("Super admin user already exists.")
    
    db.close()

if __name__ == "__main__":
    create_default_admin()
