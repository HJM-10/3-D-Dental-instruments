r"""Populate a local SQLite database with a repeatable, fictional demo store.

Run from backend: venv\Scripts\python.exe seed_demo_data.py
Existing records and passwords are preserved. A SQLite backup is made first.
Re-running the same seed batch leaves the database unchanged.
"""

import argparse
import base64
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import random
import shutil
import sqlite3
import uuid

ROOT = Path(__file__).resolve().parent
BATCH = "dnf-demo-v1"
CATALOG = [
    ("IM-01", "Implant Drill", "Implantology", 89, 42, "drill"),
    ("DG-01", "Dental Mirror", "Diagnostics", 18, 160, "mirror"),
    ("DG-02", "Periodontal Probe", "Diagnostics", 24, 95, "probe"),
    ("DG-03", "College Tweezers", "Diagnostics", 22, 88, "tweezers"),
    ("SG-01", "Extraction Forceps", "Surgical", 64, 54, "forceps"),
    ("SG-02", "Root Elevator", "Surgical", 42, 36, "probe"),
    ("SG-03", "Surgical Scissors", "Surgical", 38, 7, "forceps"),
    ("RS-01", "Composite Instrument", "Restorative", 29, 68, "probe"),
    ("RS-02", "Amalgam Condenser", "Restorative", 26, 45, "probe"),
    ("RS-03", "Restoration Carver", "Restorative", 31, 0, "probe"),
    ("IM-02", "Implant Depth Gauge", "Implantology", 48, 24, "probe"),
    ("IM-03", "Implant Driver", "Implantology", 72, 5, "drill"),
]
CATEGORIES = {
    "Diagnostics": ("Mirrors, probes and instruments for your diagnostic setup.", "mirror", "#e2eeea"),
    "Surgical": ("Explore forceps, elevators and surgical essentials.", "forceps", "#e5eaf3"),
    "Restorative": ("Browse tools for restorative workflows and kit building.", "probe", "#eee8df"),
    "Implantology": ("Explore implant instruments and a configurable drill sample.", "drill", "#e5e9f0"),
}


def illustration(kind, title, background):
    """Small local vector placeholders, explicitly labeled as demo illustrations."""
    shapes = {
        "mirror": '<circle cx="374" cy="151" r="49" fill="#f9fcff" stroke="#6d808a" stroke-width="10"/><path d="M341 190L264 286"/><path d="M267 280L185 381" stroke-width="25"/>',
        "probe": '<path d="M209 375L310 242" stroke-width="24"/><path d="M310 242L373 159L405 173L422 138"/>',
        "tweezers": '<path d="M202 371Q240 287 386 155L409 146M202 371Q296 338 412 189L415 166"/><path d="M231 345L317 265" stroke-width="17"/>',
        "forceps": '<ellipse cx="221" cy="333" rx="29" ry="45" transform="rotate(36 221 333)"/><ellipse cx="289" cy="361" rx="29" ry="45" transform="rotate(36 289 361)"/><path d="M245 300L357 158L391 146L408 177L379 200L306 322M275 323L345 224L373 184"/>',
        "drill": '<path d="M224 367L307 252" stroke-width="31"/><path d="M307 252L382 150" stroke-width="16"/><path d="M328 223L357 225M340 207L368 209M353 190L380 192M366 173L391 175" stroke-width="5"/>',
    }
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">
<rect width="720" height="480" fill="{background}"/><circle cx="485" cy="180" r="160" fill="#ffffff" opacity=".35"/>
<ellipse cx="309" cy="392" rx="150" ry="16" fill="#203c45" opacity=".08"/>
<g fill="none" stroke="#8c9da5" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">{shapes[kind]}</g>
<text x="30" y="36" font-family="sans-serif" font-size="12" fill="#586c65" letter-spacing="2">DEMO CATALOG</text>
<text x="30" y="446" font-family="sans-serif" font-size="20" fill="#244b3f">{title}</text>
<text x="690" y="446" text-anchor="end" font-family="sans-serif" font-size="10" fill="#61726e">ILLUSTRATION</text></svg>'''


def seed(database):
    database = database.resolve()
    if not database.is_file():
        raise SystemExit(f"Local database does not exist: {database}")
    # Explicit local file selection avoids accidentally seeding the .env PostgreSQL target.
    os.environ["DATABASE_URL"] = "sqlite:///" + database.as_posix()
    from sqlalchemy import Column, MetaData, String, Table, create_engine, select
    from sqlalchemy.orm import Session
    import models
    from utils.auth import get_password_hash

    engine = create_engine(os.environ["DATABASE_URL"])
    metadata = MetaData()
    batches = Table("demo_seed_batches", metadata, Column("name", String, primary_key=True), Column("summary", String))
    with sqlite3.connect(database) as connection:
        exists = connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='demo_seed_batches'").fetchone()
        previous = connection.execute("SELECT summary FROM demo_seed_batches WHERE name=?", (BATCH,)).fetchone() if exists else None
        if previous:
            print("Demo batch already installed; no records changed.")
            print(previous[0])
            return
        backup = database.with_name(f"{database.stem}.before-demo-{datetime.now():%Y%m%d-%H%M%S}-{uuid.uuid4().hex[:6]}.db")
        with sqlite3.connect(backup) as destination:
            connection.backup(destination)
    print(f"Backup saved: {backup}")
    metadata.create_all(engine)
    rng = random.Random(231026)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    assets = ROOT / "uploads" / "demo"
    assets.mkdir(parents=True, exist_ok=True)
    with Session(engine) as db, db.begin():
        categories = {}
        for name, (description, kind, background) in CATEGORIES.items():
            category_name = f"Demo · {name}"
            category = db.query(models.Category).filter_by(name=category_name).first()
            if category is None:
                svg = illustration(kind, name, background)
                category = models.Category(name=category_name, description=description + " Fictional demo catalog.", image="data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode(), is_private=False)
                db.add(category)
                db.flush()
            categories[name] = category

        products = []
        for sku, name, category_name, price, stock, kind in CATALOG:
            sku = f"DEMO-{sku}"
            product = db.query(models.Product).filter_by(sku=sku).first()
            if product is None:
                filename = sku.lower() + ".svg"
                (assets / filename).write_text(illustration(kind, name, CATEGORIES[category_name][2]), encoding="utf-8")
                product = models.Product(sku=sku, name=f"Demo {name}", description=f"Sample {name.lower()} for exploring the DNF catalog, cart and ordering experience. Fictional product: price, stock and specifications are for demonstration only.", base_price=price, stock_amount=stock, category_id=categories[category_name].id, configurable=sku == "DEMO-IM-01", images=[f"/uploads/demo/{filename}"], model_3d_url="/generated/test2.glb" if sku == "DEMO-IM-01" else None, created_at=now - timedelta(days=45))
                db.add(product)
                db.flush()
                if product.configurable:
                    source = ROOT.parent / "templates" / "preview_customizer"
                    target = ROOT.parent / "templates" / str(product.id)
                    if source.is_dir() and not target.exists():
                        shutil.copytree(source, target)
                    db.add(models.ProductConfiguration(product_id=product.id, field_name="Finish", field_type="dropdown", options=["Satin", "Polished"]))
            products.append(product)

        customer = db.query(models.User).filter_by(email="user@example.com").first()
        if customer is None:
            customer = models.User(name="Demo User", email="user@example.com", password=get_password_hash("UserDemo123!"), role="user", is_approved=True)
            db.add(customer)
            db.flush()
        customers = [customer]
        for index, name in enumerate(["Demo Cedar Dental", "Demo Harbor Clinic", "Demo Maple Studio", "Demo Summit Dental", "Demo Willow Practice", "Demo Oak Clinic", "Demo River Dental"], 1):
            email = f"demo.clinic{index}@example.com"
            person = db.query(models.User).filter_by(email=email).first()
            if person is None:
                person = models.User(name=name, email=email, password=get_password_hash("DemoClinic123!"), role="user", business=name, country="Pakistan", is_approved=True, created_at=now - timedelta(days=40 + index))
                db.add(person)
                db.flush()
            customers.append(person)
        for person in customers:
            cart = db.query(models.Cart).filter_by(user_id=person.id).first()
            if cart is None:
                db.add(models.Cart(user_id=person.id))
        db.flush()

        statuses = ["pending_approval", "pending_quote", "requoted", "approved", "under manufacturing", "shipped", "delivered"]
        order_ids = []
        order_value = 0.0
        for index in range(72):
            person = customer if index < 7 else rng.choice(customers)
            age = index if index < 7 else rng.randrange(30)
            created = min(today - timedelta(days=age) + timedelta(hours=8 + index % 10, minutes=index % 60), now - timedelta(minutes=15))
            status = statuses[index] if index < 7 else rng.choices(statuses + ["denied"], weights=[12, 8, 5, 15, 15, 20, 30, 3])[0]
            order = models.Order(user_id=person.id, total_price=0, status=status, shipping_id=f"DEMO-SHIP-{index + 1:04d}" if status in {"shipped", "delivered"} else None, contact_method="email", contact_value=person.email, created_at=created)
            db.add(order)
            db.flush()
            total = 0.0
            for product in rng.sample(products, rng.randint(1, 3)):
                quantity = rng.randint(1, 5)
                total += quantity * product.base_price
                db.add(models.OrderItem(order_id=order.id, product_id=product.id, quantity=quantity, configuration={"Demo sample": "Fictional order", "Finish": rng.choice(["Satin", "Polished"])}))
            order.total_price = round(total, 2)
            order_value += order.total_price
            order_ids.append(order.id)

        event_count = 0
        for index in range(480):
            product = rng.choices(products, weights=[25, 18, 14, 10, 16, 8, 5, 7, 4, 2, 9, 3])[0]
            person = rng.choice(customers) if index % 4 else None
            session_id = None if person else f"{BATCH}-guest-{index % 29}"
            started = now - timedelta(days=rng.randrange(30), hours=rng.randrange(8), minutes=rng.randrange(60) + 20)
            page_seconds = rng.randint(35, 430)

            def event(kind, offset, seconds):
                nonlocal event_count
                at = started + timedelta(seconds=offset)
                db.add(models.ProductEngagement(product_id=product.id, user_id=person.id if person else None, session_id=session_id, interaction_type=kind, view_started_at=at, view_ended_at=at + timedelta(seconds=seconds), duration_seconds=seconds, created_at=at))
                event_count += 1

            event("page_view", 0, page_seconds)
            if rng.random() < .72:
                event("description_view", 5, min(page_seconds - 5, rng.randint(15, 90)))
            if product.configurable and rng.random() < .85:
                event("3d_view", 10, rng.randint(40, 210))
                if rng.random() < .7:
                    event("customization_start", 30, 0)
                    event("customization_end", 30, rng.randint(60, 300))

        cart = db.query(models.Cart).filter_by(user_id=customer.id).one()
        for product, quantity in [(products[1], 2), (products[4], 1), (products[2], 3)]:
            if not db.query(models.CartItem).filter_by(cart_id=cart.id, product_id=product.id).first():
                db.add(models.CartItem(cart_id=cart.id, product_id=product.id, quantity=quantity, configuration={"Demo sample": "Cart preview"}))
        summary = {"batch": BATCH, "demo_categories": len(categories), "demo_products": len(products), "demo_customers": len(customers), "demo_orders": len(order_ids), "demo_product_views": 480, "demo_engagement_events": event_count, "demo_order_value_usd": round(order_value, 2), "customer_login": customer.email}
        db.execute(batches.insert().values(name=BATCH, summary=json.dumps(summary)))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=ROOT / "dnf.db", help="Existing local SQLite file to populate")
    seed(parser.parse_args().database)
