"""
Inquiries REST Endpoints for Marine Freight Inquiries.
"""

from fastapi import APIRouter, status, HTTPException
from typing import List
from ..models import InquiryCreate, InquiryRecord, InquiryUpdate
from ..db import save_inquiry, get_all_inquiries, update_inquiry, update_inquiry_by_session

router = APIRouter(prefix="/api/inquiries", tags=["Inquiries"])


@router.post("", response_model=InquiryRecord, status_code=status.HTTP_201_CREATED)
async def create_inquiry(inquiry: InquiryCreate):
    """
    Ingest a new freight inquiry captured by the voice agent.
    Saves to Supabase asynchronously.
    """
    try:
        record = await save_inquiry(inquiry)
        return record
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record inquiry: {str(e)}")


@router.get("", response_model=List[InquiryRecord])
async def list_inquiries():
    """
    Get all recorded freight inquiries for the frontend dashboard.
    """
    return await get_all_inquiries()


@router.patch("/session/{session_id}", response_model=InquiryRecord)
async def modify_inquiry_by_session(session_id: str, updates: InquiryUpdate):
    """
    Update an existing inquiry record by live LiveKit session ID.
    Used for live conversational corrections.
    """
    updated = await update_inquiry_by_session(session_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Inquiry for session '{session_id}' not found.")
    return updated


@router.patch("/{inquiry_id}", response_model=InquiryRecord)
@router.put("/{inquiry_id}", response_model=InquiryRecord)
async def modify_inquiry(inquiry_id: str, updates: InquiryUpdate):
    """
    Update an existing inquiry record.
    Persists changes to Supabase and cache.
    """
    updated = await update_inquiry(inquiry_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Inquiry with ID '{inquiry_id}' not found.")
    return updated

