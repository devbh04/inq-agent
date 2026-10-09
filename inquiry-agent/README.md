# Eximple "Shanaya" Voice Agent & Backend

Production-ready, sub-second latency multilingual (Hinglish-first) voice agent designed for **Eximple** to handle marine freight inquiries via **LiveKit**, **Sarvam AI (Saaras v4, Bulbul v4 Flash, Sarvam-105B)**, and **Vobiz SIP Trunk**.

---

## Architecture Overview

- **`agent/`**: LiveKit Agents runtime worker utilizing:
  - **STT**: `sarvam.STTStreaming` (`saaras:v4`) with `stream_type="fast"` (500ms chunks) & `mode="codemix"`.
  - **Server-Side VAD**: `vad_sot_threshold=0.65`, `vad_min_speech_ms=180`, `vad_min_silence_ms=450` (No Silero clash; `vad=None`).
  - **LLM**: `sarvam.LLM` (`sarvam-105b-conversations`) with marine freight domain knowledge & conversational markers in native Devanagari Hindi + Latin English.
  - **TTS**: `sarvam.TTS` (`bulbul:v4-flash`, speaker `simran_hi_sales`, pace `1.05`) with `linear16` audio, `min_buffer_size=60`, and connection `prewarm()`.
  - **Telephony**: Vobiz SIP Trunk integration for outbound dialing and inbound correlation.
  - **Cost Tracker**: Telephony pulses (₹0.45 per 60s block) + Sarvam AI per-second, token, and character billing.
- **`backend/`**: FastAPI asynchronous service:
  - Supabase persistence for freight inquiries & call telemetry.
  - WebRTC token generation for frontend testing.
  - Outbound SIP call dispatch via Vobiz.

---

## Setup & Quickstart

### 1. Environment Setup (using `uv`)
Ensure `uv` is installed:
```bash
cd inquiry-agent
cp .env.example .env
# Edit .env and insert your LIVEKIT, SARVAM, VOBIZ, and SUPABASE credentials
```

### 2. Run the FastAPI Backend
```bash
uv run python -m backend.main
# Server runs on http://localhost:8000
# OpenAPI Docs: http://localhost:8000/docs
```

### 3. Run the Voice Agent Worker
```bash
# Development mode (connects to LiveKit Cloud / local server)
uv run python -m agent.main dev
```

### 4. Test in Console
To test the voice agent directly from your terminal microphone and speakers:
```bash
uv run python -m agent.main console
```

---

## Supabase SQL Migration
Run the complete, production-ready schema migration script located in [`schema.sql`](./schema.sql) in your [Supabase SQL Editor](https://supabase.com/dashboard).

The schema includes:
- `inquiries`: Stores ocean freight inquiries with `load_type` (FCL/LCL), `container_type`, status, and `transcript` JSONB.
- `call_sessions`: Stores telecom pulse counts, Sarvam model usage, latencies, transcripts, and unit costs.
- Automatic `updated_at` trigger.
- Row Level Security (RLS) policies for secure backend and anon access.
- Supabase Realtime publication enablement for live frontend dashboard updates.
