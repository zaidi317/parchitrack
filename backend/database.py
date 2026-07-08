import os
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./parchitrack.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

import hashlib

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from .models import Clinic, Token, ConsultationLog, NotificationSubscription, StaffUser
    
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Seed Clinic
        clinic = db.query(Clinic).filter(Clinic.id == 1).first()
        if not clinic:
            clinic = Clinic(
                id=1,
                name="CareFirst Clinic",
                doctor_status="Delayed",
                expected_start_time="10:30 AM",
                delay_reason="Previous consultation",
                expected_daily_start="09:00 AM",
                avg_slot_duration=10,
                doctor_delay_minutes=20
            )
            db.add(clinic)
            db.commit()
            db.refresh(clinic)
        
        # 1b. Seed Staff Account
        staff = db.query(StaffUser).filter(StaffUser.email == "admin@parchitrack.test").first()
        if not staff:
            staff = StaffUser(
                clinic_id=1,
                email="admin@parchitrack.test",
                password_hash=hash_password("admin123"),
                role="admin"
            )
            db.add(staff)
            db.commit()
        
        # 2. Seed Tokens
        # If no tokens exist, create them
        if db.query(Token).count() == 0:
            now = datetime.now()
            # Seed past tokens (1 to 17) as 'done'
            past_names = [
                "Alice Smith", "Bob Jones", "Charlie Brown", "David Miller", 
                "Eva Green", "Frank Wright", "Grace Hopper", "Henry Ford",
                "Isabella Ross", "Jack Ryan", "Karen Page", "Leo Messi",
                "Mia Wallace", "Nathan Drake", "Olivia Wilde", "Paul Rudd",
                "Quentin Tarantino"
            ]
            durations = [5, 4, 6, 5, 4, 6, 5, 5, 4, 6, 5, 5, 5, 5, 5, 5, 5]
            
            for i, name in enumerate(past_names, 1):
                arr_time = now - timedelta(hours=4, minutes=(17-i)*12)
                duration = durations[i-1] if i-1 < len(durations) else 5
                serv_time = arr_time + timedelta(minutes=5) # waited 5 mins
                
                tok = Token(
                    clinic_id=1,
                    token_number=i,
                    patient_name=name,
                    phone_number=f"+1555000{i:02d}",
                    status="done",
                    created_at=arr_time,
                    arrival_time=arr_time,
                    served_time=serv_time
                )
                db.add(tok)
            db.commit()
            
            # Seed serving token (18)
            arr_time_18 = now - timedelta(minutes=20)
            serv_time_18 = now - timedelta(minutes=5)
            serving_tok = Token(
                clinic_id=1,
                token_number=18,
                patient_name="John Doe",
                phone_number="+155500018",
                status="serving",
                created_at=arr_time_18,
                arrival_time=arr_time_18,
                served_time=serv_time_18
            )
            db.add(serving_tok)
            
            # Seed waiting tokens (19 to 26)
            waiting_names = [
                "Sarah Connor", "Alex Mercer", "Emma Watson", "Bruce Wayne",
                "Clark Kent", "Diana Prince", "Peter Parker", "Tony Stark"
            ]
            for i, name in enumerate(waiting_names, 19):
                waiting_tok = Token(
                    clinic_id=1,
                    token_number=i,
                    patient_name=name,
                    phone_number=f"+1555000{i}",
                    status="waiting",
                    created_at=now - timedelta(minutes=5),
                    arrival_time=now - timedelta(minutes=5)
                )
                db.add(waiting_tok)
            
            # Seed user's token (27)
            user_tok = Token(
                clinic_id=1,
                token_number=27,
                patient_name="You (Patient)",
                phone_number="+155500027",
                status="waiting",
                created_at=now,
                arrival_time=now
            )
            db.add(user_tok)
            db.commit()

        # 3. Seed Consultation Logs
        if db.query(ConsultationLog).count() == 0:
            durations = [5, 4, 6, 5, 4, 6, 5, 5, 4, 6, 5, 5, 5, 5, 5, 5, 5]
            done_tokens = db.query(Token).filter(Token.status == "done").order_by(Token.token_number).all()
            
            for idx, tok in enumerate(done_tokens):
                duration = durations[idx] if idx < len(durations) else 5
                log = ConsultationLog(
                    token_id=tok.id,
                    duration_minutes=duration,
                    timestamp=tok.served_time + timedelta(minutes=duration)
                )
                db.add(log)
            db.commit()
            
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()
