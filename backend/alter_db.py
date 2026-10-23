import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("No database url")
    exit(1)

engine = create_engine(DB_URL)

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_method VARCHAR"))
        conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_value VARCHAR"))
        conn.commit()
    print("Successfully added columns")
except Exception as e:
    print("Error:", e)
