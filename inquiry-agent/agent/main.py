"""
Main Production Worker for Eximple Voice Agent 'Shubh'.
Orchestrates LiveKit AgentServer, Sarvam AI streaming pipeline, Vobiz SIP trunk, active silence handling, and Cost Telemetry.
"""

import os
import sys
import time
import json
import logging
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Ensure the root directory of inquiry-agent is on python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from livekit.agents import (
    AgentServer,
    JobContext,
    JobProcess,
    AgentSession,
    RoomInputOptions,
    TurnHandlingOptions,
    cli,
    metrics,
)
from livekit.agents.voice.turn import (
    EndpointingOptions,
    InterruptionOptions,
    PreemptiveGenerationOptions,
)
from livekit.plugins import sarvam
import httpx

from agent.prompts import SHUBH_SYSTEM_PROMPT
from agent.assistant import ShubhAgent
from agent.tools import build_tools
from agent.cost_tracker import CallCostTracker
from agent.sip_dialer import (
    extract_sip_metadata,
    log_sip_participant_details,
    initiate_outbound_sip_call,
)

# Load environment configuration
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("shubh-worker")

BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000")


def setup(proc: JobProcess) -> None:
    """
    Worker initialization function.
    Configures Sarvam STT and energetic Bulbul v3 TTS with speaker 'shubh'.
    Prewarms the TTS WebSocket connection to eliminate TLS handshake latency.
    """
    logger.info("Initializing worker process and prewarming Sarvam models...")

    sarvam_key = os.getenv("SARVAM_API_KEY")
    if not sarvam_key:
        logger.warning("SARVAM_API_KEY is not set in environment!")

    default_lang = os.getenv("SARVAM_DEFAULT_LANGUAGE", "hi-IN")
    stt_prompt = (
        "Eximple marine freight, ocean shipping, Nhava Sheva, JNPT, Mundra, Chennai, Hazira, Cochin, "
        "Jebel Ali, Singapore, Rotterdam, Shanghai, Port Klang, 20GP, 40GP, 40HC, Reefer, ISO Tank, LCL, FCL, FOB, CIF"
    )

    # 1. Sarvam Realtime Streaming STT (saaras:v3-realtime)
    proc.userdata["stt"] = sarvam.STTStreaming(
        language=default_lang,
        stream_type="fast",         # 500ms chunks instead of 1000ms floor
        mode="codemix",             # Preserves Hinglish & mixed phrasing accurately
        endpointing="vad",          # Server-side deep learning Indic VAD
        sample_rate=16000,
        vad_min_silence_ms=450,     # Ideal Indian conversational pause window
        vad_min_speech_ms=180,      # Rejects clicks, pops, coughs, and DTMF tones
        vad_sot_threshold=0.65,     # Speech-onset filter rejecting background TV/chatter
        prompt=stt_prompt,
    )

    # 2. Sarvam Bulbul v3 TTS - Energetic Speaker 'shubh' Profile
    speaker_choice = os.getenv("SARVAM_TTS_SPEAKER", "shubh")
    pace_choice = float(os.getenv("SARVAM_TTS_PACE", "1.05"))         # 1.05x: natural, warm human tempo
    temp_choice = float(os.getenv("SARVAM_TTS_TEMPERATURE", "0.65")) # 0.65: natural prosodic inflection

    logger.info(
        "Configuring Bulbul v3 TTS: speaker=%s, pace=%.2f, temperature=%.2f",
        speaker_choice, pace_choice, temp_choice
    )

    proc.userdata["tts"] = sarvam.TTS(
        model=os.getenv("SARVAM_TTS_MODEL", "bulbul:v3"),
        speaker=speaker_choice,
        target_language_code=default_lang,
        speech_sample_rate=24000,
        output_audio_codec="linear16", # Raw PCM passthrough, zero decode delay
        min_buffer_size=60,            # Buffers full semantic clauses for rich human prosody
        max_chunk_length=150,
        pace=pace_choice,              # Natural, energetic pace
        temperature=temp_choice,       # Natural, expressive pitch modulation
    )

    # 3. Prewarm TTS WebSocket connection
    try:
        proc.userdata["tts"].prewarm()
        logger.info("✅ Prewarmed Sarvam TTS connection successfully.")
    except Exception as e:
        logger.warning("TTS prewarm encountered error (will retry lazily on turn): %s", e)


server = AgentServer(setup_fnc=setup)


async def _report_session_costs(summary: dict) -> None:
    """Asynchronously post call telemetry and cost metrics to FastAPI."""
    url = f"{BACKEND_API_URL.rstrip('/')}/api/calls/cost"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=summary)
            if resp.is_success:
                logger.info("✅ Call costs recorded to backend: %s", resp.json())
            else:
                logger.error("Failed to record costs (%d): %s", resp.status_code, resp.text)
    except Exception as e:
        logger.warning("Could not reach backend to save call costs: %s", e)


@server.rtc_session(agent_name="eximple-shubh")
async def entrypoint(ctx: JobContext) -> None:
    """Main room entrypoint executed whenever a call starts."""
    room_name = ctx.room.name
    logger.info("Agent joined room: %s (job_id=%s)", room_name, ctx.job.id)

    # Prewarm Sarvam TTS connection on fresh call connect to eliminate stale socket resets
    try:
        ctx.proc.userdata["tts"].prewarm()
    except Exception as e:
        logger.debug("TTS re-prewarm on entrypoint skipped: %s", e)

    # 1. Parse SIP metadata for outbound phone calls
    meta = extract_sip_metadata(ctx.job.metadata)
    phone_number = meta.get("phone_number")
    from_number = meta.get("from_number")
    custom_sip_headers = meta.get("sip_headers")

    call_direction = "outbound" if phone_number else "inbound"
    is_telephony = bool(phone_number)

    def _detect_caller_number(p):
        nonlocal phone_number
        if not phone_number or phone_number == "unknown":
            attrs = dict(p.attributes or {})
            caller = attrs.get("sip.phoneNumber")
            if not caller and p.identity.startswith("sip_"):
                caller = p.identity[4:]
            if caller:
                phone_number = caller
                cost_tracker.caller_identity = caller
                logger.info("Identified inbound SIP caller number: %s", caller)

    # Listen for remote participants and inspect SIP attributes
    @ctx.room.on("participant_connected")
    def _on_participant(p):
        log_sip_participant_details(p)
        _detect_caller_number(p)

    @ctx.room.on("participant_disconnected")
    def _on_participant_disconnected(p):
        logger.info("Remote participant disconnected: %s", p.identity)
        if not ctx.room.remote_participants:
            logger.info("All remote participants left room %s. Triggering session shutdown.", room_name)
            ctx.shutdown(reason="remote_participant_left")

    for p in ctx.room.remote_participants.values():
        log_sip_participant_details(p)
        _detect_caller_number(p)

    # 2. Setup Cost & Telemetry Tracker (using epoch start_time)
    cost_tracker = CallCostTracker(
        session_id=room_name,
        room_name=room_name,
        caller_identity=phone_number or "web-participant",
    )

    # 3. Construct Non-Blocking Function Tools with JobContext (using dynamic caller resolver)
    tools = build_tools(
        ctx=ctx,
        session_id=room_name,
        caller_number=lambda: phone_number,
    )

    # 4. Agent Instance
    agent = ShubhAgent(tools=tools)

    # 5. Acoustic Echo Cancellation:
    # Telephony carrier handles echo at PSTN gateway -> None (no 3s block)
    # WebRTC browser mic & speaker -> 1.0s warmup
    aec_warmup = None if is_telephony else 1.0

    # 6. Initialize AgentSession with optimal Sarvam configurations & 5.5s Silence Watchdog
    session = AgentSession(
        stt=ctx.proc.userdata["stt"],
        llm=sarvam.LLM(model=os.getenv("SARVAM_LLM_MODEL", "sarvam-105b-conversations")),
        tts=ctx.proc.userdata["tts"],
        # CRITICAL: vad=None prevents Silero conflict. Sarvam STT server-side VAD drives turns!
        vad=None,
        turn_handling=TurnHandlingOptions(
            turn_detection="stt",
            endpointing=EndpointingOptions(
                mode="fixed",
                min_delay=0.22, # 220ms endpoint hold eliminates dead air
                max_delay=2.0,
            ),
            interruption=InterruptionOptions(
                enabled=True,
                mode="vad",
                min_words=1,    # Word filter: noise bursts cannot interrupt Shubh
                false_interruption_timeout=1.3,
                resume_false_interruption=True,
            ),
            preemptive_generation=PreemptiveGenerationOptions(enabled=True),
        ),
        aec_warmup_duration=aec_warmup,
        user_away_timeout=5.5,  # 5.5 second silence threshold
        max_tool_steps=2,
    )

    # 7. Active Silence Handling (Fires when user is silent for 5.5 seconds)
    @session.on("user_state_changed")
    def _on_user_state_changed(ev):
        if getattr(ev, "new_state", "") == "away":
            logger.info("Caller silent for 5.5s. Prompting check-in...")
            asyncio.create_task(
                session.generate_reply(
                    instructions="The caller has been silent for 5 seconds. In ONE short polite sentence with natural punctuation, check if they can hear you: 'Hello sir! Kya aap mujhe sun pa rahe hain?'"
                )
            )

    session_transcript: list = []

    # 8. Register Graceful Shutdown Callback with LiveKit
    async def _on_shutdown(reason: str = ""):
        """Executed by LiveKit runtime before process teardown, ensuring metrics are flushed."""
        logger.info("Session shutting down (reason=%s). Calculating final cost telemetry...", reason)
        cost_tracker.end_time = time.time()

        # Extract authoritative usage directly from LiveKit's ModelUsageCollector
        try:
            for usage_item in session.usage.model_usage:
                u_type = getattr(usage_item, "type", "")
                if u_type == "llm_usage":
                    cost_tracker.record_llm_tokens(
                        getattr(usage_item, "input_tokens", 0),
                        getattr(usage_item, "output_tokens", 0)
                    )
                elif u_type == "tts_usage":
                    chars = getattr(usage_item, "characters_count", 0)
                    if chars:
                        cost_tracker.tts_characters += chars
                elif u_type == "stt_usage":
                    dur = getattr(usage_item, "audio_duration", 0.0)
                    if dur:
                        cost_tracker.record_stt_audio(dur)
        except Exception as e:
            logger.warning("Error reading session.usage: %s", e)

        summary = cost_tracker.get_summary()
        summary["call_direction"] = call_direction
        summary["transcript"] = session_transcript
        logger.info("Final Session Cost Summary: %s", json.dumps(summary, indent=2))
        await _report_session_costs(summary)

    ctx.add_shutdown_callback(_on_shutdown)

    # 9. Wire up Observability & Metrics Handlers
    @session.on("metrics_collected")
    def _on_metrics(ev):
        try:
            metrics.log_metrics(ev.metrics)
        except Exception:
            pass

    @session.on("conversation_item_added")
    def _on_item(ev):
        # Extract turn latencies
        m = getattr(ev.item, "metrics", None) or {}
        if m:
            cost_tracker.record_turn_latency(
                e2e_ms=m.get("e2e_latency"),
                ttft_ms=m.get("llm_node_ttft"),
                ttfb_ms=m.get("tts_node_ttfb"),
            )

        # Track assistant speech text & append to transcript
        item = getattr(ev, "item", None)
        if item:
            role = getattr(item, "role", "")
            text = getattr(item, "text_content", "") or ""
            if role == "assistant" and text:
                cost_tracker.record_tts_text(text)
            if role and text:
                session_transcript.append({
                    "role": "agent" if role == "assistant" else "user",
                    "text": text,
                    "timestamp": time.time(),
                })

    @session.on("agent_false_interruption")
    def _on_false(ev):
        logger.warning("False interruption detected (resumed=%s)", getattr(ev, "resumed", True))

    # 10. Start the Agent Session
    await session.start(
        agent=agent,
        room=ctx.room,
        room_input_options=RoomInputOptions(
            close_on_disconnect=True,
            delete_room_on_close=True,
        ),
    )

    # 11. Handle Outbound Dialing vs Inbound / WebRTC
    # Deterministic opening greeting with full punctuation ensures instant playout (<200ms) and warm, lively human prosody
    GREETING_TEXT = (
        "Namaste sir! Main Shubh baat kar raha hoon Eximple se. "
        "Aaj kis route ke liye ocean freight check karna hai aapko?"
    )

    if phone_number:
        logger.info("Dialing phone number %s via Vobiz SIP Trunk...", phone_number)
        call_success = await initiate_outbound_sip_call(
            lk_api=ctx.api,
            room_name=room_name,
            phone_number=phone_number,
            from_number=from_number,
            custom_headers=custom_sip_headers,
        )
        if not call_success:
            logger.error("Outbound call failed. Shutting down session.")
            ctx.shutdown(reason="outbound_dial_failed")
            return

        logger.info("Call answered by %s. Introducing Shubh with warm, instant speech...", phone_number)
        await session.say(GREETING_TEXT, allow_interruptions=True)
    else:
        logger.info("Inbound or WebRTC connection in room %s. Greeting caller...", room_name)
        await session.say(GREETING_TEXT, allow_interruptions=True)


if __name__ == "__main__":
    cli.run_app(server)
