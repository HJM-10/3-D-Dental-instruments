from database import SessionLocal
from sqlalchemy import text

def clear_data():
    db = SessionLocal()
    try:
        print("Clearing application data...")
        # Note: Depending on the database (SQLite, Postgres), the query varies.
        # Assuming SQLite for now. We can just delete from the tables.
        db.execute(text("DELETE FROM product_engagements"))
        db.execute(text("DELETE FROM cart_items"))
        db.execute(text("DELETE FROM orders"))
        db.execute(text("DELETE FROM products"))
        db.execute(text("DELETE FROM categories"))
        db.commit()
        print("Data cleared successfully.")
    except Exception as e:
        db.rollback()
        print("Error clearing data:", e)
    finally:
        db.close()

if __name__ == "__main__":
    clear_data()
