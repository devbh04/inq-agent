"""
Asynchronous Non-Blocking Tool Definitions for Eximple Shanaya Voice Agent.
Dispatches inquiries and session events cleanly without stalling agent execution.
"""

import os
import asyncio
import logging
from typing import Optional, Literal
import httpx
from livekit import api
from livekit.agents import llm, JobContext

from .text_utils import to_english

logger = logging.getLogger("agent-tools")

BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000")


async def _dispatch_inquiry_to_backend(payload: dict) -> None:
    """Background coroutine that posts the inquiry payload to the FastAPI server."""
    url = f"{BACKEND_API_URL.rstrip('/')}/api/inquiries"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.is_success:
                logger.info("Successfully posted inquiry to FastAPI backend: %s", resp.json())
            else:
                logger.error("Backend error posting inquiry (%d): %s", resp.status_code, resp.text)
    except Exception as e:
        logger.error("Failed to connect to backend at %s: %s", url, e)


async def _dispatch_inquiry_update_to_backend(session_id: str, payload: dict) -> None:
    """Background coroutine that patches inquiry updates to the FastAPI server."""
    url = f"{BACKEND_API_URL.rstrip('/')}/api/inquiries/session/{session_id}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.patch(url, json=payload)
            if resp.is_success:
                logger.info("Successfully updated inquiry in FastAPI backend: %s", resp.json())
            else:
                logger.error("Backend error updating inquiry (%d): %s", resp.status_code, resp.text)
    except Exception as e:
        logger.error("Failed to connect to backend to update inquiry at %s: %s", url, e)


async def _dispatch_vobiz_hangup(ctx: JobContext, delay_seconds: float = 3.2) -> None:
    """
    Terminates the live telephony call via Vobiz SIP Trunk and tears down the session.
    1. Waits delay_seconds to allow the final farewell speech to finish transmitting to the caller.
    2. Explicitly removes remote SIP participants from the room, prompting LiveKit to emit SIP BYE to Vobiz.
    3. Deletes the LiveKit room to ensure Vobiz terminates the PSTN call immediately.
    4. Orderly teardown of the LiveKit agent worker context.
    """
    try:
        await asyncio.sleep(delay_seconds)
        room_name = ctx.room.name
        logger.info("Executing Vobiz SIP hangup for room: %s", room_name)

        # 1. Remove all remote participants (specifically the Vobiz SIP participant)
        # This causes LiveKit SIP service to send a SIP BYE request to Vobiz trunk.
        for identity in list(ctx.room.remote_participants.keys()):
            logger.info("Removing remote participant %s to disconnect Vobiz call...", identity)
            try:
                await ctx.api.room.remove_participant(
                    api.RoomParticipantIdentity(room=room_name, identity=identity)
                )
                logger.info("✅ Removed participant %s; SIP BYE sent to Vobiz", identity)
            except Exception as e:
                logger.warning("Could not remove participant %s: %s", identity, e)

        # 2. Delete the room to guarantee LiveKit terminates all trunk connections
        try:
            await ctx.api.room.delete_room(api.DeleteRoomRequest(room=room_name))
            logger.info("✅ Deleted room %s; Vobiz call terminated.", room_name)
        except Exception as e:
            logger.warning("Could not delete room %s: %s", room_name, e)

        # 3. Shutdown the agent worker job context
        ctx.shutdown(reason="caller_hangup_agreed")
    except Exception as e:
        logger.error("Error during Vobiz SIP hangup: %s", e)
        try:
            ctx.shutdown(reason="hangup_error")
        except Exception:
            pass


def build_tools(ctx: JobContext, session_id: str, caller_number=None):
    """Factory creating LLM function tools bound to the active job and session context."""

    is_registered = False

    def _resolve_caller_number() -> str:
        if callable(caller_number):
            val = caller_number()
            if val:
                return str(val)
        elif caller_number:
            return str(caller_number)
        return "unknown"

    @llm.function_tool(
        description=(
            "Register a marine freight inquiry with Eximple in English. "
            "Call this immediately as soon as you have collected: company_name, pol, pod, cargo, load_type, container_type. "
            "All arguments MUST be in English (e.g. 'Mundra', 'Jebel Ali', 'Cotton Yarn', '20GP'). "
            "DO NOT ask the customer for confirmation before calling this tool — call it immediately upon gathering details!"
        )
    )
    async def register_inquiry(
        company_name: str,
        pol: str,
        pod: str,
        cargo: str,
        load_type: Literal["FCL", "LCL"] = "FCL",
        container_type: str = "20GP",
        whatsapp_opt_in: bool = True,
        whatsapp_number: Optional[str] = None,
        notes: str = "",
    ) -> str:
        """
        Record the customer's freight inquiry.
        Runs entirely in the background so the agent never stalls.
        """
        nonlocal is_registered
        resolved_number = _resolve_caller_number()
        actual_wa_number = (whatsapp_number or resolved_number or "").strip()

        # Enforce English representation for database storage
        eng_company = to_english(company_name) or company_name.strip()
        eng_pol = to_english(pol) or pol.strip()
        eng_pod = to_english(pod) or pod.strip()
        eng_cargo = to_english(cargo) or cargo.strip()
        eng_container = to_english(container_type) or container_type.strip()
        eng_notes = to_english(notes) if notes else None

        logger.info(
            "register_inquiry tool called (is_registered=%s): Caller=%s, Company=%s, POL=%s, POD=%s, Cargo=%s, Load=%s, Container=%s, WA_OptIn=%s, WA_Number=%s",
            is_registered, resolved_number, eng_company, eng_pol, eng_pod, eng_cargo, load_type, eng_container, whatsapp_opt_in, actual_wa_number
        )

        payload = {
            "session_id": session_id,
            "caller_number": resolved_number,
            "whatsapp_opt_in": whatsapp_opt_in,
            "whatsapp_number": actual_wa_number if actual_wa_number and actual_wa_number != "unknown" else None,
            "company_name": eng_company,
            "pol": eng_pol,
            "pod": eng_pod,
            "cargo": eng_cargo,
            "load_type": load_type,
            "container_type": eng_container,
            "inquiry_type": "full_inquiry",
            "notes": eng_notes,
        }

        if is_registered:
            logger.info("Session %s already registered. Routing to update_inquiry payload.", session_id)
            asyncio.create_task(_dispatch_inquiry_update_to_backend(session_id, payload))
        else:
            is_registered = True
            asyncio.create_task(_dispatch_inquiry_to_backend(payload))

        # Immediately return instruction to the LLM (Do NOT repeat the entire inquiry)
        wa_ask = (
            "Sir, क्या हम आपको इसी number पर WhatsApp पर rates भेज सकते हैं?"
            if resolved_number and resolved_number != "unknown"
            else "Sir, किस number पर हम आपको WhatsApp पर rates भेजें?"
        )
        return (
            "STATUS: SUCCESS. Inquiry saved in Eximple database. "
            "Now speak directly to the caller in Hindi: "
            f"Say EXACTLY AND ONLY: 'Sir, आपकी inquiry note हो गई है! {wa_ask}' "
            "CRITICAL: DO NOT repeat any shipment details, company name, ports, cargo, or container types!"
        )

    @llm.function_tool(
        description=(
            "Update or correct an existing marine freight inquiry during the call if the customer corrects any detail "
            "(e.g., changes port from Mundra to Nhava Sheva, changes cargo, container type, company name) "
            "or updates their WhatsApp preference (e.g., provides a different WhatsApp number, or declines WhatsApp). "
            "Call this immediately when the customer specifies a different WhatsApp number, declines WhatsApp, or corrects any detail."
        )
    )
    async def update_inquiry(
        pol: Optional[str] = None,
        pod: Optional[str] = None,
        cargo: Optional[str] = None,
        load_type: Optional[Literal["FCL", "LCL"]] = None,
        container_type: Optional[str] = None,
        company_name: Optional[str] = None,
        whatsapp_opt_in: Optional[bool] = None,
        whatsapp_number: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> str:
        """
        Update the active session's freight inquiry with customer corrections or WhatsApp details.
        Runs entirely in the background.
        """
        logger.info(
            "update_inquiry tool called: session=%s, POL=%s, POD=%s, Cargo=%s, Load=%s, Container=%s, Company=%s, WA_OptIn=%s, WA_Number=%s, Notes=%s",
            session_id, pol, pod, cargo, load_type, container_type, company_name, whatsapp_opt_in, whatsapp_number, notes
        )
        payload = {}
        if pol: payload["pol"] = to_english(pol) or pol.strip()
        if pod: payload["pod"] = to_english(pod) or pod.strip()
        if cargo: payload["cargo"] = to_english(cargo) or cargo.strip()
        if load_type: payload["load_type"] = load_type
        if container_type: payload["container_type"] = to_english(container_type) or container_type.strip()
        if company_name: payload["company_name"] = to_english(company_name) or company_name.strip()
        if whatsapp_opt_in is not None: payload["whatsapp_opt_in"] = whatsapp_opt_in
        if whatsapp_number: payload["whatsapp_number"] = whatsapp_number.strip()
        if notes: payload["notes"] = to_english(notes) if notes else None

        if payload:
            asyncio.create_task(_dispatch_inquiry_update_to_backend(session_id, payload))

        return (
            "STATUS: SUCCESS. Inquiry updated in Eximple database. "
            "Acknowledge the update briefly in Hindi: "
            "'Noted sir! Update हो गया है। हमारी team 24 hours के अंदर rates निकाल कर share कर देगी।'"
        )

    @llm.function_tool(
        description=(
            "Disconnect the phone call via Vobiz when the customer is ready to end the call. "
            "Call this whenever the customer says 'no thanks', 'nahi bas', 'nothing else', "
            "'haan disconnect kar do', 'yes', 'bye', 'thank you', or confirms they have no more shipments."
        )
    )
    async def hangup_call() -> str:
        """Orderly disconnection of the live phone call via Vobiz SIP Trunk."""
        logger.info("hangup_call tool triggered: initiating Vobiz SIP disconnection.")
        # Trigger Vobiz SIP hangup with 6.5s grace period so full farewell speech completes cleanly
        asyncio.create_task(_dispatch_vobiz_hangup(ctx, delay_seconds=6.5))
        return (
            "Call disconnection in progress. Speak the warm farewell: "
            "'बहुत-बहुत धन्यवाद Eximple से जुड़ने के लिए sir! हमारी team आपसे जल्द ही contact करेगी। आपका दिन बहुत अच्छा रहे!' "
            "Do NOT say anything else or mention lines cutting."
        )

    return [register_inquiry, update_inquiry, hangup_call]
