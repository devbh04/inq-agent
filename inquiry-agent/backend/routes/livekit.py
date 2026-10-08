"""
LiveKit Integration Endpoints: WebRTC Token Generation & Outbound SIP Dispatch.
"""

import os
import json
import random
import logging
from fastapi import APIRouter, HTTPException
from livekit import api
from ..config import settings
from ..models import TokenRequest, TokenResponse, OutboundCallRequest

logger = logging.getLogger("backend-livekit")
router = APIRouter(prefix="/api", tags=["LiveKit"])


@router.post("/token", response_model=TokenResponse)
@router.get("/token", response_model=TokenResponse)
async def generate_connection_token(req: TokenRequest = TokenRequest()):
    """
    Generate a LiveKit JWT token for the browser frontend WebRTC client.
    """
    room_name = req.room_name or f"test-room-{random.randint(1000, 9999)}"
    participant_name = req.participant_name or f"web-user-{random.randint(100, 999)}"

    api_key = settings.LIVEKIT_API_KEY
    api_secret = settings.LIVEKIT_API_SECRET
    lk_url = settings.LIVEKIT_URL

    if not (api_key and api_secret and lk_url):
        raise HTTPException(
            status_code=500,
            detail="LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be configured."
        )

    try:
        # Create LiveKit Access Token
        token = api.AccessToken(api_key, api_secret) \
            .with_identity(participant_name) \
            .with_name(participant_name) \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            ))

        jwt_token = token.to_jwt()
        return TokenResponse(token=jwt_token, url=lk_url, room_name=room_name)
    except Exception as e:
        logger.error("Failed to generate LiveKit token: %s", e)
        raise HTTPException(status_code=500, detail=f"Token creation failed: {str(e)}")


@router.post("/calls/dispatch")
async def dispatch_outbound_call(payload: OutboundCallRequest):
    """
    Dispatches the Shubh agent to dial a customer's phone number via Vobiz SIP trunk.
    """
    phone = payload.to_phone.strip()
    if not phone.startswith("+"):
        raise HTTPException(status_code=400, detail="Phone number must start with '+' and country code (e.g. +919876543210)")

    lk_url = settings.LIVEKIT_URL
    api_key = settings.LIVEKIT_API_KEY
    api_secret = settings.LIVEKIT_API_SECRET

    if not (lk_url and api_key and api_secret):
        raise HTTPException(status_code=500, detail="LiveKit credentials not configured.")

    lk_api = api.LiveKitAPI(url=lk_url, api_key=api_key, api_secret=api_secret)
    room_name = f"call-{phone.replace('+', '')}-{random.randint(1000, 9999)}"

    metadata = {
        "phone_number": phone,
        "from_number": payload.from_phone or settings.VOBIZ_OUTBOUND_NUMBER,
        "sip_headers": payload.headers or {},
    }

    try:
        dispatch_req = api.CreateAgentDispatchRequest(
            agent_name="eximple-shubh",
            room=room_name,
            metadata=json.dumps(metadata),
        )
        dispatch = await lk_api.agent_dispatch.create_dispatch(dispatch_req)
        logger.info("Successfully dispatched agent %s to room %s (dispatch_id=%s)", "eximple-shubh", room_name, dispatch.id)

        return {
            "status": "dispatched",
            "dispatch_id": dispatch.id,
            "room_name": room_name,
            "phone_number": phone,
            "message": f"Agent dispatched to call {phone} via Vobiz SIP Trunk.",
        }
    except Exception as e:
        logger.error("Error creating agent dispatch: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to dispatch call: {str(e)}")
    finally:
        await lk_api.aclose()
