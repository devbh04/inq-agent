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
            "Register a marine freight inquiry with Eximple. "
            "Call this as soon as you have collected: company_name, pol (origin port or city), "
            "pod (destination port or country), cargo commodity, load_type (FCL or LCL), "
            "and container_type (if FCL specify 20GP/40GP/40HC/Reefer/ISO-Tank; if LCL pass 'LCL'), "
            "and customer confirms they want to register it."
        )
    )
    def register_inquiry(
        company_name: str,
        pol: str,
        pod: str,
        cargo: str,
        load_type: Literal["FCL", "LCL"] = "FCL",
        container_type: str = "20GP",
        notes: str = "",
    ) -> str:
        """
        Record the customer's freight inquiry.
        Runs entirely in the background so the agent never stalls.
        """
        resolved_number = _resolve_caller_number()
        logger.info(
            "register_inquiry tool called: Caller=%s, Company=%s, POL=%s, POD=%s, Cargo=%s, Load=%s, Container=%s",
            resolved_number, company_name, pol, pod, cargo, load_type, container_type
        )

        payload = {
            "session_id": session_id,
            "caller_number": resolved_number,
            "company_name": company_name.strip(),
            "pol": pol.strip(),
            "pod": pod.strip(),
            "cargo": cargo.strip(),
            "load_type": load_type,
            "container_type": container_type.strip(),
            "inquiry_type": "full_inquiry",
            "notes": notes.strip() if notes else None,
        }

        # Fire and forget: Launch asynchronous task to send JSON to FastAPI
        asyncio.create_task(_dispatch_inquiry_to_backend(payload))

        # Immediately return instruction to the LLM
        return (
            "STATUS: SUCCESS. Inquiry registered in Eximple system. "
            "Say immediately with upbeat warmth: 'Aapki inquiry Eximple system mein add ho gayi hai sir! "
            "Hamari sales team best freight rates ke saath jald se jald aapse contact karegi. "
            "Kya iske alawa aur koi shipment check karni hai aapko sir?' "
            "Do NOT say there is any technical issue, delay, waiting, or problem."
        )

    @llm.function_tool(
        description=(
            "Disconnect the phone call via Vobiz when the customer is ready to end the call. "
            "Call this whenever the customer says 'no thanks', 'nahi bas', 'nothing else', "
            "'haan disconnect kar do', 'yes', 'bye', 'thank you', or confirms they have no more shipments."
        )
    )
    def hangup_call() -> str:
        """Orderly disconnection of the live phone call via Vobiz SIP Trunk."""
        logger.info("hangup_call tool triggered: initiating Vobiz SIP disconnection.")
        # Trigger Vobiz SIP hangup with 6.5s grace period so full farewell speech completes cleanly
        asyncio.create_task(_dispatch_vobiz_hangup(ctx, delay_seconds=6.5))
        return (
            "Call disconnection in progress. Speak the warm farewell: "
            "'बहुत-बहुत धन्यवाद Eximple से जुड़ने के लिए sir! हमारी team आपसे जल्द ही contact करेगी। आपका दिन बहुत अच्छा रहे!' "
            "Do NOT say anything else or mention lines cutting."
        )

    return [register_inquiry, hangup_call]
