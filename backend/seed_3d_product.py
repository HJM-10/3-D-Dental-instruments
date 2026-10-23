from database import SessionLocal
import models

def seed_data():
    db = SessionLocal()
    try:
        # Create a category if it doesn't exist
        category = db.query(models.Category).filter_by(name="3D Models").first()
        if not category:
            category = models.Category(name="3D Models", description="Customizable 3D printed products")
            db.add(category)
            db.commit()
            db.refresh(category)
            
        # Create the 3D Customized Product
        product = db.query(models.Product).filter_by(name="3D Customized Crown").first()
        if not product:
            product = models.Product(
                name="3D Customized Crown",
                description="Interactive 3D dental crown that you can customize in real-time.",
                base_price=99.99,
                category_id=category.id
            )
            db.add(product)
            db.commit()
            print("Successfully added the 3D Customized product.")
        else:
            print("3D Customized product already exists.")
            
    except Exception as e:
        print("Error seeding data:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
