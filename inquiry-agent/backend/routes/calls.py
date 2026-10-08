"""
Call Telemetry and Cost Analytics REST Endpoints.
"""

from fastapi import APIRouter, status, HTTPException
from typing import List, Dict, Any
from ..models import CallCostReport
from ..db import save_call_cost_report, get_call_sessions

router = APIRouter(prefix="/api/calls", tags=["Calls & Costs"])


@router.post("/cost", response_model=CallCostReport, status_code=status.HTTP_201_CREATED)
async def record_call_cost(report: CallCostReport):
    """
    Log session duration, telephony pulse cost (₹0.45/60s), model costs, and latencies.
    """
    try:
        saved = await save_call_cost_report(report)
        return saved
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record call cost: {str(e)}")


@router.get("/cost", response_model=List[CallCostReport])
async def list_call_costs():
    """
    Retrieve recent call sessions and cost breakdowns.
    """
    return await get_call_sessions()


@router.get("/stats")
async def get_cost_and_usage_stats() -> Dict[str, Any]:
    """
    Compute aggregate usage and cost statistics across all sessions.
    """
    sessions = await get_call_sessions()
    
    total_calls = len(sessions)
    total_duration = sum(s.duration_seconds for s in sessions)
    total_pulses = sum(s.telephony_pulses for s in sessions)
    total_telephony_cost = sum(s.telephony_cost_inr for s in sessions)
    total_stt_cost = sum(s.stt_cost_inr for s in sessions)
    total_llm_cost = sum(s.llm_cost_inr for s in sessions)
    total_tts_cost = sum(s.tts_cost_inr for s in sessions)
    total_overall_cost = sum(s.total_cost_inr for s in sessions)

    latencies = [s.latency_p50_ms for s in sessions if s.latency_p50_ms and s.latency_p50_ms > 0]
    avg_p50_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0.0

    return {
        "total_calls": total_calls,
        "total_duration_seconds": round(total_duration, 2),
        "total_telephony_pulses": total_pulses,
        "telephony_pulse_rate_inr": 0.45,
        "total_telephony_cost_inr": round(total_telephony_cost, 2),
        "total_stt_cost_inr": round(total_stt_cost, 4),
        "total_llm_cost_inr": round(total_llm_cost, 4),
        "total_tts_cost_inr": round(total_tts_cost, 4),
        "total_overall_cost_inr": round(total_overall_cost, 2),
        "average_p50_latency_ms": avg_p50_latency,
    }
