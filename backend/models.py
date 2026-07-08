from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import relationship
from .database import Base

class Clinic(Base):
    __tablename__ = "clinics"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    doctor_status = Column(String, default="Available") # Available, Delayed, On Break, Not Started
    expected_start_time = Column(String, nullable=True)
    delay_reason = Column(String, nullable=True)
    expected_daily_start = Column(String, default="09:00 AM")
    avg_slot_duration = Column(Integer, default=10) # in minutes
    doctor_delay_minutes = Column(Integer, default=0)
    
    tokens = relationship("Token", back_populates="clinic")

class Token(Base):
    __tablename__ = "tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    token_number = Column(Integer, nullable=False)
    patient_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    status = Column(String, default="waiting") # waiting, serving, done, no_show, cancelled
    created_at = Column(DateTime, default=func.now())
    arrival_time = Column(DateTime, default=func.now())
    served_time = Column(DateTime, nullable=True)
    
    clinic = relationship("Clinic", back_populates="tokens")
    consultation_log = relationship("ConsultationLog", back_populates="token", uselist=False)

class ConsultationLog(Base):
    __tablename__ = "consultation_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey("tokens.id"), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=func.now())
    
    token = relationship("Token", back_populates="consultation_log")

class NotificationSubscription(Base):
    __tablename__ = "notification_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, nullable=False) # client identifier
    token_id = Column(Integer, ForeignKey("tokens.id"), nullable=True)
    trigger_type = Column(String, nullable=False) # "patients_left", "doctor_arrival"
    threshold = Column(Integer, nullable=True) # e.g. notify when N patients left

class StaffUser(Base):
    __tablename__ = "staff_users"
    
    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"), nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False) # admin, doctor, receptionist

