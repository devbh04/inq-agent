"""
Cost and Telemetry Engine for Eximple Voice Agent.
Calculates Telecom pulses, Sarvam AI usage costs, and latency metrics.
"""

import math
import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("cost-tracker")

# Unit Pricing Constants (in INR ₹)
TELEPHONY_RATE_PER_PULSE_INR = 0.45   # ₹0.45 per 60-second pulse
TELEPHONY_PULSE_SECONDS = 60          # 60s telecom pulse block
SARVAM_STT_RATE_PER_SECOND_INR = 30.0 / 3600.0   # ₹30/hour -> ₹0.008333/sec
SARVAM_LLM_PROMPT_PER_TOKEN_INR = 29.28 / 1_000_000.0   # ₹29.28 per 1M tokens
SARVAM_LLM_COMPLETION_PER_TOKEN_INR = 73.20 / 1_000_000.0 # ₹73.20 per 1M tokens
SARVAM_TTS_PER_CHAR_INR = 30.0 / 10_000.0   # ₹30 per 10k chars -> ₹0.003/char


class CallCostTracker:
    """Tracks real-time session duration, telecom pulses, model usage, and latency."""

    def __init__(self, session_id: str, room_name: str, caller_identity: Optional[str] = None):
        self.session_id = session_id
        self.room_name = room_name
        self.caller_identity = caller_identity or "unknown"
        # Use standard epoch time across both start and end
        self.start_time: float = time.time()
        self.end_time: Optional[float] = None

        # Model usage counters
        self.stt_audio_seconds: float = 0.0
        self.llm_prompt_tokens: int = 0
        self.llm_completion_tokens: int = 0
        self.tts_characters: int = 0

        # Latency records
        self.e2e_latencies_ms: list[float] = []
        self.llm_ttft_ms: list[float] = []
        self.tts_ttfb_ms: list[float] = []

    def record_stt_audio(self, duration_s: float) -> None:
        """Increment billed STT audio duration."""
        if duration_s > 0:
            self.stt_audio_seconds += duration_s

    def record_llm_tokens(self, prompt_tokens: int, completion_tokens: int) -> None:
        """Increment LLM tokens used."""
        self.llm_prompt_tokens += max(0, prompt_tokens)
        self.llm_completion_tokens += max(0, completion_tokens)

    def record_tts_text(self, text: str) -> None:
        """Increment TTS character count from generated text."""
        if text:
            self.tts_characters += len(text)

    def record_turn_latency(self, e2e_ms: Optional[float] = None, ttft_ms: Optional[float] = None, ttfb_ms: Optional[float] = None) -> None:
        """Record turn latency milestones."""
        if e2e_ms is not None and e2e_ms > 0:
            self.e2e_latencies_ms.append(e2e_ms)
        if ttft_ms is not None and ttft_ms > 0:
            self.llm_ttft_ms.append(ttft_ms)
        if ttfb_ms is not None and ttfb_ms > 0:
            self.tts_ttfb_ms.append(ttfb_ms)

    def calculate_telephony_pulses(self, duration_seconds: float) -> int:
        """
        Calculate Indian telephony pulses:
        1 to 60s -> 1 pulse
        61 to 120s -> 2 pulses
        121 to 180s -> 3 pulses
        """
        if duration_seconds <= 0:
            return 0
        return math.ceil(duration_seconds / float(TELEPHONY_PULSE_SECONDS))

    def get_summary(self) -> Dict[str, Any]:
        """Compute final aggregated costs and latency statistics."""
        current_time = self.end_time if self.end_time is not None else time.time()
        duration_s = max(0.0, current_time - self.start_time)
        pulses = self.calculate_telephony_pulses(duration_s)
        telephony_cost = round(pulses * TELEPHONY_RATE_PER_PULSE_INR, 4)

        # Fallback for STT if raw audio duration wasn't directly reported by the provider
        if self.stt_audio_seconds <= 0.0 and duration_s > 0:
            self.stt_audio_seconds = round(duration_s * 0.45, 2)

        stt_cost = round(self.stt_audio_seconds * SARVAM_STT_RATE_PER_SECOND_INR, 4)
        llm_cost = round(
            (self.llm_prompt_tokens * SARVAM_LLM_PROMPT_PER_TOKEN_INR) +
            (self.llm_completion_tokens * SARVAM_LLM_COMPLETION_PER_TOKEN_INR),
            4
        )
        tts_cost = round(self.tts_characters * SARVAM_TTS_PER_CHAR_INR, 4)
        total_cost = round(telephony_cost + stt_cost + llm_cost + tts_cost, 4)

        # Calculate p50 and p95 latency
        p50_latency = 0.0
        p95_latency = 0.0
        if self.e2e_latencies_ms:
            sorted_lat = sorted(self.e2e_latencies_ms)
            n = len(sorted_lat)
            p50_latency = sorted_lat[int(0.50 * n)]
            p95_latency = sorted_lat[min(n - 1, int(0.95 * n))]

        return {
            "session_id": self.session_id,
            "room_name": self.room_name,
            "caller_identity": self.caller_identity,
            "duration_seconds": round(duration_s, 2),
            "telephony_pulses": pulses,
            "telephony_cost_inr": telephony_cost,
            "stt_audio_seconds": round(self.stt_audio_seconds, 2),
            "stt_cost_inr": stt_cost,
            "llm_prompt_tokens": self.llm_prompt_tokens,
            "llm_completion_tokens": self.llm_completion_tokens,
            "llm_cost_inr": llm_cost,
            "tts_characters": self.tts_characters,
            "tts_cost_inr": tts_cost,
            "total_cost_inr": total_cost,
            "latency_p50_ms": round(p50_latency, 2),
            "latency_p95_ms": round(p95_latency, 2),
        }
