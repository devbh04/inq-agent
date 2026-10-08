"""
Pydantic Data Schemas for Inquiries, Costs, and Telemetry.
"""

from typing import Optional, Literal, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


class InquiryCreate(BaseModel):
    session_id: str = Field(..., description="Unique LiveKit session / room ID")
    caller_number: Optional[str] = Field("unknown", description="Caller phone number or web identity")
    company_name: str = Field(..., description="Customer business name")
    pol: str = Field(..., description="Port of Loading or Origin Location")
    pod: str = Field(..., description="Port of Discharge or Destination Country/Port")
    cargo: str = Field(..., description="Cargo description and commodity")
    load_type: Literal["FCL", "LCL"] = Field("FCL", description="Full Container Load vs Less than Container Load")
    container_type: str = Field(..., description="Type of container (e.g. 20GP, 40HC, Reefer, or LCL)")
    inquiry_type: Literal["rate_only", "full_inquiry"] = Field("full_inquiry", description="Rate quote only vs full sales inquiry")
    notes: Optional[str] = None


class InquiryRecord(InquiryCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "sales_assigned"
    transcript: Optional[List[Dict[str, Any]]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class InquiryUpdate(BaseModel):
    company_name: Optional[str] = None
    pol: Optional[str] = None
    pod: Optional[str] = None
    cargo: Optional[str] = None
    load_type: Optional[Literal["FCL", "LCL"]] = None
    container_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CallCostReport(BaseModel):
    session_id: str
    room_name: str
    caller_identity: Optional[str] = "unknown"
    call_direction: Literal["inbound", "outbound", "webrtc"] = "inbound"
    duration_seconds: float = 0.0
    telephony_pulses: int = 0
    telephony_pulse_rate_inr: float = 0.45
    telephony_cost_inr: float = 0.0
    stt_audio_seconds: float = 0.0
    stt_cost_inr: float = 0.0
    llm_prompt_tokens: int = 0
    llm_completion_tokens: int = 0
    llm_cost_inr: float = 0.0
    tts_characters: int = 0
    tts_cost_inr: float = 0.0
    total_cost_inr: float = 0.0
    latency_p50_ms: Optional[float] = None
    latency_p95_ms: Optional[float] = None
    transcript: Optional[List[Dict[str, Any]]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class OutboundCallRequest(BaseModel):
    to_phone: str = Field(..., description="Destination phone number in E.164 format (e.g. +919876543210)")
    from_phone: Optional[str] = Field(None, description="Caller ID override")
    headers: Optional[Dict[str, str]] = Field(default_factory=dict, description="Custom SIP headers")


class TokenRequest(BaseModel):
    room_name: Optional[str] = None
    participant_name: Optional[str] = "Web-User"


class TokenResponse(BaseModel):
    token: str
    url: str
    room_name: str
