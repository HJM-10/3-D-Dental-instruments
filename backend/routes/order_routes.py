from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import models, schemas
from database import get_db
from utils.auth import get_current_user, get_current_admin
import os
import uuid
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

router = APIRouter(prefix="/orders", tags=["orders"])

class OrderStatusUpdate(BaseModel):
    status: str

@router.post("/create", response_model=schemas.OrderResponse)
def create_order(order_req: schemas.OrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cart = db.query(models.Cart).filter(models.Cart.user_id == current_user.id).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    total_price = 0
    for item in cart.items:
        total_price += item.product.base_price * item.quantity
        
    new_order = models.Order(
        user_id=current_user.id,
        total_price=total_price,
        status="pending_approval",
        contact_method=order_req.contact_method,
        contact_value=order_req.contact_value
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    for item in cart.items:
        order_item = models.OrderItem(
            order_id=new_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            configuration=item.configuration
        )
        db.add(order_item)
        db.delete(item) # remove from cart
        
    db.commit()
    db.refresh(new_order)
    
    # Placeholder for Email + WhatsApp notifications
    print(f"Notification: New order placed. Order ID {new_order.id}")
    
    return new_order

@router.post("/custom", response_model=schemas.OrderResponse)
def create_custom_order(
    request: schemas.CustomOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    product = db.query(models.Product).filter(models.Product.id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_order = models.Order(
        user_id=current_user.id,
        total_price=float(product.base_price * len(request.slots)) if product.base_price else 0.0,
        status="pending_quote",
        contact_method="email", # default for custom quotes if not specified
        contact_value=current_user.email
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    order_item = models.OrderItem(
        order_id=new_order.id,
        product_id=product.id,
        quantity=1,
        configuration={"type": "custom_kit", "slots": request.slots, "display_slots": request.display_slots}
    )
    db.add(order_item)
    db.commit()

    # Generate PDF
    WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    try:
        from routes.blender_routes import GENERATED_DIR
    except ImportError:
        GENERATED_DIR = os.path.join(WORKSPACE_ROOT, "generated")
        os.makedirs(GENERATED_DIR, exist_ok=True)

    pdf_filename = f"quote_request_{new_order.id}_{uuid.uuid4().hex[:8]}.pdf"
    pdf_path = os.path.join(GENERATED_DIR, pdf_filename)

    # New SimpleDocTemplate layout
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    # Create watermark image once
    watermark_path = None
    logo_path = os.path.abspath(os.path.join(WORKSPACE_ROOT, "frontend", "public", "logo.png"))
    if os.path.exists(logo_path):
        try:
            from PIL import Image as PILImage
            with PILImage.open(logo_path) as pil_img:
                if pil_img.mode != 'RGBA':
                    pil_img = pil_img.convert('RGBA')
                alpha = pil_img.split()[3]
                alpha = alpha.point(lambda p: p * 0.15) # 15% opacity
                pil_img.putalpha(alpha)
                watermark_path = os.path.join(GENERATED_DIR, "watermark_tmp.png")
                pil_img.save(watermark_path, "PNG")
        except Exception as e:
            print("Error making watermark:", e)

    def draw_background(canvas_obj, doc_obj):
        canvas_obj.saveState()
        
        # Blue border lines (rectangular)
        canvas_obj.setStrokeColorRGB(0.13, 0.38, 0.94)
        canvas_obj.setLineWidth(4)
        canvas_obj.rect(20, 20, 572, 752)
        
        # Watermark
        if watermark_path and os.path.exists(watermark_path):
            try:
                from reportlab.lib.utils import ImageReader
                img = ImageReader(watermark_path)
                iw, ih = img.getSize()
                aspect = ih / float(iw)
                draw_w = 400
                draw_h = draw_w * aspect
                canvas_obj.drawImage(watermark_path, 306 - draw_w/2, 396 - draw_h/2, width=draw_w, height=draw_h, mask='auto')
            except Exception:
                pass
                
        canvas_obj.restoreState()

    doc = SimpleDocTemplate(pdf_path, pagesize=letter, leftMargin=50, rightMargin=50, topMargin=50, bottomMargin=50)
    elements = []
    styles = getSampleStyleSheet()
    
    # Top Header Logo
    if os.path.exists(logo_path):
        try:
            from reportlab.lib.utils import ImageReader
            from reportlab.platypus import Image
            img = ImageReader(logo_path)
            iw, ih = img.getSize()
            aspect = ih / float(iw)
            draw_w = 120
            draw_h = draw_w * aspect
            elements.append(Image(logo_path, width=draw_w, height=draw_h))
            elements.append(Spacer(1, 20))
        except Exception:
            pass
    
    # Title
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], alignment=TA_CENTER)
    elements.append(Paragraph(f"Custom Quote Request - Order #{new_order.id}", title_style))
    elements.append(Spacer(1, 20))
    
    # Details
    from datetime import timezone
    date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    elements.append(Paragraph(f"<b>Date:</b> {date_str} UTC", styles['Normal']))
    elements.append(Paragraph(f"<b>Client:</b> {current_user.name} ({current_user.email})", styles['Normal']))
    elements.append(Paragraph(f"<b>Product:</b> {product.name}", styles['Normal']))
    elements.append(Paragraph(f"<b>Estimated Total:</b> ${new_order.total_price:.2f}", styles['Normal']))
    elements.append(Spacer(1, 25))
    
    elements.append(Paragraph(f"<b>Configured Slots:</b>", styles['Heading3']))
    elements.append(Spacer(1, 10))
    
    table_data = [["Slot(s)", "Configuration Details"]]
    
    slots_to_print = request.display_slots if request.display_slots and len(request.display_slots) > 0 else request.slots
    
    # Load schema if available for the raw slots fallback
    import json
    schema = None
    try:
        from routes.blender_routes import TEMPLATES_DIR
        schema_path = os.path.join(TEMPLATES_DIR, str(product.id), "schema.json")
        if os.path.exists(schema_path):
            with open(schema_path, "r") as f:
                schema = json.load(f)
    except Exception:
        pass

    UNIT_SCALERS = {
        'none': {'suffix': ''},
        'm': {'suffix': ' m'},
        'cm': {'suffix': ' cm'},
        'mm': {'suffix': ' mm'},
        'in': {'suffix': ' in'},
        'ft': {'suffix': ' ft'},
        'rad': {'suffix': ' rad'},
        'deg': {'suffix': '°'}
    }

    # First, process and group all slots by their printed output
    grouped_slots = {}
    for slot_name, params in slots_to_print.items():
        if not params:
            continue
            
        filtered_entries = []
        if request.display_slots and len(request.display_slots) > 0:
            filtered_entries = [f"<b>{k}</b>: {v}" for k, v in params.items()]
        else:
            if schema and "inputs" in schema:
                for input_def in schema["inputs"]:
                    if input_def.get("hidden"):
                        continue
                    raw_val = params.get(input_def["id"])
                    if raw_val is None:
                        continue
                        
                    unit_key = input_def.get("unit", "none")
                    suffix = UNIT_SCALERS.get(unit_key, {}).get("suffix", "")
                    
                    scaler = 1
                    if unit_key == 'cm': scaler = 100
                    elif unit_key == 'mm': scaler = 1000
                    elif unit_key == 'in': scaler = 39.3701
                    elif unit_key == 'ft': scaler = 3.28084
                    elif unit_key == 'deg': scaler = 57.2957795
                    
                    if isinstance(raw_val, (int, float)):
                        display_val = f"{raw_val * scaler:.2f}{suffix}"
                    else:
                        display_val = str(raw_val)
                        
                    filtered_entries.append(f"<b>{input_def['name']}</b>: {display_val}")
            else:
                filtered_params = {k: v for k, v in params.items() if "Smooth by Angle" not in k and "Boolean" not in k}
                if not filtered_params:
                    filtered_params = params
                filtered_entries = [f"<b>{k.split('::')[-1].replace('Socket_', 'Param ')}</b>: {v}" for k, v in filtered_params.items()]

        if not filtered_entries:
            continue
            
        hash_key = json.dumps(filtered_entries)
        if hash_key not in grouped_slots:
            grouped_slots[hash_key] = {"slots": [], "entries": filtered_entries}
        grouped_slots[hash_key]["slots"].append(slot_name)
        
    for group in grouped_slots.values():
        slot_names = group["slots"]
        
        if len(slot_names) == 1:
            slot_label = f"<b>{slot_names[0]}</b>"
        elif len(slot_names) <= 3:
            slot_label = f"<b>{', '.join(slot_names)}</b>"
        else:
            slot_label = f"<b>{len(slot_names)} slots</b><br/>(e.g. {', '.join(slot_names[:3])})"
            
        param_str = "<br/>".join(group["entries"])
        
        # Use Paragraph to allow formatting and wrapping in table
        table_data.append([Paragraph(slot_label, styles['Normal']), Paragraph(param_str, styles['Normal'])])
        
    if len(table_data) > 1:
        t = Table(table_data, colWidths=[150, 350], repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#3a7bd5")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8f9fa")),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#dddddd")),
            ('PADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(t)

    doc.build(elements, onFirstPage=draw_background, onLaterPages=draw_background)

    pdf_url = f"/generated/{pdf_filename}"
    order_item.configuration["pdf_url"] = pdf_url
    
    # Needs to be re-assigned because JSON cols in sqlalchemy sometimes don't detect in-place dict updates
    db.execute(
        models.OrderItem.__table__.update().where(models.OrderItem.id == order_item.id).values(configuration=order_item.configuration)
    )
    db.commit()
    db.refresh(new_order)

    print(f"Notification: Custom quote requested. Order ID {new_order.id}. PDF generated at {pdf_url}")
    return new_order


@router.get("/", response_model=List[schemas.OrderResponse])
def get_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role in {"admin", "super_admin"}:
        return db.query(models.Order).all()
    return db.query(models.Order).filter(models.Order.user_id == current_user.id).all()

@router.put("/{id}/status", response_model=schemas.OrderResponse)
def update_order_status(id: int, status_update: OrderStatusUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    order = db.query(models.Order).filter(models.Order.id == id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.status = status_update.status
    db.commit()
    db.refresh(order)
    return order

@router.put("/{id}/review", response_model=schemas.OrderResponse)
def review_order(id: int, review: schemas.OrderReview, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    order = db.query(models.Order).filter(models.Order.id == id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if review.action == "approve":
        order.status = "approved"
    elif review.action == "deny":
        order.status = "denied"
    elif review.action == "requote":
        if review.new_price is None:
            raise HTTPException(status_code=400, detail="New price required for requote")
        order.total_price = review.new_price
        order.status = "requoted"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    db.commit()
    db.refresh(order)
    return order

@router.put("/{id}/accept-requote", response_model=schemas.OrderResponse)
def accept_requote(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    order = db.query(models.Order).filter(models.Order.id == id, models.Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.status != "requoted" and order.status != "pending_quote":
        raise HTTPException(status_code=400, detail="Order is not in a state to be accepted")
        
    order.status = "approved"
    db.commit()
    db.refresh(order)
    return order
