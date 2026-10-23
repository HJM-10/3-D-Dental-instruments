from database import engine, Base
import models
print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Recreating all tables...")
Base.metadata.create_all(bind=engine)
print("Database reset complete.")
