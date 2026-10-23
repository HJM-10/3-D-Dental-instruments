from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from utils.auth import ALGORITHM, SECRET_KEY, get_current_admin

router = APIRouter(prefix="/analytics", tags=["analytics"])

ENGAGEMENT_TYPES = {
    "page_view",
    "description_view",
    "3d_view",
    "customization_start",
    "customization_end",
}


def _optional_user_from_request(request: Request, db: Session):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.replace("Bearer ", "", 1).strip()
    if not token:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

    email = payload.get("sub")
    if not email:
        return None
    return db.query(models.User).filter(models.User.email == email).first()


def _currency(value):
    return round(float(value or 0), 2)


def _safe_duration(value):
    try:
        duration = float(value or 0)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(duration, 86400.0))


def _series_for_last_days(orders, days=30):
    today = date.today()
    start = today - timedelta(days=days - 1)
    buckets = {
        start + timedelta(days=index): {"date": (start + timedelta(days=index)).isoformat(), "revenue": 0.0, "orders": 0}
        for index in range(days)
    }

    for order in orders:
        order_date = (order.created_at or datetime.utcnow()).date()
        if order_date not in buckets:
            continue
        buckets[order_date]["revenue"] += float(order.total_price or 0)
        buckets[order_date]["orders"] += 1

    return [
        {**bucket, "revenue": _currency(bucket["revenue"])}
        for bucket in buckets.values()
    ]


def _product_snapshot(product, sold_quantity=0, revenue=0.0):
    return {
        "product_id": product.id,
        "name": product.name,
        "sku": product.sku,
        "sold_quantity": int(sold_quantity or 0),
        "revenue": _currency(revenue),
    }


@router.post("/engagement", status_code=status.HTTP_201_CREATED)
def track_product_engagement(
    payload: schemas.ProductEngagementCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    if payload.interaction_type not in ENGAGEMENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported engagement type")

    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    current_user = _optional_user_from_request(request, db)
    session_id = (payload.session_id or "").strip()[:128] or None

    if not current_user and not session_id:
        raise HTTPException(status_code=400, detail="A guest session ID is required")

    engagement = models.ProductEngagement(
        product_id=payload.product_id,
        user_id=current_user.id if current_user else None,
        session_id=session_id,
        interaction_type=payload.interaction_type,
        view_started_at=payload.view_started_at,
        view_ended_at=payload.view_ended_at,
        duration_seconds=_safe_duration(payload.duration_seconds),
    )
    db.add(engagement)
    db.commit()

    return {"message": "Engagement tracked"}


@router.get("/dashboard")
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    del current_user

    users = db.query(models.User).all()
    products = db.query(models.Product).all()
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
    order_items = db.query(models.OrderItem).all()
    engagements = db.query(models.ProductEngagement).all()

    total_users = len(users)
    total_customers = len([user for user in users if user.role == "user"])
    total_orders = len(orders)
    total_revenue = sum(float(order.total_price or 0) for order in orders)
    avg_order_value = total_revenue / total_orders if total_orders else 0

    product_by_id = {product.id: product for product in products}
    sales_by_product = defaultdict(lambda: {"quantity": 0, "revenue": 0.0})
    for item in order_items:
        quantity = int(item.quantity or 0)
        product = product_by_id.get(item.product_id)
        sales_by_product[item.product_id]["quantity"] += quantity
        sales_by_product[item.product_id]["revenue"] += quantity * float(product.base_price or 0 if product else 0)

    sales_rows = [
        _product_snapshot(
            product,
            sales_by_product[product.id]["quantity"],
            sales_by_product[product.id]["revenue"],
        )
        for product in products
    ]
    all_selling_products = sorted(sales_rows, key=lambda row: row["sold_quantity"], reverse=True)
    top_selling_products = all_selling_products[:5]
    low_selling_products = sorted(sales_rows, key=lambda row: (row["sold_quantity"], row["name"]))[:5]

    status_counts = defaultdict(int)
    for order in orders:
        status_counts[order.status or "pending"] += 1

    engagement_by_product = defaultdict(
        lambda: {
            "page_views": 0,
            "description_views": 0,
            "unique_users": set(),
            "unique_sessions": set(),
            "duration_total": 0.0,
            "view_durations": [],
            "model_3d_seconds": 0.0,
            "customization_seconds": 0.0,
            "logged_user_views": defaultdict(int),
        }
    )
    interaction_totals = defaultdict(lambda: {"count": 0, "duration": 0.0})

    for event in engagements:
        product_bucket = engagement_by_product[event.product_id]
        duration = _safe_duration(event.duration_seconds)
        interaction_totals[event.interaction_type]["count"] += 1
        interaction_totals[event.interaction_type]["duration"] += duration

        if event.user_id:
            product_bucket["unique_users"].add(event.user_id)
        if event.session_id:
            product_bucket["unique_sessions"].add(event.session_id)

        if event.interaction_type == "page_view":
            product_bucket["page_views"] += 1
            product_bucket["duration_total"] += duration
            product_bucket["view_durations"].append(duration)
            if event.user_id:
                product_bucket["logged_user_views"][event.user_id] += 1
        elif event.interaction_type == "description_view":
            product_bucket["description_views"] += 1
        elif event.interaction_type == "3d_view":
            product_bucket["model_3d_seconds"] += duration
        elif event.interaction_type in {"customization_start", "customization_end"}:
            product_bucket["customization_seconds"] += duration

    engagement_rows = []
    for product in products:
        bucket = engagement_by_product[product.id]
        view_count = bucket["page_views"]
        unique_viewers = len(bucket["unique_users"] | bucket["unique_sessions"])
        avg_duration = sum(bucket["view_durations"]) / len(bucket["view_durations"]) if bucket["view_durations"] else 0
        repeat_logged_in_views = sum(max(0, count - 1) for count in bucket["logged_user_views"].values())
        engagement_rows.append({
            "product_id": product.id,
            "name": product.name,
            "sku": product.sku,
            "total_views": view_count,
            "unique_viewers": unique_viewers,
            "repeat_logged_in_views": repeat_logged_in_views,
            "description_views": bucket["description_views"],
            "avg_duration_seconds": round(avg_duration, 1),
            "total_duration_seconds": round(bucket["duration_total"], 1),
            "model_3d_seconds": round(bucket["model_3d_seconds"], 1),
            "customization_seconds": round(bucket["customization_seconds"], 1),
        })

    all_viewed_products = sorted(engagement_rows, key=lambda row: row["total_views"], reverse=True)
    most_viewed_products = all_viewed_products[:5]
    least_viewed_products = sorted(engagement_rows, key=lambda row: (row["total_views"], row["name"]))[:5]
    product_engagement_table = sorted(
        engagement_rows,
        key=lambda row: (row["total_views"], row["total_duration_seconds"]),
        reverse=True,
    )

    user_order_counts = defaultdict(lambda: {"orders": 0, "revenue": 0.0})
    for order in orders:
        user_order_counts[order.user_id]["orders"] += 1
        user_order_counts[order.user_id]["revenue"] += float(order.total_price or 0)

    user_engagement_counts = defaultdict(int)
    for event in engagements:
        if event.user_id:
            user_engagement_counts[event.user_id] += 1

    users_by_id = {user.id: user for user in users}
    customer_rows = []
    for user in users:
        counts = user_order_counts[user.id]
        customer_rows.append({
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "orders": counts["orders"],
            "revenue": _currency(counts["revenue"]),
            "engagements": user_engagement_counts[user.id],
            "created_at": (user.created_at or datetime.utcnow()).isoformat(),
        })
    active_customers = [
        row for row in sorted(
            customer_rows,
            key=lambda row: (row["orders"], row["engagements"], row["revenue"]),
            reverse=True,
        )
        if row["orders"] or row["engagements"]
    ][:5]

    all_orders = [
        {
            "id": order.id,
            "total": _currency(order.total_price),
            "status": order.status,
            "user_id": order.user_id,
            "customer": users_by_id.get(order.user_id).name if users_by_id.get(order.user_id) else "Unknown",
            "created_at": (order.created_at or datetime.utcnow()).isoformat(),
        }
        for order in orders
    ]
    recent_orders = all_orders[:8]

    return {
        "total_users": total_users,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "total_revenue": _currency(total_revenue),
        "avg_order_value": _currency(avg_order_value),
        "total_product_views": sum(row["total_views"] for row in engagement_rows),
        "avg_product_view_seconds": round(
            sum(row["total_duration_seconds"] for row in engagement_rows) / max(sum(row["total_views"] for row in engagement_rows), 1),
            1,
        ),
        "revenue_trend": _series_for_last_days(orders, 30),
        "order_status_breakdown": [
            {"status": status_name, "count": count}
            for status_name, count in sorted(status_counts.items())
        ],
        "top_selling_products": top_selling_products,
        "low_selling_products": low_selling_products,
        "all_selling_products": all_selling_products,
        "all_viewed_products": all_viewed_products,
        "most_viewed_products": most_viewed_products,
        "least_viewed_products": least_viewed_products,
        "product_engagement_table": product_engagement_table,
        "recent_orders": recent_orders,
        "all_orders": all_orders,
        "active_customers": active_customers,
        "customers": customer_rows,
        "customization_summary": {
            "model_3d_events": interaction_totals["3d_view"]["count"],
            "model_3d_seconds": round(interaction_totals["3d_view"]["duration"], 1),
            "customization_events": interaction_totals["customization_start"]["count"] + interaction_totals["customization_end"]["count"],
            "customization_seconds": round(
                interaction_totals["customization_start"]["duration"] + interaction_totals["customization_end"]["duration"],
                1,
            ),
            "description_views": interaction_totals["description_view"]["count"],
        },
    }
