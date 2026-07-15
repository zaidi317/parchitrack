import json
import random
import hashlib
import jwt
from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db, init_db, SessionLocal
from .models import Clinic, Token, ConsultationLog, NotificationSubscription, StaffUser
from .schemas import (
    ClinicStatusResponse,
    QueueStatusResponse,
    TokenDetailsResponse,
    ConsultationStatsResponse,
    TrendDataPoint,
    NotificationSubscribeRequest,
    TokenResponse,
    LoginRequest,
    LoginResponse,
    ClaimTokenRequest,
    AdminTokenCreateRequest,
    AdminTokenResponse,
    StaffUserCreateRequest,
    StaffUserResponse,
    ClinicSettingsUpdateRequest,
    ClinicSettingsResponse,
    NotificationSubscriptionResponse
)

app = FastAPI(title="ParchiTrack Backend")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.12:3000",
    ],  # For local development we allow specific origins instead of wildcard when credentials are true
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT configuration
SECRET_KEY = "parchitrack-super-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

security = HTTPBearer()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token: missing subject")
        user = db.query(StaffUser).filter(StaffUser.email == email).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Initialize database and seed records on startup
@app.on_event("startup")
def startup_event():
    init_db()


# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, clinic_id: int, websocket: WebSocket):
        await websocket.accept()
        if clinic_id not in self.active_connections:
            self.active_connections[clinic_id] = set()
        self.active_connections[clinic_id].add(websocket)

    def disconnect(self, clinic_id: int, websocket: WebSocket):
        if clinic_id in self.active_connections:
            self.active_connections[clinic_id].discard(websocket)

    async def broadcast(self, clinic_id: int, message: dict):
        if clinic_id in self.active_connections:
            # Create a copy of connections to prevent modification issues during iteration
            for connection in list(self.active_connections[clinic_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    # Connection might have died, discard it
                    self.active_connections[clinic_id].discard(connection)

manager = ConnectionManager()

# --- Helper Logic ---
def get_avg_consultation_time(db: Session) -> float:
    logs = db.query(ConsultationLog).all()
    if not logs:
        return 5.0  # default to 5 minutes
    total = sum(log.duration_minutes for log in logs)
    return round(total / len(logs), 1)

def get_queue_speed_label(avg_time: float) -> str:
    if avg_time < 4.0:
        return "Fast"
    elif avg_time <= 7.0:
        return "Normal"
    else:
        return "Slow"

async def notify_queue_update(clinic_id: int, db: Session):
    # Compute new queue metrics to broadcast
    current_serving = db.query(Token).filter(
        Token.clinic_id == clinic_id, Token.status == "serving"
    ).first()
    
    next_up = db.query(Token).filter(
        Token.clinic_id == clinic_id, Token.status == "waiting"
    ).order_by(Token.token_number).first()
    
    patients_waiting = db.query(Token).filter(
        Token.clinic_id == clinic_id, Token.status == "waiting"
    ).count()
    
    avg_time = get_avg_consultation_time(db)
    clinic = db.query(Clinic).filter(Clinic.id == clinic_id).first()
    
    payload = {
        "type": "QUEUE_UPDATE",
        "current_token": current_serving.token_number if current_serving else None,
        "next_token": next_up.token_number if next_up else None,
        "patients_waiting": patients_waiting,
        "queue_speed": get_queue_speed_label(avg_time),
        "doctor_status": clinic.doctor_status if clinic else "Available",
        "expected_start": clinic.expected_start_time if clinic else "",
        "delay_reason": clinic.delay_reason if clinic else "",
        "average_time": avg_time,
        "last_updated": datetime.now().isoformat()
    }
    await manager.broadcast(clinic_id, payload)

# --- REST Endpoints ---

@app.get("/api/clinic/{id}/status", response_model=ClinicStatusResponse)
def get_clinic_status(id: int, db: Session = Depends(get_db)):
    clinic = db.query(Clinic).filter(Clinic.id == id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Calculate delay minutes from database
    delay_minutes = clinic.doctor_delay_minutes if clinic.doctor_status == "Delayed" else 0
    
    return ClinicStatusResponse(
        id=clinic.id,
        name=clinic.name,
        doctor_status=clinic.doctor_status,
        expected_start_time=clinic.expected_start_time,
        delay_reason=clinic.delay_reason,
        doctor_delay_minutes=delay_minutes
    )

@app.get("/api/clinic/{id}/queue", response_model=QueueStatusResponse)
def get_clinic_queue(id: int, db: Session = Depends(get_db)):
    current_serving = db.query(Token).filter(
        Token.clinic_id == id, Token.status == "serving"
    ).first()
    
    next_up = db.query(Token).filter(
        Token.clinic_id == id, Token.status == "waiting"
    ).order_by(Token.token_number).first()
    
    patients_waiting = db.query(Token).filter(
        Token.clinic_id == id, Token.status == "waiting"
    ).count()
    
    avg_time = get_avg_consultation_time(db)
    
    return QueueStatusResponse(
        current_token=current_serving.token_number if current_serving else None,
        next_token=next_up.token_number if next_up else None,
        patients_waiting=patients_waiting,
        queue_speed=get_queue_speed_label(avg_time),
        last_updated=datetime.now()
    )

@app.get("/api/clinic/{id}/tokens", response_model=List[TokenResponse])
def get_all_tokens(id: int, db: Session = Depends(get_db)):
    return db.query(Token).filter(Token.clinic_id == id).order_by(Token.token_number).all()

@app.get("/api/token/{token_number}", response_model=TokenDetailsResponse)
def get_token_details(token_number: int, db: Session = Depends(get_db)):
    token = db.query(Token).filter(Token.token_number == token_number).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    clinic = db.query(Clinic).filter(Clinic.id == token.clinic_id).first()
    
    # Calculate queue status
    queue_status = "Moving"
    if clinic and clinic.doctor_status in ["Delayed", "On Break", "Not Started"]:
        queue_status = "Stalled"
        
    if token.status == "done":
        return TokenDetailsResponse(
            token_number=token.token_number,
            patient_name=token.patient_name,
            status=token.status,
            position=0,
            estimated_turn="Completed",
            patients_before=0,
            queue_status=queue_status
        )
    elif token.status == "serving":
        return TokenDetailsResponse(
            token_number=token.token_number,
            patient_name=token.patient_name,
            status=token.status,
            position=0,
            estimated_turn="Now Serving",
            patients_before=0,
            queue_status=queue_status
        )
        
    # Waiting tokens
    serving_token = db.query(Token).filter(
        Token.clinic_id == token.clinic_id, Token.status == "serving"
    ).first()
    
    serving_number = serving_token.token_number if serving_token else 0
    
    # Patients before this token
    patients_before = db.query(Token).filter(
        Token.clinic_id == token.clinic_id,
        Token.status == "waiting",
        Token.token_number < token.token_number
    ).count()
    
    # If a token is currently serving, those waiting come after it
    position = patients_before + 1
    
    # Estimated time = current time + (patients_before * avg_time)
    avg_time = get_avg_consultation_time(db)
    wait_time_minutes = patients_before * avg_time
    est_time = datetime.now() + timedelta(minutes=wait_time_minutes)
    
    return TokenDetailsResponse(
        token_number=token.token_number,
        patient_name=token.patient_name,
        status=token.status,
        position=position,
        estimated_turn=est_time.strftime("%I:%M %p"),
        patients_before=patients_before,
        queue_status=queue_status
    )

@app.get("/api/clinic/{id}/consultation-stats", response_model=ConsultationStatsResponse)
def get_consultation_stats(id: int, db: Session = Depends(get_db)):
    logs = db.query(ConsultationLog).join(Token).filter(Token.clinic_id == id).all()
    
    if not logs:
        return ConsultationStatsResponse(
            today_average=5.0,
            fastest=5,
            longest=5,
            queue_speed="Normal",
            trend=[]
        )
        
    durations = [log.duration_minutes for log in logs]
    avg_time = round(sum(durations) / len(durations), 1)
    
    # Prepare trend line points
    # Format times of logs to represent consultation points
    trend_points = []
    # Sort logs by timestamp
    sorted_logs = sorted(logs, key=lambda x: x.timestamp)
    for log in sorted_logs:
        trend_points.append(
            TrendDataPoint(
                time=log.timestamp.strftime("%I:%M %p"),
                duration=log.duration_minutes
            )
        )
        
    return ConsultationStatsResponse(
        today_average=avg_time,
        fastest=min(durations),
        longest=max(durations),
        queue_speed=get_queue_speed_label(avg_time),
        trend=trend_points
    )

@app.post("/api/notify/subscribe")
def subscribe_notification(req: NotificationSubscribeRequest, db: Session = Depends(get_db)):
    token = db.query(Token).filter(Token.token_number == req.token_number).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
        
    sub = NotificationSubscription(
        patient_id=req.patient_id,
        token_id=token.id,
        trigger_type=req.trigger_type,
        threshold=req.threshold
    )
    db.add(sub)
    db.commit()
    return {"status": "subscribed"}

# --- WebSocket Setup ---

@app.websocket("/ws/clinic/{id}")
async def websocket_endpoint(websocket: WebSocket, id: int):
    await manager.connect(id, websocket)
    try:
        # Send initial data immediately on connection
        db = SessionLocal()
        try:
            # We can run notify_queue_update immediately for this single client,
            # or just broadcast it. Let's broadcast it to verify it works.
            current_serving = db.query(Token).filter(
                Token.clinic_id == id, Token.status == "serving"
            ).first()
            next_up = db.query(Token).filter(
                Token.clinic_id == id, Token.status == "waiting"
            ).order_by(Token.token_number).first()
            patients_waiting = db.query(Token).filter(
                Token.clinic_id == id, Token.status == "waiting"
            ).count()
            avg_time = get_avg_consultation_time(db)
            clinic = db.query(Clinic).filter(Clinic.id == id).first()
            
            await websocket.send_json({
                "type": "INITIAL_STATE",
                "current_token": current_serving.token_number if current_serving else None,
                "next_token": next_up.token_number if next_up else None,
                "patients_waiting": patients_waiting,
                "queue_speed": get_queue_speed_label(avg_time),
                "doctor_status": clinic.doctor_status if clinic else "Available",
                "expected_start": clinic.expected_start_time if clinic else "",
                "delay_reason": clinic.delay_reason if clinic else "",
                "average_time": avg_time,
                "last_updated": datetime.now().isoformat()
            })
        finally:
            db.close()
            
        while True:
            # Keep connection open and await ping/messages
            data = await websocket.receive_text()
            # Respond to ping messages to maintain connection
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(id, websocket)
    except Exception:
        manager.disconnect(id, websocket)

# --- Admin / Simulation Endpoints ---

@app.post("/api/admin/next-token")
async def admin_next_token(db: Session = Depends(get_db)):
    # 1. Get currently serving token
    current_serving = db.query(Token).filter(Token.status == "serving").first()
    if current_serving:
        current_serving.status = "done"
        
        # Log consultation duration (random 3-7 mins)
        duration = random.randint(3, 7)
        log = ConsultationLog(
            token_id=current_serving.id,
            duration_minutes=duration,
            timestamp=datetime.now()
        )
        db.add(log)
        
    # 2. Get next waiting token
    next_waiting = db.query(Token).filter(Token.status == "waiting").order_by(Token.token_number).first()
    if next_waiting:
        next_waiting.status = "serving"
        next_number = next_waiting.token_number
    else:
        next_number = None
        
    db.commit()
    
    # Trigger notifications: Find subscriptions that are now active
    # For example, if next_waiting is serving, or if we have notifications client-side.
    # We will broadcast the update and clients will calculate locally if their token is near.
    
    await notify_queue_update(1, db)
    
    return {
        "status": "success",
        "now_serving": next_number
    }

@app.post("/api/admin/update-doctor")
async def admin_update_doctor(status: str, delay_reason: str = None, expected_start: str = None, db: Session = Depends(get_db)):
    clinic = db.query(Clinic).filter(Clinic.id == 1).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
        
    clinic.doctor_status = status
    clinic.delay_reason = delay_reason
    clinic.expected_start_time = expected_start
    db.commit()
    
    await notify_queue_update(1, db)
    
    return {"status": "success", "doctor_status": status}

@app.post("/api/admin/add-patient")
async def admin_add_patient(name: str = None, db: Session = Depends(get_db)):
    # Find last token number
    last_tok = db.query(Token).order_by(Token.token_number.desc()).first()
    next_num = (last_tok.token_number + 1) if last_tok else 1
    
    patient_name = name if name else f"Walk-in Patient {next_num}"
    
    new_tok = Token(
        clinic_id=1,
        token_number=next_num,
        patient_name=patient_name,
        status="waiting",
        created_at=datetime.now()
    )
    db.add(new_tok)
    db.commit()
    
    await notify_queue_update(1, db)
    
    return {"status": "success", "token_number": next_num}

@app.post("/api/admin/reset-queue")
async def admin_reset_queue(db: Session = Depends(get_db)):
    db.query(ConsultationLog).delete()
    db.query(NotificationSubscription).delete()
    db.query(Token).delete()
    db.query(Clinic).delete()
    db.query(StaffUser).delete()
    db.commit()
    init_db()
    await notify_queue_update(1, db)
    return {"status": "success", "message": "Queue database reset successfully"}

# --- Auth Endpoint ---

@app.post("/api/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(StaffUser).filter(StaffUser.email == req.email).first()
    if not user or user.password_hash != hash_password(req.password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "clinic_id": user.clinic_id}
    )
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        clinic_id=user.clinic_id
    )

# --- Public Claim Endpoint ---

@app.post("/api/token/claim")
def claim_token(req: ClaimTokenRequest, db: Session = Depends(get_db)):
    token = db.query(Token).filter(Token.token_number == req.token_number).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    token.phone_number = req.phone_number
    db.commit()
    return {"status": "claimed"}

# --- Authenticated Admin Endpoints ---

@app.post("/api/admin/queue/call-next")
async def admin_call_next(current_user: StaffUser = Depends(get_current_user), db: Session = Depends(get_db)):
    clinic_id = current_user.clinic_id
    
    # 1. Complete currently serving token
    current_serving = db.query(Token).filter(
        Token.clinic_id == clinic_id, Token.status == "serving"
    ).first()
    if current_serving:
        current_serving.status = "done"
        duration = random.randint(3, 7)
        log = ConsultationLog(
            token_id=current_serving.id,
            duration_minutes=duration,
            timestamp=datetime.now()
        )
        db.add(log)
    
    # 2. Get next waiting token
    next_waiting = db.query(Token).filter(
        Token.clinic_id == clinic_id, Token.status == "waiting"
    ).order_by(Token.token_number).first()
    
    if next_waiting:
        next_waiting.status = "serving"
        next_waiting.served_time = datetime.now()
        next_num = next_waiting.token_number
    else:
        next_num = None
        
    db.commit()
    await notify_queue_update(clinic_id, db)
    return {"status": "success", "now_serving": next_num}

@app.patch("/api/admin/token/{id}/status")
async def patch_token_status(id: int, status: str, current_user: StaffUser = Depends(get_current_user), db: Session = Depends(get_db)):
    token = db.query(Token).filter(Token.id == id, Token.clinic_id == current_user.clinic_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    old_status = token.status
    token.status = status
    
    if status == "serving" and old_status != "serving":
        token.served_time = datetime.now()
    elif status == "done" and old_status == "serving":
        duration = random.randint(3, 7)
        log = ConsultationLog(
            token_id=token.id,
            duration_minutes=duration,
            timestamp=datetime.now()
        )
        db.add(log)
        
    db.commit()
    await notify_queue_update(token.clinic_id, db)
    return {"status": "success"}

@app.post("/api/admin/token", response_model=AdminTokenResponse)
async def admin_create_token(req: AdminTokenCreateRequest, current_user: StaffUser = Depends(get_current_user), db: Session = Depends(get_db)):
    clinic_id = current_user.clinic_id
    
    # Check shifting logic
    waiting_tokens = db.query(Token).filter(
        Token.clinic_id == clinic_id, Token.status == "waiting"
    ).order_by(Token.token_number).all()
    
    if req.position is not None and req.position > 0 and req.position <= len(waiting_tokens):
        target_index = req.position - 1
        target_number = waiting_tokens[target_index].token_number
        
        # Shift all subsequent tokens by +1
        db.query(Token).filter(
            Token.clinic_id == clinic_id, Token.token_number >= target_number
        ).update({"token_number": Token.token_number + 1}, synchronize_session=False)
        new_number = target_number
    else:
        last_tok = db.query(Token).filter(Token.clinic_id == clinic_id).order_by(Token.token_number.desc()).first()
        new_number = (last_tok.token_number + 1) if last_tok else 1
        
    new_tok = Token(
        clinic_id=clinic_id,
        token_number=new_number,
        patient_name=req.patient_name,
        phone_number=req.phone_number,
        status="waiting",
        created_at=datetime.now(),
        arrival_time=datetime.now()
    )
    db.add(new_tok)
    db.commit()
    db.refresh(new_tok)
    
    await notify_queue_update(clinic_id, db)
    return new_tok

@app.put("/api/admin/clinic/{id}/doctor-status")
async def admin_update_doctor_status(id: int, status: str, delay_minutes: Optional[int] = None, delay_reason: Optional[str] = None, expected_start: Optional[str] = None, current_user: StaffUser = Depends(get_current_user), db: Session = Depends(get_db)):
    clinic = db.query(Clinic).filter(Clinic.id == id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
        
    clinic.doctor_status = status
    clinic.delay_reason = delay_reason
    clinic.expected_start_time = expected_start
    if delay_minutes is not None:
        clinic.doctor_delay_minutes = delay_minutes
    db.commit()
    
    await notify_queue_update(id, db)
    return {"status": "success", "doctor_status": status}

@app.get("/api/admin/analytics")
def get_admin_analytics(range: str = "today", current_user: StaffUser = Depends(get_current_user), db: Session = Depends(get_db)):
    clinic_id = current_user.clinic_id
    now = datetime.now()
    
    if range == "week":
        start_date = now - timedelta(days=7)
    elif range == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = datetime(now.year, now.month, now.day)
        
    tokens_in_range = db.query(Token).filter(
        Token.clinic_id == clinic_id,
        Token.created_at >= start_date
    ).all()
    
    token_ids = [t.id for t in tokens_in_range]
    logs = db.query(ConsultationLog).filter(ConsultationLog.token_id.in_(token_ids)).all() if token_ids else []
    
    durations = [log.duration_minutes for log in logs]
    avg_time = round(sum(durations) / len(durations), 1) if durations else 5.0
    fastest = min(durations) if durations else 5
    longest = max(durations) if durations else 5
    
    total_served = db.query(Token).filter(
        Token.clinic_id == clinic_id,
        Token.status == "done",
        Token.created_at >= start_date
    ).count()
    
    total_tokens = db.query(Token).filter(
        Token.clinic_id == clinic_id,
        Token.created_at >= start_date
    ).count()
    
    no_shows = db.query(Token).filter(
        Token.clinic_id == clinic_id,
        Token.status == "no_show",
        Token.created_at >= start_date
    ).count()
    
    no_show_rate = round((no_shows / total_tokens) * 100, 1) if total_tokens > 0 else 0.0
    
    served_tokens = db.query(Token).filter(
        Token.clinic_id == clinic_id,
        Token.status.in_(["serving", "done"]),
        Token.created_at >= start_date,
        Token.served_time.isnot(None)
    ).all()
    
    wait_times = []
    for t in served_tokens:
        delta = (t.served_time - t.arrival_time).total_seconds() / 60.0
        if delta > 0:
            wait_times.append(delta)
            
    avg_wait_time = round(sum(wait_times) / len(wait_times), 1) if wait_times else 12.5
    
    # Busiest hours heatmap (counts grouped by hour)
    hour_counts = {}
    for h in range(9, 18):
        ampm = "AM" if h < 12 else "PM"
        display_h = h if h <= 12 else h - 12
        hour_str = f"{display_h:02d}:00 {ampm}"
        hour_counts[hour_str] = 0
        
    for t in tokens_in_range:
        h = t.created_at.hour
        if 9 <= h <= 17:
            ampm = "AM" if h < 12 else "PM"
            display_h = h if h <= 12 else h - 12
            hour_str = f"{display_h:02d}:00 {ampm}"
            hour_counts[hour_str] = hour_counts.get(hour_str, 0) + 1
            
    busiest_hours = [{"hour": k, "count": v} for k, v in hour_counts.items()]
    
    trend_points = []
    sorted_logs = sorted(logs, key=lambda x: x.timestamp)
    for log in sorted_logs:
        trend_points.append({
            "time": log.timestamp.strftime("%I:%M %p"),
            "duration": log.duration_minutes
        })
        
    return {
        "today_average": avg_time,
        "fastest": fastest,
        "longest": longest,
        "total_served": total_served,
        "no_show_rate": no_show_rate,
        "average_wait_time": avg_wait_time,
        "busiest_hours": busiest_hours,
        "trend": trend_points
    }

@app.get("/api/admin/clinic/{id}/settings", response_model=ClinicSettingsResponse)
def get_clinic_settings(id: int, current_user: StaffUser = Depends(get_current_user), db: Session = Depends(get_db)):
    clinic = db.query(Clinic).filter(Clinic.id == id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return clinic

@app.put("/api/admin/clinic/{id}/settings", response_model=ClinicSettingsResponse)
def put_clinic_settings(id: int, req: ClinicSettingsUpdateRequest, current_user: StaffUser = Depends(get_current_user), db: Session = Depends(get_db)):
    clinic = db.query(Clinic).filter(Clinic.id == id).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    clinic.name = req.name
    clinic.expected_daily_start = req.expected_daily_start
    clinic.avg_slot_duration = req.avg_slot_duration
    db.commit()
    db.refresh(clinic)
    return clinic

@app.get("/api/admin/staff", response_model=List[StaffUserResponse])
def get_staff_users(current_user: StaffUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(StaffUser).filter(StaffUser.clinic_id == current_user.clinic_id).all()

@app.post("/api/admin/staff", response_model=StaffUserResponse)
def create_staff_user(req: StaffUserCreateRequest, current_user: StaffUser = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(StaffUser).filter(StaffUser.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = StaffUser(
        clinic_id=current_user.clinic_id,
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.delete("/api/admin/staff/{id}")
def delete_staff_user(id: int, current_user: StaffUser = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(StaffUser).filter(StaffUser.id == id, StaffUser.clinic_id == current_user.clinic_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Staff user not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    db.delete(user)
    db.commit()
    return {"status": "deleted"}

@app.get("/api/admin/notifications-log", response_model=List[NotificationSubscriptionResponse])
def get_notifications_log(current_user: StaffUser = Depends(get_current_user), db: Session = Depends(get_db)):
    subs = db.query(NotificationSubscription).all()
    res = []
    for s in subs:
        token = db.query(Token).filter(Token.id == s.token_id).first()
        token_num = token.token_number if token else 0
        res.append(NotificationSubscriptionResponse(
            id=s.id,
            patient_id=s.patient_id,
            token_number=token_num,
            trigger_type=s.trigger_type,
            threshold=s.threshold
        ))
    return res

