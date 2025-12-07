# ========================================
# FILE: main.py (FastAPI Entry Point)
# ========================================

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import mysql.connector
from mysql.connector import Error
import bcrypt
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
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
# Database Connection
# ========================================

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "powerloom_db"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", "")
        )
        return connection
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

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
    customer_id: int
    machine_id: int
    total_beam_meters: float
    meters_per_piece: float
    start_date: str

class DeliveryCreate(BaseModel):
    beam_id: int
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
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ========================================
# AUTH ENDPOINTS
# ========================================

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Admin login endpoint - completely rewritten from scratch
    Authenticates user and returns JWT token
    """
    connection = None
    cursor = None
    
    try:
        # Step 1: Connect to database
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "powerloom_db"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", "")
        )
        
        if not connection.is_connected():
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        # Step 2: Query user from database
        cursor = connection.cursor(dictionary=True)
        query = "SELECT id, username, password_hash, email, is_active FROM admin_users WHERE username = %s"
        cursor.execute(query, (request.username,))
        user_record = cursor.fetchone()
        
        # Step 3: Check if user exists
        if not user_record:
            if cursor:
                cursor.close()
            if connection:
                connection.close()
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Step 4: Check if user is active
        if not user_record['is_active']:
            if cursor:
                cursor.close()
            if connection:
                connection.close()
            raise HTTPException(status_code=401, detail="Account is disabled")
        
        # Step 5: Verify password with bcrypt
        stored_hash = user_record['password_hash']
        password_bytes = request.password.encode('utf-8')
        hash_bytes = stored_hash.encode('utf-8')
        
        password_match = bcrypt.checkpw(password_bytes, hash_bytes)
        
        if not password_match:
            if cursor:
                cursor.close()
            if connection:
                connection.close()
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Step 6: Update last login timestamp
        update_query = "UPDATE admin_users SET last_login = NOW() WHERE id = %s"
        cursor.execute(update_query, (user_record['id'],))
        connection.commit()
        
        # Step 7: Generate JWT token
        token_data = {"sub": user_record['username']}
        access_token = create_access_token(token_data)
        
        # Step 8: Clean up and return
        cursor.close()
        connection.close()
        
        return TokenResponse(access_token=access_token, token_type="bearer")
        
    except HTTPException as http_err:
        # Re-raise HTTP exceptions as-is
        raise http_err
        
    except mysql.connector.Error as db_err:
        # Database errors
        print(f"DATABASE ERROR: {db_err}")
        if cursor:
            cursor.close()
        if connection:
            connection.close()
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_err)}")
        
    except Exception as err:
        # Any other errors
        print(f"UNEXPECTED ERROR: {type(err).__name__}: {err}")
        import traceback
        traceback.print_exc()
        if cursor:
            cursor.close()
        if connection:
            connection.close()
        raise HTTPException(status_code=500, detail=f"Server error: {str(err)}")

@app.post("/api/auth/reset-password")
async def reset_password(username: str, new_password: str, admin: str = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt())
    cursor.execute("UPDATE admin_users SET password_hash = %s WHERE username = %s", (hashed.decode(), username))
    conn.commit()
    
    cursor.close()
    conn.close()
    return {"message": "Password reset successful"}

@app.post("/api/admin/reset-database")
async def reset_database(admin_password: str, admin: str = Depends(verify_token)):
    """Reset database - Delete ALL data except admin credentials"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Verify admin password
        cursor.execute("SELECT password_hash FROM admin_users WHERE username = 'admin'")
        admin_user = cursor.fetchone()
        
        if not admin_user or not bcrypt.checkpw(admin_password.encode(), admin_user['password_hash'].encode()):
            raise HTTPException(status_code=401, detail="Invalid admin password")
        
        # Delete all data in correct order (respecting foreign keys)
        cursor.execute("DELETE FROM deliveries")
        cursor.execute("DELETE FROM beam_starts")
        cursor.execute("DELETE FROM design_presets")
        cursor.execute("DELETE FROM machines")
        cursor.execute("DELETE FROM workshops")
        cursor.execute("DELETE FROM customers")
        
        conn.commit()
        
        return {"message": "Database reset successfully. All data deleted."}
    
    except Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ========================================
# DASHBOARD ENDPOINTS
# ========================================

@app.get("/api/dashboard/overview")
async def get_dashboard_overview(start_date: str = None, end_date: str = None, fabric_type: str = None):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Build date filter condition
    if start_date and end_date:
        date_filter = f"delivery_date BETWEEN '{start_date}' AND '{end_date}'"
    elif start_date:
        date_filter = f"delivery_date >= '{start_date}'"
    elif end_date:
        date_filter = f"delivery_date <= '{end_date}'"
    else:
        # Default to current month
        date_filter = "MONTH(delivery_date) = MONTH(CURRENT_DATE()) AND YEAR(delivery_date) = YEAR(CURRENT_DATE())"
    
    # Build fabric filter condition
    fabric_filter = f"AND m.fabric_type = '{fabric_type}'" if fabric_type else ""
    
    # Active beams count
    cursor.execute("SELECT COUNT(*) as count FROM beam_starts WHERE status = 'active'")
    active_beams = cursor.fetchone()['count']
    
    # Production with date and fabric filter
    cursor.execute(f"""
        SELECT COALESCE(SUM(d.good_pieces), 0) as total_pieces,
               COALESCE(SUM(d.damaged_pieces), 0) as total_damaged
        FROM deliveries d
        JOIN beam_starts b ON d.beam_id = b.id
        JOIN machines m ON b.machine_id = m.id
        WHERE {date_filter} {fabric_filter}
    """)
    production = cursor.fetchone()
    
    # Total amount with date and fabric filter
    cursor.execute(f"""
        SELECT COALESCE(SUM(d.total_amount), 0) as pending_amount
        FROM deliveries d
        JOIN beam_starts b ON d.beam_id = b.id
        JOIN machines m ON b.machine_id = m.id
        WHERE {date_filter} {fabric_filter}
    """)
    pending = cursor.fetchone()
    
    # Build fabric JOIN filter for LEFT JOIN queries
    fabric_join_filter = f"AND m.fabric_type = '{fabric_type}'" if fabric_type else ""
    
    # Workshop-wise production with date and fabric filter
    # Use INNER JOIN when fabric filter is active to hide workshops without that fabric
    join_type = "INNER JOIN" if fabric_type else "LEFT JOIN"
    cursor.execute(f"""
        SELECT w.name as workshop_name, 
               COALESCE(SUM(d.good_pieces), 0) as total_pieces
        FROM workshops w
        {join_type} beam_starts b ON w.id = b.workshop_id
        {join_type} machines m ON b.machine_id = m.id {fabric_join_filter}
        LEFT JOIN deliveries d ON b.id = d.beam_id AND {date_filter}
        GROUP BY w.id, w.name
        HAVING total_pieces > 0
    """)
    workshop_production = cursor.fetchall()
    
    # Customer-wise summary with date and fabric filter
    cursor.execute(f"""
        SELECT c.name as customer_name,
               COALESCE(SUM(d.good_pieces), 0) as total_pieces,
               COALESCE(SUM(d.total_amount), 0) as total_amount
        FROM customers c
        LEFT JOIN beam_starts b ON c.id = b.customer_id
        LEFT JOIN machines m ON b.machine_id = m.id {fabric_join_filter}
        LEFT JOIN deliveries d ON b.id = d.beam_id AND {date_filter}
        GROUP BY c.id, c.name
    """)
    customer_summary = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {
        "active_beams": active_beams,
        "total_pieces_this_month": production['total_pieces'],
        "total_damaged_this_month": production['total_damaged'],
        "pending_amount_this_month": float(pending['pending_amount']),
        "workshop_production": workshop_production,
        "customer_summary": customer_summary
    }

# ========================================
# BEAM ENDPOINTS
# ========================================

@app.get("/api/beams")
async def get_all_beams(status: str = "active"):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT b.*, 
               w.name as workshop_name,
               c.name as customer_name,
               m.machine_number,
               COALESCE(SUM(d.good_pieces), 0) as total_good_pieces,
               COALESCE(SUM(d.damaged_pieces), 0) as total_damaged_pieces,
               COALESCE(SUM(d.meters_used), 0) as total_meters_used,
               (b.total_beam_meters - COALESCE(SUM(d.meters_used), 0)) as remaining_meters
        FROM beam_starts b
        JOIN workshops w ON b.workshop_id = w.id
        JOIN customers c ON b.customer_id = c.id
        JOIN machines m ON b.machine_id = m.id
        LEFT JOIN deliveries d ON b.id = d.beam_id
        WHERE b.status = %s
        GROUP BY b.id
        ORDER BY b.start_date DESC
    """
    
    cursor.execute(query, (status,))
    beams = cursor.fetchall()
    
    # Convert Decimal and datetime to JSON-serializable types
    for beam in beams:
        for key, value in beam.items():
            if isinstance(value, Decimal):
                beam[key] = float(value)
            elif isinstance(value, datetime):
                beam[key] = value.isoformat()
            elif hasattr(value, 'isoformat'):  # date objects
                beam[key] = value.isoformat()
    
    cursor.close()
    conn.close()
    
    return {"beams": beams}

@app.get("/api/beams/{beam_id}")
async def get_beam_details(beam_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Beam basic info
    cursor.execute("""
        SELECT b.*, 
               w.name as workshop_name,
               c.name as customer_name,
               m.machine_number
        FROM beam_starts b
        JOIN workshops w ON b.workshop_id = w.id
        JOIN customers c ON b.customer_id = c.id
        JOIN machines m ON b.machine_id = m.id
        WHERE b.id = %s
    """, (beam_id,))
    beam = cursor.fetchone()
    
    if not beam:
        raise HTTPException(status_code=404, detail="Beam not found")
    
    # All deliveries
    cursor.execute("""
        SELECT * FROM deliveries 
        WHERE beam_id = %s 
        ORDER BY delivery_date DESC
    """, (beam_id,))
    deliveries = cursor.fetchall()
    
    # Calculate totals
    cursor.execute("""
        SELECT 
            COALESCE(SUM(good_pieces), 0) as total_good,
            COALESCE(SUM(damaged_pieces), 0) as total_damaged,
            COALESCE(SUM(meters_used), 0) as total_meters_used,
            COALESCE(SUM(total_amount), 0) as total_amount
        FROM deliveries 
        WHERE beam_id = %s
    """, (beam_id,))
    totals = cursor.fetchone()
    
    remaining_meters = float(beam['total_beam_meters']) - float(totals['total_meters_used'])
    estimated_pieces = remaining_meters / float(beam['meters_per_piece']) if beam['meters_per_piece'] > 0 else 0
    
    cursor.close()
    conn.close()
    
    return {
        "beam": beam,
        "deliveries": deliveries,
        "totals": {
            **totals,
            "remaining_meters": remaining_meters,
            "estimated_pieces_remaining": int(estimated_pieces),
            "meter_usage_percentage": (float(totals['total_meters_used']) / float(beam['total_beam_meters']) * 100) if beam['total_beam_meters'] > 0 else 0
        }
    }

@app.post("/api/beams/start")
async def start_new_beam(beam: BeamStartCreate, admin: str = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get machine details (workshop_id and fabric_type only)
        cursor.execute("""
            SELECT workshop_id, fabric_type 
            FROM machines WHERE id = %s
        """, (beam.machine_id,))
        machine = cursor.fetchone()
        
        if not machine:
            raise HTTPException(status_code=404, detail="Machine not found")
        
        # Check if machine already has an active beam
        cursor.execute("""
            SELECT beam_number 
            FROM beam_starts 
            WHERE machine_id = %s AND status = 'active'
        """, (beam.machine_id,))
        existing_beam = cursor.fetchone()
        
        if existing_beam:
            raise HTTPException(
                status_code=400, 
                detail=f"Machine already has an active beam '{existing_beam[0]}'. Please complete or end the current beam first."
            )
        
        # Insert beam with customer_id from request
        cursor.execute("""
            INSERT INTO beam_starts 
            (beam_number, machine_id, workshop_id, customer_id, fabric_type, 
             total_beam_meters, meters_per_piece, start_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'active')
        """, (beam.beam_number, beam.machine_id, machine[0], beam.customer_id, 
              machine[1], beam.total_beam_meters, beam.meters_per_piece, beam.start_date))
        
        conn.commit()
        beam_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        
        return {"message": "Beam started successfully", "beam_id": beam_id}
    
    except Error as e:
        conn.rollback()
        cursor.close()
        conn.close()
        
        # Check for duplicate entry error
        if e.errno == 1062:  # Duplicate entry error code
            raise HTTPException(
                status_code=400, 
                detail=f"Duplicate entry '{beam.beam_number}' for key 'beam_number'"
            )
        else:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/beams/{beam_id}/end")
async def end_beam(beam_id: int, admin: str = Depends(verify_token)):
    """End a beam manually - sets status to completed and records end date"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Check if beam exists and is active
    cursor.execute("SELECT status FROM beam_starts WHERE id = %s", (beam_id,))
    beam = cursor.fetchone()
    
    if not beam:
        raise HTTPException(status_code=404, detail="Beam not found")
    
    if beam['status'] != 'active':
        raise HTTPException(status_code=400, detail="Beam is already completed")
    
    # Update beam status to completed and set end_date
    cursor.execute("""
        UPDATE beam_starts 
        SET status = 'completed', end_date = CURDATE()
        WHERE id = %s
    """, (beam_id,))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"message": "Beam ended successfully", "beam_id": beam_id}

# ========================================
# DELIVERY ENDPOINTS
# ========================================

@app.post("/api/deliveries/add")
async def add_delivery(delivery: DeliveryCreate, admin: str = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Get beam details
    cursor.execute("SELECT meters_per_piece FROM beam_starts WHERE id = %s", (delivery.beam_id,))
    beam = cursor.fetchone()
    
    if not beam:
        raise HTTPException(status_code=404, detail="Beam not found")
    
    # Calculate meters used
    total_pieces = delivery.good_pieces + delivery.damaged_pieces
    meters_used = total_pieces * float(beam['meters_per_piece'])
    total_amount = delivery.good_pieces * delivery.price_per_piece
    
    # Insert delivery
    cursor.execute("""
        INSERT INTO deliveries 
        (beam_id, delivery_date, design_name, price_per_piece, good_pieces, 
         damaged_pieces, meters_used, total_amount, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (delivery.beam_id, delivery.delivery_date, delivery.design_name, 
          delivery.price_per_piece, delivery.good_pieces, delivery.damaged_pieces,
          meters_used, total_amount, delivery.notes))
    
    conn.commit()
    
    # Auto-archive: Check if beam is complete (remaining meters <= 0)
    cursor.execute("""
        SELECT b.total_beam_meters, COALESCE(SUM(d.meters_used), 0) as total_used
        FROM beam_starts b
        LEFT JOIN deliveries d ON b.id = d.beam_id
        WHERE b.id = %s
        GROUP BY b.id
    """, (delivery.beam_id,))
    
    beam_usage = cursor.fetchone()
    if beam_usage:
        remaining = float(beam_usage['total_beam_meters']) - float(beam_usage['total_used'])
        
        # If beam is complete, auto-archive it
        if remaining <= 0:
            cursor.execute("""
                UPDATE beam_starts 
                SET status = 'completed', end_date = CURDATE()
                WHERE id = %s AND status = 'active'
            """, (delivery.beam_id,))
            conn.commit()
    
    cursor.close()
    conn.close()
    
    return {"message": "Delivery added successfully"}

# ========================================
# WORKSHOP ENDPOINTS
# ========================================

@app.get("/api/workshops")
async def get_all_workshops():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT w.*,
               (SELECT COUNT(*) FROM machines WHERE workshop_id = w.id) as actual_machine_count
        FROM workshops w
        WHERE w.is_active = TRUE
        ORDER BY w.id
    """)
    workshops = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {"workshops": workshops}

@app.post("/api/workshops")
async def create_workshop(workshop: WorkshopCreate, admin: str = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO workshops (name, location, machine_count, workshop_type)
        VALUES (%s, %s, %s, %s)
    """, (workshop.name, workshop.location, workshop.machine_count, workshop.workshop_type))
    
    conn.commit()
    workshop_id = cursor.lastrowid
    
    cursor.close()
    conn.close()
    
    return {"message": "Workshop created successfully", "workshop_id": workshop_id}

@app.delete("/api/workshops/{workshop_id}")
async def delete_workshop(workshop_id: int, admin: str = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if workshop has machines
    cursor.execute("SELECT COUNT(*) as count FROM machines WHERE workshop_id = %s", (workshop_id,))
    result = cursor.fetchone()
    
    if result[0] > 0:
        raise HTTPException(status_code=400, detail="Cannot delete workshop with existing machines")
    
    cursor.execute("UPDATE workshops SET is_active = FALSE WHERE id = %s", (workshop_id,))
    conn.commit()
    
    cursor.close()
    conn.close()
    
    return {"message": "Workshop deleted successfully"}


@app.get("/api/workshops/{workshop_id}/machines")
async def get_workshop_machines(workshop_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT 
            m.id,
            m.workshop_id,
            m.machine_number,
            m.fabric_type,
            m.is_active,
            m.created_at,
            m.updated_at,
            b.beam_number,
            b.id as beam_id,
            b.customer_id,
            b.total_beam_meters,
            c.name as customer_name,
            COALESCE(delivery_stats.meters_used, 0) as meters_used,
            COALESCE(b.total_beam_meters - delivery_stats.meters_used, b.total_beam_meters, 0) as remaining_meters,
            COALESCE(delivery_stats.total_damaged, 0) as total_damaged
        FROM machines m
        LEFT JOIN beam_starts b ON m.id = b.machine_id AND b.status = 'active'
        LEFT JOIN customers c ON b.customer_id = c.id
        LEFT JOIN (
            SELECT 
                beam_id,
                SUM(meters_used) as meters_used,
                SUM(damaged_pieces) as total_damaged
            FROM deliveries
            GROUP BY beam_id
        ) delivery_stats ON b.id = delivery_stats.beam_id
        WHERE m.workshop_id = %s AND m.is_active = TRUE
        ORDER BY m.machine_number
    """, (workshop_id,))
    machines = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {"machines": machines}

# ========================================
# CUSTOMER ENDPOINTS
# ========================================

@app.get("/api/customers")
async def get_all_customers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM customers WHERE is_active = TRUE ORDER BY name")
    customers = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {"customers": customers}

@app.post("/api/customers")
async def create_customer(customer: CustomerCreate, admin: str = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO customers (name, contact_person, phone, email, address)
        VALUES (%s, %s, %s, %s, %s)
    """, (customer.name, customer.contact_person, customer.phone, customer.email, customer.address))
    
    conn.commit()
    customer_id = cursor.lastrowid
    
    cursor.close()
    conn.close()
    
    return {"message": "Customer created", "customer_id": customer_id}

@app.delete("/api/customers/{customer_id}")
async def delete_customer(customer_id: int, admin: str = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if customer has beams
    cursor.execute("SELECT COUNT(*) as count FROM beam_starts WHERE customer_id = %s", (customer_id,))
    result = cursor.fetchone()
    
    if result[0] > 0:
        raise HTTPException(status_code=400, detail="Cannot delete customer with existing beams")
    
    cursor.execute("UPDATE customers SET is_active = FALSE WHERE id = %s", (customer_id,))
    conn.commit()
    
    cursor.close()
    conn.close()
    
    return {"message": "Customer deleted successfully"}



# ========================================
# MACHINE MANAGEMENT ENDPOINTS
# ========================================

class MachineCreate(BaseModel):
    workshop_id: int
    machine_number: int
    fabric_type: str

@app.get("/api/machines/all")
async def get_all_machines():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT m.*, 
               w.name as workshop_name
        FROM machines m
        JOIN workshops w ON m.workshop_id = w.id
        ORDER BY w.id, m.machine_number
    """)
    machines = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {"machines": machines}

@app.post("/api/machines")
async def create_machine(machine: MachineCreate, admin: str = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if machine number already exists in this workshop
        cursor.execute("""
            SELECT machine_number 
            FROM machines 
            WHERE workshop_id = %s AND machine_number = %s
        """, (machine.workshop_id, machine.machine_number))
        existing_machine = cursor.fetchone()
        
        if existing_machine:
            raise HTTPException(
                status_code=400, 
                detail=f"Machine {machine.machine_number} already exists in this workshop. Please use a different machine number."
            )
        
        cursor.execute("""
            INSERT INTO machines (workshop_id, machine_number, fabric_type)
            VALUES (%s, %s, %s)
        """, (machine.workshop_id, machine.machine_number, machine.fabric_type))
        
        conn.commit()
        machine_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        
        return {"message": "Machine created successfully", "machine_id": machine_id}
    except HTTPException:
        cursor.close()
        conn.close()
        raise
    except Error as e:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail=f"Failed to create machine: {str(e)}")

@app.delete("/api/machines/{machine_id}")
async def delete_machine(machine_id: int, admin: str = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if machine has active beams
    cursor.execute("""
        SELECT COUNT(*) as count FROM beam_starts 
        WHERE machine_id = %s AND status = 'active'
    """, (machine_id,))
    active_beams = cursor.fetchone()[0]
    
    if active_beams > 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete machine with active beams. Complete or reassign beams first."
        )
    
    cursor.execute("DELETE FROM machines WHERE id = %s", (machine_id,))
    conn.commit()
    
    cursor.close()
    conn.close()
    
    return {"message": "Machine deleted successfully"}



# ========================================
# DESIGN PRESETS
# ========================================

@app.get("/api/design-presets")
async def get_design_presets():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM design_presets WHERE is_active = TRUE ORDER BY price")
    presets = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {"presets": presets}

@app.post("/api/design-presets")
async def create_design_preset(preset: DesignPresetCreate, admin: str = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO design_presets (price, label)
        VALUES (%s, %s)
    """, (preset.price, preset.label))
    
    conn.commit()
    preset_id = cursor.lastrowid
    
    cursor.close()
    conn.close()
    
    return {"message": "Design preset created successfully", "preset_id": preset_id}

@app.delete("/api/design-presets/{preset_id}")
async def delete_design_preset(preset_id: int, admin: str = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("UPDATE design_presets SET is_active = FALSE WHERE id = %s", (preset_id,))
    conn.commit()
    
    cursor.close()
    conn.close()
    
    return {"message": "Design preset deleted successfully"}


# ========================================
# REPORTS
# ========================================

@app.get("/api/reports/beam-details")
async def get_beam_report(start_date: str, end_date: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT b.beam_number, b.start_date, b.end_date,
               w.name as workshop, c.name as customer,
               b.fabric_type, b.total_beam_meters,
               COALESCE(SUM(d.good_pieces), 0) as total_pieces,
               COALESCE(SUM(d.damaged_pieces), 0) as total_damaged,
               COALESCE(SUM(d.total_amount), 0) as total_amount
        FROM beam_starts b
        JOIN workshops w ON b.workshop_id = w.id
        JOIN customers c ON b.customer_id = c.id
        LEFT JOIN deliveries d ON b.id = d.beam_id
        WHERE b.start_date BETWEEN %s AND %s
        GROUP BY b.id
        ORDER BY b.start_date DESC
    """, (start_date, end_date))
    
    beams = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return {"beams": beams}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)