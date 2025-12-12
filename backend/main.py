# ========================================
# FILE: main.py (FastAPI Entry Point with MongoDB)
# ========================================

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
import bcrypt
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from decimal import Decimal
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Powerloom Production Dashboard API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

security = HTTPBearer()

# ========================================
# MongoDB Connection
# ========================================

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    print("WARNING: MONGODB_URI not set!")
    MONGODB_URI = "mongodb://localhost:27017/"

# Add timeout and retry settings for cloud MongoDB
client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=5000,  # 5 second timeout
    connectTimeoutMS=10000,
    socketTimeoutMS=10000,
    retryWrites=True
)
db = client.powerloom_db

# Collections
customers_col = db.customers
workshops_col = db.workshops
machines_col = db.machines
design_presets_col = db.design_presets
beams_col = db.beams
deliveries_col = db.deliveries
admin_users_col = db.admin_users

# Helper function to convert ObjectId and datetime to JSON-serializable types
def serialize_doc(doc):
    if doc is None:
        return None
    
    # Make a copy to avoid modifying the original
    result = {}
    
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        else:
            result[key] = value
    
    return result

def serialize_docs(docs):
    return [serialize_doc(doc) for doc in docs]

# ========================================
# Pydantic Models
# ========================================

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class BeamStartCreate(BaseModel):
    beam_number: str
    customer_id: str
    machine_id: str
    total_beam_meters: float
    meters_per_piece: float
    start_date: str

class DeliveryCreate(BaseModel):
    beam_id: str
    delivery_date: str
    design_name: str
    price_per_piece: float
    good_pieces: int
    damaged_pieces: int
    notes: Optional[str] = None

class CustomerCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class WorkshopCreate(BaseModel):
    name: str
    location: str
    machine_count: int
    workshop_type: str

class DesignPresetCreate(BaseModel):
    price: float
    label: str

class MachineCreate(BaseModel):
    workshop_id: str
    machine_number: int
    fabric_type: str

class ResetDatabaseRequest(BaseModel):
    admin_password: str

# ========================================
# Auth Helper Functions
# ========================================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ========================================
# AUTH ENDPOINTS
# ========================================

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Admin login endpoint"""
    try:
        user = admin_users_col.find_one({"username": request.username})
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        if not user.get('is_active', True):
            raise HTTPException(status_code=401, detail="Account is disabled")
        
        # Verify password
        if not bcrypt.checkpw(request.password.encode(), user['password_hash'].encode()):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Update last login
        admin_users_col.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # Generate token
        token_data = {"sub": user['username']}
        access_token = create_access_token(token_data)
        
        return TokenResponse(access_token=access_token, token_type="bearer")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/api/auth/reset-password")
async def reset_password(username: str, new_password: str, admin: str = Depends(verify_token)):
    hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt())
    admin_users_col.update_one(
        {"username": username},
        {"$set": {"password_hash": hashed.decode()}}
    )
    return {"message": "Password reset successful"}

@app.post("/api/admin/reset-database")
async def reset_database(request: ResetDatabaseRequest, admin: str = Depends(verify_token)):
    """Reset database - Delete ALL data except admin credentials"""
    try:
        # Verify admin password
        admin_user = admin_users_col.find_one({"username": "admin"})
        
        if not admin_user or not bcrypt.checkpw(request.admin_password.encode(), admin_user['password_hash'].encode()):
            raise HTTPException(status_code=401, detail="Invalid admin password")
        
        # Delete all data
        deliveries_col.delete_many({})
        beams_col.delete_many({})
        design_presets_col.delete_many({})
        machines_col.delete_many({})
        workshops_col.delete_many({})
        customers_col.delete_many({})
        
        return {"message": "Database reset successfully. All data deleted."}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ========================================
# DASHBOARD ENDPOINTS
# ========================================

@app.get("/api/dashboard/overview")
async def get_dashboard_overview(start_date: str = None, end_date: str = None, fabric_type: str = None):
    try:
        # Active beams count
        active_beams = beams_col.count_documents({"status": "active"})
        
        # Build date filter
        date_filter = {}
        if start_date and end_date:
            date_filter = {"delivery_date": {"$gte": start_date, "$lte": end_date}}
        elif start_date:
            date_filter = {"delivery_date": {"$gte": start_date}}
        elif end_date:
            date_filter = {"delivery_date": {"$lte": end_date}}
        else:
            # Current month
            now = datetime.now()
            first_day = now.replace(day=1).strftime("%Y-%m-%d")
            date_filter = {"delivery_date": {"$gte": first_day}}
        
        # Get all deliveries with date filter
        pipeline = [{"$match": date_filter}]
        
        if fabric_type:
            # Join with beams and machines to filter by fabric type
            pipeline.extend([
                {"$lookup": {"from": "beams", "localField": "beam_id", "foreignField": "_id", "as": "beam"}},
                {"$unwind": "$beam"},
                {"$lookup": {"from": "machines", "localField": "beam.machine_id", "foreignField": "_id", "as": "machine"}},
                {"$unwind": "$machine"},
                {"$match": {"machine.fabric_type": fabric_type}}
            ])
        
        pipeline.append({
            "$group": {
                "_id": None,
                "total_pieces": {"$sum": "$good_pieces"},
                "total_damaged": {"$sum": "$damaged_pieces"},
                "pending_amount": {"$sum": "$total_amount"}
            }
        })
        
        result = list(deliveries_col.aggregate(pipeline))
        production = result[0] if result else {"total_pieces": 0, "total_damaged": 0, "pending_amount": 0}
        
        # Workshop-wise production
        workshop_pipeline = [
            {"$match": date_filter},
            {"$lookup": {"from": "beams", "localField": "beam_id", "foreignField": "_id", "as": "beam"}},
            {"$unwind": "$beam"},
            {"$lookup": {"from": "workshops", "localField": "beam.workshop_id", "foreignField": "_id", "as": "workshop"}},
            {"$unwind": "$workshop"},
            {"$group": {"_id": "$workshop.name", "total_pieces": {"$sum": "$good_pieces"}}},
            {"$project": {"workshop_name": "$_id", "total_pieces": 1, "_id": 0}}
        ]
        workshop_production = list(deliveries_col.aggregate(workshop_pipeline))
        
        # Customer-wise summary
        customer_pipeline = [
            {"$match": date_filter},
            {"$lookup": {"from": "beams", "localField": "beam_id", "foreignField": "_id", "as": "beam"}},
            {"$unwind": "$beam"},
            {"$lookup": {"from": "customers", "localField": "beam.customer_id", "foreignField": "_id", "as": "customer"}},
            {"$unwind": "$customer"},
            {"$group": {
                "_id": "$customer.name",
                "total_pieces": {"$sum": "$good_pieces"},
                "total_amount": {"$sum": "$total_amount"}
            }},
            {"$project": {"customer_name": "$_id", "total_pieces": 1, "total_amount": 1, "_id": 0}}
        ]
        customer_summary = list(deliveries_col.aggregate(customer_pipeline))
        
        return {
            "active_beams": active_beams,
            "total_pieces_this_month": production.get('total_pieces', 0),
            "total_damaged_this_month": production.get('total_damaged', 0),
            "pending_amount_this_month": float(production.get('pending_amount', 0)),
            "workshop_production": workshop_production,
            "customer_summary": customer_summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# ANALYTICS ENDPOINTS
# ========================================

@app.get("/api/analytics/production-trend")
async def get_production_trend(days: int = 30, fabric_type: str = None):
    """Get daily production trend with workshop breakdown"""
    try:
        from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        pipeline = [
            {"$match": {"delivery_date": {"$gte": from_date}}},
            {"$lookup": {"from": "beams", "localField": "beam_id", "foreignField": "_id", "as": "beam"}},
            {"$unwind": "$beam"},
            {"$lookup": {"from": "workshops", "localField": "beam.workshop_id", "foreignField": "_id", "as": "workshop"}},
            {"$unwind": "$workshop"}
        ]
        
        if fabric_type:
            pipeline.append({"$match": {"beam.fabric_type": fabric_type}})
        
        pipeline.extend([
            {"$group": {
                "_id": {"date": "$delivery_date", "workshop": "$workshop.name"},
                "total_pieces": {"$sum": {"$add": ["$good_pieces", "$damaged_pieces"]}}
            }},
            {"$sort": {"_id.date": 1}}
        ])
        
        results = list(deliveries_col.aggregate(pipeline))
        
        # Transform data
        daily_data = {}
        workshops = set()
        
        for row in results:
            date = row['_id']['date']
            workshop = row['_id']['workshop']
            workshops.add(workshop)
            
            if date not in daily_data:
                daily_data[date] = {'date': date}
            daily_data[date][workshop] = row['total_pieces']
        
        # Fill missing workshops with 0
        formatted_data = []
        for date in sorted(daily_data.keys()):
            data = daily_data[date]
            for workshop in workshops:
                if workshop not in data:
                    data[workshop] = 0
            formatted_data.append(data)
        
        return {"data": formatted_data, "workshops": list(workshops)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/fabric-distribution")
async def get_fabric_distribution():
    """Get Product Type distribution"""
    try:
        pipeline = [
            {"$lookup": {"from": "deliveries", "localField": "_id", "foreignField": "beam_id", "as": "deliveries"}},
            {"$group": {
                "_id": "$fabric_type",
                "value": {"$sum": {"$reduce": {
                    "input": "$deliveries",
                    "initialValue": 0,
                    "in": {"$add": ["$$value", {"$add": ["$$this.good_pieces", "$$this.damaged_pieces"]}]}
                }}},
                "beam_count": {"$sum": 1}
            }},
            {"$project": {"name": "$_id", "value": 1, "beams": "$beam_count", "_id": 0}}
        ]
        
        fabric_data = list(beams_col.aggregate(pipeline))
        return {"data": fabric_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/machine-quality")
async def get_machine_quality(fabric_type: str = None):
    """Get machine-wise quality data"""
    try:
        pipeline = [
            {"$lookup": {"from": "beams", "localField": "_id", "foreignField": "machine_id", "as": "beams"}},
            {"$lookup": {"from": "workshops", "localField": "workshop_id", "foreignField": "_id", "as": "workshop"}},
            {"$unwind": {"path": "$workshop", "preserveNullAndEmptyArrays": True}}
        ]
        
        if fabric_type:
            pipeline.append({"$match": {"fabric_type": fabric_type}})
        
        pipeline.extend([
            {"$lookup": {"from": "deliveries", "localField": "beams._id", "foreignField": "beam_id", "as": "deliveries"}},
            {"$project": {
                "workshop_name": "$workshop.name",
                "machine_number": 1,
                "machine_name": {"$concat": ["$workshop.name", " M", {"$toString": "$machine_number"}]},
                "good_pieces": {"$sum": "$deliveries.good_pieces"},
                "damaged_pieces": {"$sum": "$deliveries.damaged_pieces"},
                "total_pieces": {"$sum": {"$map": {
                    "input": "$deliveries",
                    "as": "d",
                    "in": {"$add": ["$$d.good_pieces", "$$d.damaged_pieces"]}
                }}}
            }},
            {"$match": {"total_pieces": {"$gt": 0}}},
            {"$sort": {"workshop_name": 1, "machine_number": 1}}
        ])
        
        results = list(machines_col.aggregate(pipeline))
        return {"data": [serialize_doc(r) for r in results]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/workshop-machine-production")
async def get_workshop_machine_production(fabric_type: str = None):
    """Get machine-wise production data for each workshop - only machines with active beams"""
    try:
        # Start from beams collection and filter for active beams only
        beam_match = {"status": "active"}
        if fabric_type:
            beam_match["fabric_type"] = fabric_type
        
        pipeline = [
            {"$match": beam_match},
            {"$lookup": {"from": "machines", "localField": "machine_id", "foreignField": "_id", "as": "machine"}},
            {"$unwind": "$machine"},
            {"$lookup": {"from": "workshops", "localField": "machine.workshop_id", "foreignField": "_id", "as": "workshop"}},
            {"$unwind": "$workshop"},
            {"$lookup": {"from": "deliveries", "localField": "_id", "foreignField": "beam_id", "as": "deliveries"}},
            {"$project": {
                "workshop_name": "$workshop.name",
                "machine_number": "$machine.machine_number",
                "total_production": {"$sum": {"$map": {
                    "input": "$deliveries",
                    "as": "d",
                    "in": {"$add": ["$$d.good_pieces", "$$d.damaged_pieces"]}
                }}}
            }},
            {"$group": {
                "_id": "$workshop_name",
                "machines": {"$push": {"machine_number": "$machine_number", "production": "$total_production"}}
            }},
            {"$project": {"workshop_name": "$_id", "machines": 1, "_id": 0}},
            {"$sort": {"workshop_name": 1}}
        ]
        
        results = list(beams_col.aggregate(pipeline))
        return {"data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# REPORT ENDPOINTS
# ========================================

@app.get("/api/reports/beam-details")
async def get_beam_report(start_date: str, end_date: str):
    """Get beam report for date range"""
    try:
        pipeline = [
            {"$match": {
                "$or": [
                    {"start_date": {"$gte": start_date, "$lte": end_date}},
                    {"end_date": {"$gte": start_date, "$lte": end_date}},
                    {"$and": [{"start_date": {"$lte": start_date}}, {"end_date": {"$gte": end_date}}]},
                    {"$and": [{"start_date": {"$lte": start_date}}, {"status": "active"}]}
                ]
            }},
            {"$lookup": {"from": "workshops", "localField": "workshop_id", "foreignField": "_id", "as": "workshop"}},
            {"$lookup": {"from": "customers", "localField": "customer_id", "foreignField": "_id", "as": "customer"}},
            {"$lookup": {"from": "machines", "localField": "machine_id", "foreignField": "_id", "as": "machine"}},
            {"$lookup": {"from": "deliveries", "localField": "_id", "foreignField": "beam_id", "as": "deliveries"}},
            {"$unwind": {"path": "$workshop", "preserveNullAndEmptyArrays": True}},
            {"$unwind": {"path": "$customer", "preserveNullAndEmptyArrays": True}},
            {"$unwind": {"path": "$machine", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "beam_number": 1,
                "fabric_type": 1,
                "total_beam_meters": 1,
                "start_date": 1,
                "end_date": 1,
                "status": 1,
                "workshop": "$workshop.name",
                "customer": "$customer.name",
                "machine_number": "$machine.machine_number",
                "total_good": {"$sum": "$deliveries.good_pieces"},
                "total_damaged": {"$sum": "$deliveries.damaged_pieces"},
                "total_pieces": {"$sum": {"$map": {"input": "$deliveries", "as": "d", "in": {"$add": ["$$d.good_pieces", "$$d.damaged_pieces"]}}}},
                "total_amount": {"$sum": "$deliveries.total_amount"}
            }},
            {"$sort": {"start_date": -1}}
        ]
        
        beams = list(beams_col.aggregate(pipeline))
        return {"beams": [serialize_doc(b) for b in beams]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports/delivery-details")
async def get_delivery_report(start_date: str, end_date: str, workshop_id: str = None):
    """Get delivery report for date range"""
    try:
        match_filter = {"delivery_date": {"$gte": start_date, "$lte": end_date}}
        
        pipeline = [
            {"$match": match_filter},
            {"$lookup": {"from": "beams", "localField": "beam_id", "foreignField": "_id", "as": "beam"}},
            {"$unwind": {"path": "$beam", "preserveNullAndEmptyArrays": True}},
            {"$lookup": {"from": "workshops", "localField": "beam.workshop_id", "foreignField": "_id", "as": "workshop"}},
            {"$lookup": {"from": "customers", "localField": "beam.customer_id", "foreignField": "_id", "as": "customer"}},
            {"$lookup": {"from": "machines", "localField": "beam.machine_id", "foreignField": "_id", "as": "machine"}},
            {"$unwind": {"path": "$workshop", "preserveNullAndEmptyArrays": True}},
            {"$unwind": {"path": "$customer", "preserveNullAndEmptyArrays": True}},
            {"$unwind": {"path": "$machine", "preserveNullAndEmptyArrays": True}},
        ]
        
        if workshop_id:
            pipeline.append({"$match": {"workshop._id": ObjectId(workshop_id)}})
        
        pipeline.extend([
            {"$project": {
                "delivery_date": 1,
                "design_name": 1,
                "price_per_piece": 1,
                "good_pieces": 1,
                "damaged_pieces": 1,
                "meters_used": 1,
                "total_amount": 1,
                "notes": 1,
                "beam_number": "$beam.beam_number",
                "fabric_type": "$beam.fabric_type",
                "workshop": "$workshop.name",
                "customer": "$customer.name",
                "machine_number": "$machine.machine_number"
            }},
            {"$sort": {"delivery_date": -1}}
        ])
        
        deliveries = list(deliveries_col.aggregate(pipeline))
        return {"deliveries": [serialize_doc(d) for d in deliveries]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# BEAM ENDPOINTS
# ========================================

@app.get("/api/beams")
async def get_all_beams(status: str = "active"):
    try:
        pipeline = [
            {"$match": {"status": status}},
            {"$lookup": {"from": "workshops", "localField": "workshop_id", "foreignField": "_id", "as": "workshop"}},
            {"$lookup": {"from": "customers", "localField": "customer_id", "foreignField": "_id", "as": "customer"}},
            {"$lookup": {"from": "machines", "localField": "machine_id", "foreignField": "_id", "as": "machine"}},
            {"$lookup": {"from": "deliveries", "localField": "_id", "foreignField": "beam_id", "as": "deliveries"}},
            {"$unwind": {"path": "$workshop", "preserveNullAndEmptyArrays": True}},
            {"$unwind": {"path": "$customer", "preserveNullAndEmptyArrays": True}},
            {"$unwind": {"path": "$machine", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "beam_number": 1,
                "fabric_type": 1,
                "total_beam_meters": 1,
                "meters_per_piece": 1,
                "start_date": 1,
                "end_date": 1,
                "status": 1,
                "notes": 1,
                "workshop_name": "$workshop.name",
                "customer_name": "$customer.name",
                "machine_number": {"$ifNull": ["$machine.machine_number", "N/A"]},
                "total_good_pieces": {"$sum": "$deliveries.good_pieces"},
                "total_damaged_pieces": {"$sum": "$deliveries.damaged_pieces"},
                "total_meters_used": {"$sum": "$deliveries.meters_used"},
                "remaining_meters": {"$subtract": ["$total_beam_meters", {"$sum": "$deliveries.meters_used"}]}
            }},
            {"$sort": {"start_date": -1}}
        ]
        
        beams = list(beams_col.aggregate(pipeline))
        return {"beams": [serialize_doc(b) for b in beams]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/beams/{beam_id}")
async def get_beam_details(beam_id: str):
    try:
        beam = beams_col.find_one({"_id": ObjectId(beam_id)})
        if not beam:
            raise HTTPException(status_code=404, detail="Beam not found")
        
        # Get related data
        workshop = workshops_col.find_one({"_id": beam.get("workshop_id")})
        customer = customers_col.find_one({"_id": beam.get("customer_id")})
        machine = machines_col.find_one({"_id": beam.get("machine_id")})
        
        beam["workshop_name"] = workshop["name"] if workshop else "N/A"
        beam["customer_name"] = customer["name"] if customer else "N/A"
        beam["machine_number"] = machine["machine_number"] if machine else "N/A"
        
        # Get deliveries
        deliveries = list(deliveries_col.find({"beam_id": ObjectId(beam_id)}).sort("delivery_date", -1))
        
        # Calculate totals
        total_good = sum(d.get("good_pieces", 0) for d in deliveries)
        total_damaged = sum(d.get("damaged_pieces", 0) for d in deliveries)
        total_meters_used = sum(d.get("meters_used", 0) for d in deliveries)
        total_amount = sum(d.get("total_amount", 0) for d in deliveries)
        
        remaining_meters = beam.get("total_beam_meters", 0) - total_meters_used
        estimated_pieces = remaining_meters / beam.get("meters_per_piece", 1) if beam.get("meters_per_piece", 0) > 0 else 0
        
        return {
            "beam": serialize_doc(beam),
            "deliveries": serialize_docs(deliveries),
            "totals": {
                "total_good": total_good,
                "total_damaged": total_damaged,
                "total_meters_used": total_meters_used,
                "total_amount": total_amount,
                "remaining_meters": remaining_meters,
                "estimated_pieces_remaining": int(estimated_pieces),
                "meter_usage_percentage": (total_meters_used / beam.get("total_beam_meters", 1) * 100) if beam.get("total_beam_meters", 0) > 0 else 0
            }
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid beam ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/beams/start")
async def start_new_beam(beam: BeamStartCreate, admin: str = Depends(verify_token)):
    try:
        # Get machine details
        machine = machines_col.find_one({"_id": ObjectId(beam.machine_id)})
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        # Check if machine already has active beam
        existing = beams_col.find_one({"machine_id": ObjectId(beam.machine_id), "status": "active"})
        if existing:
            raise HTTPException(status_code=400, detail=f"Machine already has an active beam '{existing['beam_number']}'")
        
        # Check for duplicate beam number
        if beams_col.find_one({"beam_number": beam.beam_number}):
            raise HTTPException(status_code=400, detail=f"Duplicate entry '{beam.beam_number}' for beam_number")
        
        # Create beam
        beam_doc = {
            "beam_number": beam.beam_number,
            "machine_id": ObjectId(beam.machine_id),
            "workshop_id": machine["workshop_id"],
            "customer_id": ObjectId(beam.customer_id),
            "fabric_type": machine.get("fabric_type", "veshti"),
            "total_beam_meters": beam.total_beam_meters,
            "meters_per_piece": beam.meters_per_piece,
            "start_date": beam.start_date,
            "end_date": None,
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = beams_col.insert_one(beam_doc)
        return {"message": "Beam started successfully", "beam_id": str(result.inserted_id)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/beams/{beam_id}/end")
async def end_beam(beam_id: str, admin: str = Depends(verify_token)):
    """End a beam manually"""
    try:
        beam = beams_col.find_one({"_id": ObjectId(beam_id)})
        if not beam:
            raise HTTPException(status_code=404, detail="Beam not found")
        
        if beam["status"] != "active":
            raise HTTPException(status_code=400, detail="Beam is already completed")
        
        beams_col.update_one(
            {"_id": ObjectId(beam_id)},
            {"$set": {"status": "completed", "end_date": datetime.now().strftime("%Y-%m-%d"), "updated_at": datetime.utcnow()}}
        )
        
        return {"message": "Beam ended successfully", "beam_id": beam_id}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid beam ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/beams/{beam_id}")
async def delete_beam(beam_id: str, admin: str = Depends(verify_token)):
    """Delete a beam"""
    try:
        result = beams_col.delete_one({"_id": ObjectId(beam_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Beam not found")
        
        # Also delete associated deliveries
        deliveries_col.delete_many({"beam_id": ObjectId(beam_id)})
        
        return {"message": "Beam deleted successfully"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid beam ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# DELIVERY ENDPOINTS
# ========================================

@app.post("/api/deliveries")
@app.post("/api/deliveries/add")
async def add_delivery(delivery: DeliveryCreate, admin: str = Depends(verify_token)):
    try:
        # Check beam exists
        beam = beams_col.find_one({"_id": ObjectId(delivery.beam_id)})
        if not beam:
            raise HTTPException(status_code=404, detail="Beam not found")
        
        # Calculate values
        total_pieces = delivery.good_pieces + delivery.damaged_pieces
        meters_used = total_pieces * beam.get("meters_per_piece", 0)
        total_amount = delivery.good_pieces * delivery.price_per_piece
        
        delivery_doc = {
            "beam_id": ObjectId(delivery.beam_id),
            "delivery_date": delivery.delivery_date,
            "design_name": delivery.design_name,
            "price_per_piece": delivery.price_per_piece,
            "good_pieces": delivery.good_pieces,
            "damaged_pieces": delivery.damaged_pieces,
            "meters_used": meters_used,
            "total_amount": total_amount,
            "notes": delivery.notes,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = deliveries_col.insert_one(delivery_doc)
        
        # Check if beam should be marked as completed
        total_meters_used = sum(d.get("meters_used", 0) for d in deliveries_col.find({"beam_id": ObjectId(delivery.beam_id)}))
        if total_meters_used >= beam.get("total_beam_meters", 0):
            beams_col.update_one(
                {"_id": ObjectId(delivery.beam_id)},
                {"$set": {"status": "completed", "end_date": datetime.now().strftime("%Y-%m-%d")}}
            )
        
        return {"message": "Delivery added successfully", "delivery_id": str(result.inserted_id)}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid beam ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/deliveries/{delivery_id}")
async def delete_delivery(delivery_id: str, admin: str = Depends(verify_token)):
    try:
        result = deliveries_col.delete_one({"_id": ObjectId(delivery_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Delivery not found")
        return {"message": "Delivery deleted successfully"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid delivery ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# WORKSHOP ENDPOINTS
# ========================================

@app.get("/api/workshops")
async def get_all_workshops():
    pipeline = [
        {"$match": {"is_active": {"$ne": False}}},
        {"$lookup": {
            "from": "machines",
            "localField": "_id",
            "foreignField": "workshop_id",
            "as": "machines"
        }},
        {"$addFields": {
            "actual_machine_count": {"$size": "$machines"}
        }},
        {"$project": {
            "machines": 0  # Remove the machines array from output
        }}
    ]
    workshops = list(workshops_col.aggregate(pipeline))
    return {"workshops": serialize_docs(workshops)}

@app.post("/api/workshops")
async def create_workshop(workshop: WorkshopCreate, admin: str = Depends(verify_token)):
    workshop_doc = {
        "name": workshop.name,
        "location": workshop.location,
        "machine_count": workshop.machine_count,
        "workshop_type": workshop.workshop_type,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = workshops_col.insert_one(workshop_doc)
    return {"message": "Workshop created successfully", "workshop_id": str(result.inserted_id)}

@app.delete("/api/workshops/{workshop_id}")
async def delete_workshop(workshop_id: str, admin: str = Depends(verify_token)):
    try:
        # Check for machines
        if machines_col.count_documents({"workshop_id": ObjectId(workshop_id)}) > 0:
            raise HTTPException(status_code=400, detail="Cannot delete workshop with existing machines")
        
        result = workshops_col.delete_one({"_id": ObjectId(workshop_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Workshop not found")
        return {"message": "Workshop deleted successfully"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid workshop ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workshops/{workshop_id}/machines")
async def get_workshop_machines(workshop_id: str):
    try:
        pipeline = [
            {"$match": {"workshop_id": ObjectId(workshop_id), "is_active": {"$ne": False}}},
            # Lookup active beams only
            {"$lookup": {
                "from": "beams",
                "let": {"machine_id": "$_id"},
                "pipeline": [
                    {"$match": {
                        "$expr": {"$eq": ["$machine_id", "$$machine_id"]},
                        "status": "active"
                    }}
                ],
                "as": "active_beams"
            }},
            # Get the first active beam (there should only be one)
            {"$addFields": {
                "active_beam": {"$arrayElemAt": ["$active_beams", 0]}
            }},
            # Lookup customer for the active beam
            {"$lookup": {
                "from": "customers",
                "localField": "active_beam.customer_id",
                "foreignField": "_id",
                "as": "customer"
            }},
            {"$addFields": {
                "customer": {"$arrayElemAt": ["$customer", 0]}
            }},
            # Lookup deliveries for the active beam
            {"$lookup": {
                "from": "deliveries",
                "localField": "active_beam._id",
                "foreignField": "beam_id",
                "as": "deliveries"
            }},
            # Calculate totals
            {"$addFields": {
                "meters_used": {"$sum": "$deliveries.meters_used"},
                "total_damaged": {"$sum": "$deliveries.damaged_pieces"},
                "total_good": {"$sum": "$deliveries.good_pieces"}
            }},
            # Project final fields
            {"$project": {
                "machine_number": 1,
                "fabric_type": {"$ifNull": ["$active_beam.fabric_type", "$fabric_type"]},
                "is_active": 1,
                "beam_id": "$active_beam._id",
                "beam_number": "$active_beam.beam_number",
                "customer_name": "$customer.name",
                "total_beam_meters": "$active_beam.total_beam_meters",
                "meters_used": 1,
                "remaining_meters": {
                    "$cond": {
                        "if": "$active_beam",
                        "then": {"$subtract": ["$active_beam.total_beam_meters", "$meters_used"]},
                        "else": 0
                    }
                },
                "total_damaged": 1,
                "total_good": 1
            }},
            {"$sort": {"machine_number": 1}}
        ]
        machines = list(machines_col.aggregate(pipeline))
        return {"machines": [serialize_doc(m) for m in machines]}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid workshop ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# MACHINE ENDPOINTS
# ========================================

@app.get("/api/machines/all")
async def get_all_machines():
    pipeline = [
        {"$match": {"is_active": {"$ne": False}}},
        {"$lookup": {"from": "workshops", "localField": "workshop_id", "foreignField": "_id", "as": "workshop"}},
        {"$unwind": {"path": "$workshop", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "machine_number": 1,
            "fabric_type": 1,
            "workshop_id": 1,
            "workshop_name": "$workshop.name",
            "is_active": 1
        }},
        {"$sort": {"workshop_name": 1, "machine_number": 1}}
    ]
    machines = list(machines_col.aggregate(pipeline))
    return {"machines": [serialize_doc(m) for m in machines]}

@app.post("/api/machines")
async def create_machine(machine: MachineCreate, admin: str = Depends(verify_token)):
    try:
        # Check if machine number already exists in workshop
        existing = machines_col.find_one({
            "workshop_id": ObjectId(machine.workshop_id),
            "machine_number": machine.machine_number
        })
        if existing:
            raise HTTPException(status_code=400, detail="Machine number already exists in this workshop")
        
        machine_doc = {
            "workshop_id": ObjectId(machine.workshop_id),
            "machine_number": machine.machine_number,
            "fabric_type": machine.fabric_type,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = machines_col.insert_one(machine_doc)
        return {"message": "Machine created successfully", "machine_id": str(result.inserted_id)}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid workshop ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workshops/{workshop_id}/machines")
async def get_workshop_machines(workshop_id: str):
    """Get all machines for a workshop with their active beam information"""
    try:
        # Aggregation pipeline to join machines with their active beams
        pipeline = [
            {"$match": {"workshop_id": ObjectId(workshop_id), "is_active": {"$ne": False}}},
            {"$lookup": {
                "from": "beams",
                "let": {"machine_id": "$_id"},
                "pipeline": [
                    {"$match": {
                        "$expr": {"$eq": ["$machine_id", "$$machine_id"]},
                        "status": "active"
                    }}
                ],
                "as": "active_beam"
            }},
            {"$unwind": {
                "path": "$active_beam",
                "preserveNullAndEmptyArrays": True
            }},
            {"$lookup": {
                "from": "customers",
                "localField": "active_beam.customer_id",
                "foreignField": "_id",
                "as": "customer"
            }},
            {"$unwind": {
                "path": "$customer",
                "preserveNullAndEmptyArrays": True
            }},
            {"$lookup": {
                "from": "deliveries",
                "let": {"beam_id": "$active_beam._id"},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": ["$beam_id", "$$beam_id"]}}},
                    {"$group": {
                        "_id": None,
                        "total_good": {"$sum": "$good_pieces"},
                        "total_damaged": {"$sum": "$damaged_pieces"}
                    }}
                ],
                "as": "delivery_stats"
            }},
            {"$addFields": {
                "beam_id": {"$ifNull": ["$active_beam._id", None]},
                "beam_number": {"$ifNull": ["$active_beam.beam_number", None]},
                "customer_name": {"$ifNull": ["$customer.name", None]},
                "total_beam_meters": {"$ifNull": ["$active_beam.total_beam_meters", None]},
                "meters_per_piece": {"$ifNull": ["$active_beam.meters_per_piece", None]},
                "total_good": {"$ifNull": [{"$arrayElemAt": ["$delivery_stats.total_good", 0]}, 0]},
                "total_damaged": {"$ifNull": [{"$arrayElemAt": ["$delivery_stats.total_damaged", 0]}, 0]},
            }},
            {"$addFields": {
                "total_production": {"$add": ["$total_good", "$total_damaged"]},
                "meters_used": {
                    "$cond": {
                        "if": {"$gt": ["$meters_per_piece", 0]},
                        "then": {"$multiply": [
                            {"$add": ["$total_good", "$total_damaged"]},
                            "$meters_per_piece"
                        ]},
                        "else": 0
                    }
                }
            }},
            {"$addFields": {
                "remaining_meters": {
                    "$cond": {
                        "if": {"$gt": ["$total_beam_meters", 0]},
                        "then": {"$subtract": ["$total_beam_meters", "$meters_used"]},
                        "else": 0
                    }
                }
            }},
            {"$project": {
                "active_beam": 0,
                "customer": 0,
                "delivery_stats": 0
            }}
        ]
        
        machines = list(machines_col.aggregate(pipeline))
        return {"machines": serialize_docs(machines)}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid workshop ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/machines/{machine_id}")
async def delete_machine(machine_id: str, admin: str = Depends(verify_token)):
    try:
        # Check for active beams
        if beams_col.count_documents({"machine_id": ObjectId(machine_id), "status": "active"}) > 0:
            raise HTTPException(status_code=400, detail="Cannot delete machine with active beams")
        
        result = machines_col.delete_one({"_id": ObjectId(machine_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Machine not found")
        return {"message": "Machine deleted successfully"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid machine ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# CUSTOMER ENDPOINTS
# ========================================

@app.get("/api/customers")
async def get_all_customers():
    customers = list(customers_col.find({"is_active": {"$ne": False}}))
    return {"customers": serialize_docs(customers)}

@app.post("/api/customers")
async def create_customer(customer: CustomerCreate, admin: str = Depends(verify_token)):
    # Check duplicate name
    if customers_col.find_one({"name": customer.name}):
        raise HTTPException(status_code=400, detail="Customer with this name already exists")
    
    customer_doc = {
        "name": customer.name,
        "contact_person": customer.contact_person,
        "phone": customer.phone,
        "email": customer.email,
        "address": customer.address,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = customers_col.insert_one(customer_doc)
    return {"message": "Customer created successfully", "customer_id": str(result.inserted_id)}

@app.put("/api/customers/{customer_id}/status")
async def toggle_customer_status(customer_id: str, status: dict, admin: str = Depends(verify_token)):
    """Toggle customer active/inactive status"""
    try:
        new_status = status.get("status")
        if new_status not in ["active", "inactive"]:
            raise HTTPException(status_code=400, detail="Status must be 'active' or 'inactive'")
        
        is_active = new_status == "active"
        result = customers_col.update_one(
            {"_id": ObjectId(customer_id)},
            {"$set": {"is_active": is_active, "status": new_status, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {"message": f"Customer status updated to {new_status}"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/customers/{customer_id}")
async def delete_customer(customer_id: str, admin: str = Depends(verify_token)):
    try:
        result = customers_col.delete_one({"_id": ObjectId(customer_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Customer not found")
        return {"message": "Customer deleted successfully"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# DESIGN PRESETS ENDPOINTS
# ========================================

@app.get("/api/design-presets")
async def get_design_presets():
    presets = list(design_presets_col.find({"is_active": {"$ne": False}}))
    return {"presets": serialize_docs(presets)}

@app.post("/api/design-presets")
async def create_design_preset(preset: DesignPresetCreate, admin: str = Depends(verify_token)):
    preset_doc = {
        "price": preset.price,
        "label": preset.label,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    result = design_presets_col.insert_one(preset_doc)
    return {"message": "Design preset created successfully", "preset_id": str(result.inserted_id)}

@app.delete("/api/design-presets/{preset_id}")
async def delete_design_preset(preset_id: str, admin: str = Depends(verify_token)):
    try:
        result = design_presets_col.delete_one({"_id": ObjectId(preset_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Design preset not found")
        return {"message": "Design preset deleted successfully"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid preset ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# STARTUP - Create Admin User if not exists
# ========================================

@app.on_event("startup")
async def startup_event():
    """Create default admin user if it doesn't exist"""
    if admin_users_col.count_documents({"username": "admin"}) == 0:
        hashed = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt())
        admin_users_col.insert_one({
            "username": "admin",
            "password_hash": hashed.decode(),
            "email": "admin@powerloom.com",
            "is_active": True,
            "created_at": datetime.utcnow()
        })
        print("Created default admin user: admin/admin123")

# ========================================
# RUN SERVER
# ========================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)