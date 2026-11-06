from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect
from database import engine, Base
import models
from fastapi.staticfiles import StaticFiles
import os
from routes import auth_routes, category_routes, product_routes, cart_routes, order_routes, user_routes, analytics_routes, blender_routes

# Create tables
Base.metadata.create_all(bind=engine)

# Upgrade existing databases while preserving orders that predate courier selection.
with engine.begin() as connection:
    dialect = connection.dialect.name
    if dialect == "sqlite":
        connection.exec_driver_sql("BEGIN IMMEDIATE")
    columns = inspect(connection).get_columns("orders")
    if not any(column["name"] == "shipping_carrier" for column in columns):
        if dialect == "postgresql":
            connection.exec_driver_sql("ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR")
        else:
            connection.exec_driver_sql("ALTER TABLE orders ADD COLUMN shipping_carrier VARCHAR")

app = FastAPI(title="DNF Trading API")

# Setup CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(category_routes.router)
app.include_router(product_routes.router)
app.include_router(cart_routes.router)
app.include_router(order_routes.router)
app.include_router(user_routes.router)
app.include_router(analytics_routes.router)
app.include_router(blender_routes.router)

GENERATED_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "generated"))
os.makedirs(GENERATED_DIR, exist_ok=True)
app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")

UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to DNF Trading API"}
