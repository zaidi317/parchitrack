from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class ClinicStatusResponse(BaseModel):
    id: int
    name: str
    doctor_status: str
    expected_start_time: Optional[str]
    delay_reason: Optional[str]
    doctor_delay_minutes: int

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    id: int
    clinic_id: int
    token_number: int
    patient_name: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class QueueStatusResponse(BaseModel):
    current_token: Optional[int]
    next_token: Optional[int]
    patients_waiting: int
    queue_speed: str
    last_updated: datetime

class TokenDetailsResponse(BaseModel):
    token_number: int
    patient_name: str
    status: str
    position: int
    estimated_turn: str
    patients_before: int
    queue_status: str

class TrendDataPoint(BaseModel):
    time: str
    duration: int

class ConsultationStatsResponse(BaseModel):
    today_average: float
    fastest: int
    longest: int
    queue_speed: str
    trend: List[TrendDataPoint]

class NotificationSubscribeRequest(BaseModel):
    patient_id: str
    token_number: int
    trigger_type: str  # "patients_left", "doctor_arrival"
    threshold: Optional[int] = None

# --- Admin & Auth Additions ---

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    clinic_id: int

class ClaimTokenRequest(BaseModel):
    token_number: int
    phone_number: str

class AdminTokenCreateRequest(BaseModel):
    patient_name: str
    phone_number: Optional[str] = None
    position: Optional[int] = None

class AdminTokenResponse(BaseModel):
    id: int
    clinic_id: int
    token_number: int
    patient_name: str
    phone_number: Optional[str]
    status: str
    created_at: datetime
    arrival_time: datetime
    served_time: Optional[datetime]

    class Config:
        from_attributes = True

class StaffUserCreateRequest(BaseModel):
    email: str
    password: str
    role: str

class StaffUserResponse(BaseModel):
    id: int
    clinic_id: int
    email: str
    role: str

    class Config:
        from_attributes = True

class ClinicSettingsUpdateRequest(BaseModel):
    name: str
    expected_daily_start: str
    avg_slot_duration: int

class ClinicSettingsResponse(BaseModel):
    id: int
    name: str
    expected_daily_start: str
    avg_slot_duration: int

    class Config:
        from_attributes = True

class NotificationSubscriptionResponse(BaseModel):
    id: int
    patient_id: str
    token_number: int
    trigger_type: str
    threshold: Optional[int]

    class Config:
        from_attributes = True

