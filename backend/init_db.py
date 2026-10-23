import os
from sqlalchemy import create_engine
from sqlalchemy_utils import database_exists, create_database

DB_URL = "postgresql://dnf:dnf123@localhost/dnf_trd"

engine = create_engine(DB_URL)
if not database_exists(engine.url):
    create_database(engine.url)
    print("Database 'dnf_trd' created successfully!")
else:
    print("Database 'dnf_trd' already exists.")
