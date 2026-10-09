"""
Database Layer supporting Supabase with Local In-Memory Fallback.
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from .config import settings
from .models import InquiryCreate, InquiryRecord, InquiryUpdate, CallCostReport

logger = logging.getLogger("backend-db")

supabase_client = None

if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY and "supabase.co" in settings.SUPABASE_URL:
    try:
        from supabase import create_client, Client
        supabase_client: Optional[Client] = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY
        )
        logger.info("Connected to Supabase at %s", settings.SUPABASE_URL)
    except Exception as e:
        logger.warning("Could not initialize Supabase client: %s. Using in-memory store.", e)
else:
    logger.info("No Supabase credentials configured. Using local in-memory store.")

# Local in-memory caches
_inquiries_db: List[InquiryRecord] = []
_call_sessions_db: List[CallCostReport] = []


async def _async_sync_create_to_bcp(record: InquiryRecord) -> None:
    """Background task to replicate newly created inquiry to BCP."""
    try:
        from .services.bcp_client import sync_create_inquiry_to_bcp
        res = await sync_create_inquiry_to_bcp(record)
        if res:
            bcp_id, srn = res
            record.bcp_inquiry_id = bcp_id
            record.bcp_reference_number = srn

            # Update in-memory cache
            for i, inq in enumerate(_inquiries_db):
                if inq.id == record.id:
                    _inquiries_db[i] = record
                    break

            # Update Supabase if available
            if supabase_client:
                try:
                    supabase_client.table("inquiries").update({
                        "bcp_inquiry_id": bcp_id,
                        "bcp_reference_number": srn,
                    }).eq("id", str(record.id)).execute()
                    logger.info("Updated Supabase record %s with BCP IDs: %s / %s", record.id, bcp_id, srn)
                except Exception as e:
                    logger.debug("Could not update BCP IDs in Supabase (column may not exist yet): %s", e)
    except Exception as e:
        logger.error("Background BCP create sync failed for inquiry %s: %s", record.id, e)


async def _async_sync_update_to_bcp(bcp_id: str, updates: InquiryUpdate, phone: Optional[str]) -> None:
    """Background task to push inquiry updates to BCP."""
    try:
        from .services.bcp_client import sync_update_inquiry_to_bcp
        await sync_update_inquiry_to_bcp(bcp_id, updates, phone)
    except Exception as e:
        logger.error("Background BCP update sync failed for BCP inquiry %s: %s", bcp_id, e)


async def save_inquiry(inquiry_data: InquiryCreate) -> InquiryRecord:
    """Save a newly created inquiry to Supabase or local store and sync to BCP."""
    import asyncio
    record = InquiryRecord(**inquiry_data.model_dump())
    
    if supabase_client:
        try:
            payload = record.model_dump()
            payload["created_at"] = record.created_at.isoformat()
            payload["updated_at"] = record.updated_at.isoformat()
            res = supabase_client.table("inquiries").insert(payload).execute()
            if res.data:
                logger.info("Saved inquiry to Supabase: %s", record.id)
                _inquiries_db.insert(0, record)
                asyncio.create_task(_async_sync_create_to_bcp(record))
                return record
        except Exception as e:
            logger.warning("Direct insert into Supabase inquiries failed: %s. Trying schema fallback...", e)
            try:
                fallback_payload = dict(payload)
                if "load_type" in fallback_payload:
                    lt = fallback_payload.pop("load_type")
                    fallback_payload["notes"] = f"[{lt}] {fallback_payload.get('notes') or ''}".strip()
                fallback_payload.pop("whatsapp_opt_in", None)
                fallback_payload.pop("whatsapp_number", None)
                fallback_payload.pop("bcp_inquiry_id", None)
                fallback_payload.pop("bcp_reference_number", None)
                res = supabase_client.table("inquiries").insert(fallback_payload).execute()
                if res.data:
                    logger.info("Saved inquiry to Supabase with fallback payload: %s", record.id)
                    _inquiries_db.insert(0, record)
                    asyncio.create_task(_async_sync_create_to_bcp(record))
                    return record
            except Exception as e2:
                logger.error("Failed inserting into Supabase inquiries table: %s. Storing in memory.", e2)

    _inquiries_db.insert(0, record)
    logger.info("Saved inquiry to in-memory store: %s", record.id)
    import asyncio
    asyncio.create_task(_async_sync_create_to_bcp(record))
    return record


async def update_inquiry(inquiry_id: str, updates: InquiryUpdate) -> Optional[InquiryRecord]:
    """Update an existing inquiry record by ID and sync updates to BCP."""
    import asyncio
    update_data = {k: v for k, v in updates.model_dump(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()

    updated_record: Optional[InquiryRecord] = None

    if supabase_client:
        try:
            res = supabase_client.table("inquiries").update(update_data).eq("id", inquiry_id).execute()
            if res.data and len(res.data) > 0:
                logger.info("Updated inquiry in Supabase: %s", inquiry_id)
                # pyrefly: ignore [bad-unpacking]
                updated_record = InquiryRecord(**res.data[0])
        except Exception as e:
            logger.warning("Supabase update error: %s. Falling back to local update.", e)

    # Update in-memory record
    for i, inq in enumerate(_inquiries_db):
        if str(inq.id) == str(inquiry_id):
            curr = inq.model_dump()
            curr.update({k: v for k, v in update_data.items() if k != "updated_at"})
            curr["updated_at"] = datetime.utcnow()
            new_record = InquiryRecord(**curr)
            _inquiries_db[i] = new_record
            if not updated_record:
                updated_record = new_record
            break

    # Dispatch update to BCP if linked
    if updated_record and updated_record.bcp_inquiry_id:
        phone = updated_record.whatsapp_number or updated_record.caller_number
        asyncio.create_task(_async_sync_update_to_bcp(updated_record.bcp_inquiry_id, updates, phone))

    return updated_record


async def update_inquiry_by_session(session_id: str, updates: InquiryUpdate) -> Optional[InquiryRecord]:
    """Update an existing inquiry record by session ID and sync updates to BCP."""
    import asyncio
    update_data = {k: v for k, v in updates.model_dump(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()

    updated_record: Optional[InquiryRecord] = None

    if supabase_client:
        try:
            res = supabase_client.table("inquiries").update(update_data).eq("session_id", session_id).execute()
            if res.data and len(res.data) > 0:
                logger.info("Updated inquiry in Supabase for session: %s", session_id)
                # pyrefly: ignore [bad-unpacking]
                updated_record = InquiryRecord(**res.data[0])
        except Exception as e:
            logger.warning("Supabase update by session error: %s. Falling back to local update.", e)

    # Update in-memory record
    for i, inq in enumerate(_inquiries_db):
        if str(inq.session_id) == str(session_id):
            curr = inq.model_dump()
            curr.update({k: v for k, v in update_data.items() if k != "updated_at"})
            curr["updated_at"] = datetime.utcnow()
            new_record = InquiryRecord(**curr)
            _inquiries_db[i] = new_record
            if not updated_record:
                updated_record = new_record
            break

    # Dispatch update to BCP if linked
    if updated_record and updated_record.bcp_inquiry_id:
        phone = updated_record.whatsapp_number or updated_record.caller_number
        asyncio.create_task(_async_sync_update_to_bcp(updated_record.bcp_inquiry_id, updates, phone))

    return updated_record


async def get_all_inquiries() -> List[InquiryRecord]:
    """Retrieve all inquiries sorted by creation date."""
    if supabase_client:
        try:
            res = supabase_client.table("inquiries").select("*").order("created_at", desc=True).limit(50).execute()
            if res.data:
                # pyrefly: ignore [bad-unpacking]
                return [InquiryRecord(**row) for row in res.data]
        except Exception as e:
            logger.warning("Could not fetch inquiries from Supabase: %s. Returning in-memory list.", e)

    return _inquiries_db


async def save_call_cost_report(report: CallCostReport) -> CallCostReport:
    """Save call telemetry and cost metrics."""
    if supabase_client:
        try:
            payload = report.model_dump()
            payload["created_at"] = report.created_at.isoformat()
            res = supabase_client.table("call_sessions").insert(payload).execute()
            if res.data:
                logger.info("Saved call cost report to Supabase: %s", report.session_id)
                _call_sessions_db.insert(0, report)
                return report
        except Exception as e:
            logger.warning("Direct insert into Supabase call_sessions failed: %s. Trying fallback schema...", e)
            try:
                fallback_payload = dict(payload)
                if "transcript" in fallback_payload:
                    fallback_payload.pop("transcript", None)
                res = supabase_client.table("call_sessions").insert(fallback_payload).execute()
                if res.data:
                    logger.info("Saved call cost report with fallback schema: %s", report.session_id)
                    _call_sessions_db.insert(0, report)
                    return report
            except Exception as e2:
                logger.error("Failed inserting call session to Supabase: %s", e2)

    _call_sessions_db.insert(0, report)
    logger.info("Saved call session to in-memory store: %s", report.session_id)
    return report


async def get_call_sessions() -> List[CallCostReport]:
    """Retrieve all call telemetry records."""
    if supabase_client:
        try:
            res = supabase_client.table("call_sessions").select("*").order("created_at", desc=True).limit(50).execute()
            if res.data:
                # pyrefly: ignore [bad-unpacking]
                return [CallCostReport(**row) for row in res.data]
        except Exception as e:
            logger.warning("Could not fetch call sessions from Supabase: %s", e)

    return _call_sessions_db
