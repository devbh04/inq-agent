"""
Vobiz SIP Trunk Integration and Dialing Handler.
Manages outbound PSTN participant creation and inbound header correlation.
"""

import os
import json
import logging
from typing import Optional, Dict, Any
from livekit import api
from livekit.protocol import sip as sip_protocol

logger = logging.getLogger("sip-dialer")

OUTBOUND_TRUNK_ID = os.getenv("OUTBOUND_TRUNK_ID")
SIP_DOMAIN = os.getenv("VOBIZ_SIP_DOMAIN", "sip.vobiz.ai")
VOBIZ_OUTBOUND_NUMBER = os.getenv("VOBIZ_OUTBOUND_NUMBER", "")


def extract_sip_metadata(job_metadata: Optional[str]) -> Dict[str, Any]:
    """Parse JSON metadata passed into the LiveKit Job."""
    if not job_metadata:
        return {}
    try:
        return json.loads(job_metadata)
    except Exception as e:
        logger.warning("Could not parse job metadata JSON: %s (raw=%r)", e, job_metadata)
        return {}


def log_sip_participant_details(participant) -> None:
    """Dump SIP headers and correlation attributes for debugging."""
    attrs = dict(participant.attributes or {})
    logger.info("================ SIP PARTICIPANT DETAILS ================")
    logger.info("Identity: %s | Name: %s | Kind: %s", participant.identity, participant.name, getattr(participant, "kind", "?"))
    
    correlation_keys = [
        "sip.callID", "sip.callIDFull", "sip.callStatus", "sip.trunkID",
        "sip.ruleID", "sip.phoneNumber", "sip.trunkPhoneNumber", "sip.host"
    ]
    for key in correlation_keys:
        if key in attrs:
            logger.info("  %-24s: %s", key, attrs[key])

    # Log any custom Vobiz X-VH-* forwarded headers
    sip_h = {k: v for k, v in attrs.items() if k.startswith("sip.h.")}
    if sip_h:
        logger.info("  --- Forwarded SIP Headers ---")
        for k, v in sip_h.items():
            logger.info("  %-24s: %s", k, v)
    logger.info("=========================================================")


async def initiate_outbound_sip_call(
    lk_api: api.LiveKitAPI,
    room_name: str,
    phone_number: str,
    from_number: Optional[str] = None,
    custom_headers: Optional[Dict[str, str]] = None,
) -> bool:
    """
    Creates a SIP participant in the LiveKit room to dial the destination phone number via Vobiz.
    """
    trunk_id = OUTBOUND_TRUNK_ID or os.getenv("OUTBOUND_TRUNK_ID")
    if not trunk_id:
        logger.error("OUTBOUND_TRUNK_ID is not configured in environment!")
        return False

    caller_id = from_number or VOBIZ_OUTBOUND_NUMBER
    logger.info("Initiating outbound SIP call via trunk %s to %s (caller_id=%s)", trunk_id, phone_number, caller_id)

    try:
        req = api.CreateSIPParticipantRequest(
            room_name=room_name,
            sip_trunk_id=trunk_id,
            sip_call_to=phone_number,
            participant_identity=f"sip_{phone_number.replace('+', '')}",
            wait_until_answered=True,  # Wait for answer before connecting agent
            headers=custom_headers or {},
            include_headers=sip_protocol.SIP_X_HEADERS,
            sip_number=caller_id,
        )
        await lk_api.sip.create_sip_participant(req)
        logger.info("Outbound call to %s was answered!", phone_number)
        return True
    except Exception as e:
        logger.error("Failed to place outbound SIP call to %s: %s", phone_number, e)
        return False
