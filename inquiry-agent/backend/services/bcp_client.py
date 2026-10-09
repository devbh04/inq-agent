"""
Client service for replicating and modulating inquiries to Eximple Backend Customer Platform (BCP).
Supports HMAC-SHA256 request signing and multi-environment dispatch (local, staging, prod).
"""

import os
import re
import time
import json
import hmac
import base64
import hashlib
import logging
from typing import Optional, Tuple, Dict, Any
import httpx
from ..config import settings
from ..models import InquiryRecord, InquiryUpdate

logger = logging.getLogger("bcp-client")

# Marine Freight Service UUID from BCP catalog
MARINE_FREIGHT_SERVICE_ID = "d9bc0ad4-2e4f-4c0a-8b55-90f2fc4cf004"

SIGNATURE_VERSION = "v1"


def build_signed_headers(body: dict, secret: str, key_id: str) -> tuple[dict[str, str], bytes]:
    """
    Sign a JSON request body using HMAC-SHA256 according to BCP's whatsappAgentAuthMiddleware spec.
    Returns (headers_dict, raw_body_bytes).
    """
    raw_body = json.dumps(body, separators=(",", ":"), ensure_ascii=False, default=str)
    timestamp = str(int(time.time()))

    payload = f"{SIGNATURE_VERSION}.{timestamp}.{raw_body}"
    digest = hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).digest()
    signature = f"{SIGNATURE_VERSION}={base64.b64encode(digest).decode('utf-8')}"

    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Key-Id": key_id,
        "X-Webhook-Signature": signature,
    }
    return headers, raw_body.encode("utf-8")


def normalize_phone_number(raw_phone: Optional[str]) -> Optional[str]:
    """
    Normalize phone number to standard E.164 format (e.g., +919876543210).
    """
    if not raw_phone:
        return None
    cleaned = re.sub(r"[^\d+]", "", raw_phone.strip())
    if not cleaned or cleaned.lower() == "unknown":
        return None

    # Handle Indian mobile numbers with leading 0 (e.g., 09970239129 -> 9970239129)
    if len(cleaned) == 11 and cleaned.startswith("0"):
        cleaned = cleaned[1:]

    # If it is a 10-digit Indian mobile number without country code, prepend +91
    if len(cleaned) == 10 and not cleaned.startswith("+"):
        return f"+91{cleaned}"
    # If 12 digits starting with 91, ensure leading +
    if len(cleaned) == 12 and cleaned.startswith("91"):
        return f"+{cleaned}"
    if not cleaned.startswith("+"):
        return f"+{cleaned}"
    return cleaned


def sanitize_company_name(name: str) -> str:
    """Clean company name for BCP lookup (e.g., 'Entry Point.SH' -> 'Entry Point Sh')."""
    if not name:
        return ""
    cleaned = re.sub(r"\.(?=[A-Za-z0-9])", " ", name)
    cleaned = re.sub(r"[^\w\s\-&]", "", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def resolve_bcp_container_type(raw_type: Optional[str]) -> str:
    """
    Maps shorthand container names to BCP's canonical container types:
    '20GP' -> '20ft Standard'
    '40GP' -> '40ft Standard'
    '40HC' -> '40ft High Cube'
    '20HC' -> '20ft High Cube'
    'Reefer' -> '40ft Reefer High Cube'
    '20 Reefer' -> '20ft Reefer'
    'ISO Tank' -> '20ft ISO Tank'
    """
    if not raw_type:
        return "20ft Standard"

    cleaned = raw_type.strip().lower()
    if "40" in cleaned and ("hc" in cleaned or "high cube" in cleaned or "hq" in cleaned):
        return "40ft High Cube"
    if "20" in cleaned and ("hc" in cleaned or "high cube" in cleaned):
        return "20ft High Cube"
    if "40" in cleaned and "reefer" in cleaned:
        return "40ft Reefer High Cube"
    if "20" in cleaned and "reefer" in cleaned:
        return "20ft Reefer"
    if "reefer" in cleaned:
        return "40ft Reefer High Cube"
    if "iso" in cleaned or "tank" in cleaned:
        return "20ft ISO Tank"
    if "40" in cleaned:
        return "40ft Standard"
    if "20" in cleaned:
        return "20ft Standard"

    return "20ft Standard"


async def sync_create_inquiry_to_bcp(record: InquiryRecord) -> Optional[Tuple[str, str]]:
    """
    Modulate and dispatch a newly created inquiry to BCP.
    Returns (bcp_inquiry_id, shipment_reference_number) or None if request fails.
    """
    base_url = settings.bcp_base_url
    secret = settings.bcp_webhook_secret
    key_id = settings.bcp_webhook_key_id
    sales_rep_id = settings.BCP_SALES_REP_ID or 2

    # Determine caller phone
    phone = (
        normalize_phone_number(record.whatsapp_number)
        or normalize_phone_number(record.caller_number)
        or "+919999999999"
    )

    canonical_container = resolve_bcp_container_type(record.container_type)
    containers = [{"type": canonical_container, "qty": 1}] if record.load_type == "FCL" else []
    clean_company = sanitize_company_name(record.company_name) or record.company_name

    # Build modulated body matching BCP createInquiry schema
    body = {
        "name": f"{clean_company} - {record.pol} to {record.pod}",
        "companyName": clean_company,
        "phoneNumber": phone,
        "status": "open",
        "sourceChannel": "call",  # Explicitly stamp calling/voice agent channel
        "sourceAddress": phone,
        "portOfLoading": record.pol,
        "portOfDestination": record.pod,
        "descriptionOfGoods": record.cargo,
        "cargoDescription": record.cargo,
        "containerLoadType": record.load_type,
        "containers": containers,
        "quantity": 1,
        "incoTerms": "FOB",
        "services": [MARINE_FREIGHT_SERVICE_ID],
        "remarks": f"[Voice Agent Session {record.session_id}] {record.notes or ''}".strip(),
    }

    url = f"{base_url}/whatsapp-agent/inquiries/{sales_rep_id}"

    try:
        if secret and key_id:
            headers, body_bytes = build_signed_headers(body, secret, key_id)
        else:
            # Fallback headers if secret not configured (e.g. local dev without webhook secret)
            headers = {
                "Content-Type": "application/json",
                "x-voice-agent-key": settings.bcp_voice_agent_key or "eximple_voice_agent_internal_secret_key_2026",
            }
            body_bytes = json.dumps(body).encode("utf-8")

        logger.info(
            "Syncing inquiry to BCP (%s) | url=%s | key_id=%s | phone=%s | POL=%s | POD=%s",
            settings.BCP_ENV, url, key_id, phone, record.pol, record.pod
        )

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, content=body_bytes, headers=headers)
            if resp.status_code in (200, 201):
                res_data = resp.json().get("data", {})
                bcp_id = res_data.get("id")
                srn = res_data.get("shipmentReferenceNumber")
                logger.info(
                    "Successfully replicated inquiry to BCP | bcp_id=%s | srn=%s",
                    bcp_id, srn
                )
                return (str(bcp_id), str(srn))
            else:
                logger.warning(
                    "BCP returned non-success status (%d): %s",
                    resp.status_code, resp.text[:500]
                )
                # In local mode, also try /voice-agent/inquiries as fallback if /whatsapp-agent rejected
                if settings.BCP_ENV.lower() == "local" and "/whatsapp-agent" in url:
                    return await _fallback_local_voice_agent_create(base_url, body)

    except Exception as exc:
        logger.error("Error dispatching inquiry to BCP at %s: %s", url, exc)

    return None


async def sync_update_inquiry_to_bcp(
    bcp_inquiry_id: str,
    updates: InquiryUpdate,
    phone: Optional[str] = None
) -> bool:
    """
    Modulate and dispatch live inquiry updates to BCP via PUT /whatsapp-agent/inquiries/:id.
    """
    if not bcp_inquiry_id:
        logger.debug("Skipping BCP update: no bcp_inquiry_id associated with record.")
        return False

    base_url = settings.bcp_base_url
    secret = settings.bcp_webhook_secret
    key_id = settings.bcp_webhook_key_id
    url = f"{base_url}/whatsapp-agent/inquiries/{bcp_inquiry_id}"

    body: Dict[str, Any] = {}
    normalized_phone = normalize_phone_number(updates.whatsapp_number) or normalize_phone_number(phone)
    if normalized_phone:
        body["phoneNumber"] = normalized_phone

    if updates.company_name:
        clean_company = sanitize_company_name(updates.company_name) or updates.company_name
        body["companyName"] = clean_company
        body["name"] = clean_company
    if updates.pol:
        body["portOfLoading"] = updates.pol
    if updates.pod:
        body["portOfDestination"] = updates.pod
    if updates.cargo:
        body["descriptionOfGoods"] = updates.cargo
        body["cargoDescription"] = updates.cargo
    if updates.load_type:
        body["containerLoadType"] = updates.load_type
        if updates.load_type == "LCL":
            body["containers"] = []
        elif updates.container_type:
            canonical = resolve_bcp_container_type(updates.container_type)
            body["containers"] = [{"type": canonical, "qty": 1}]
    elif updates.container_type:
        canonical = resolve_bcp_container_type(updates.container_type)
        body["containers"] = [{"type": canonical, "qty": 1}]
    if updates.notes:
        body["remarks"] = updates.notes

    if not body:
        logger.debug("No modifiable fields present in update payload for BCP.")
        return False

    try:
        if secret and key_id:
            headers, body_bytes = build_signed_headers(body, secret, key_id)
        else:
            headers = {
                "Content-Type": "application/json",
                "x-voice-agent-key": settings.bcp_voice_agent_key or "eximple_voice_agent_internal_secret_key_2026",
            }
            body_bytes = json.dumps(body).encode("utf-8")

        logger.info(
            "Syncing inquiry update to BCP (%s) | url=%s | inquiry_id=%s | keys=%s",
            settings.BCP_ENV, url, bcp_inquiry_id, list(body.keys())
        )

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.put(url, content=body_bytes, headers=headers)
            if resp.status_code in (200, 201):
                logger.info("Successfully updated inquiry in BCP: %s", bcp_inquiry_id)
                return True
            else:
                logger.warning(
                    "BCP update returned error (%d): %s",
                    resp.status_code, resp.text[:500]
                )
    except Exception as exc:
        logger.error("Error dispatching inquiry update to BCP: %s", exc)

    return False


async def _fallback_local_voice_agent_create(base_url: str, body: dict) -> Optional[Tuple[str, str]]:
    """Fallback helper for local testing against /voice-agent/inquiries."""
    voice_url = f"{base_url}/voice-agent/inquiries"
    voice_key = settings.bcp_voice_agent_key or "eximple_voice_agent_internal_secret_key_2026"
    headers = {
        "Content-Type": "application/json",
        "x-voice-agent-key": voice_key,
    }
    logger.info("Attempting local fallback to /voice-agent/inquiries at %s", voice_url)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(voice_url, json=body, headers=headers)
            if resp.status_code in (200, 201):
                data = resp.json().get("data", {})
                bcp_id = data.get("id")
                srn = data.get("shipmentReferenceNumber")
                logger.info("Local fallback created inquiry in BCP | bcp_id=%s | srn=%s", bcp_id, srn)
                return (str(bcp_id), str(srn))
    except Exception as e:
        logger.warning("Local fallback to /voice-agent/inquiries failed: %s", e)
    return None
