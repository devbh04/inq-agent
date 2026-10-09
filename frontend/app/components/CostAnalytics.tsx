"use client";

import React, { useState, useEffect } from "react";
import {
  Coins,
  Phone,
  Cpu,
  Layers,
  FileText,
  Gauge,
  RefreshCw,
  TrendingUp,
  Activity,
  ArrowUpRight,
} from "lucide-react";

interface CostStats {
  total_calls: number;
  total_duration_seconds: number;
  total_telephony_pulses: number;
  telephony_pulse_rate_inr: number;
  total_telephony_cost_inr: number;
  total_stt_cost_inr: number;
  total_llm_cost_inr: number;
  total_tts_cost_inr: number;
  total_overall_cost_inr: number;
  average_p50_latency_ms: number;
}

interface CostAnalyticsProps {
  backendUrl: string;
}

export default function CostAnalytics({ backendUrl }: CostAnalyticsProps) {
  const [stats, setStats] = useState<CostStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${backendUrl}/api/calls/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn("Could not load cost stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  // Derived metrics
  const totalCost = stats ? stats.total_overall_cost_inr : 0;
  const telCost = stats ? stats.total_telephony_cost_inr : 0;
  const sttCost = stats ? stats.total_stt_cost_inr : 0;
  const llmCost = stats ? stats.total_llm_cost_inr : 0;
  const ttsCost = stats ? stats.total_tts_cost_inr : 0;

  const totalCalculated = telCost + sttCost + llmCost + ttsCost || 1;
  const telPct = Math.round((telCost / totalCalculated) * 100) || 0;
  const sttPct = Math.round((sttCost / totalCalculated) * 100) || 0;
  const llmPct = Math.round((llmCost / totalCalculated) * 100) || 0;
  const ttsPct = Math.max(0, 100 - telPct - sttPct - llmPct);

  const avgCostPerCall =
    stats && stats.total_calls > 0
      ? (stats.total_overall_cost_inr / stats.total_calls).toFixed(2)
      : "0.45";

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#f1f3f5]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-[28%] bg-[#141414] text-white flex items-center justify-center">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#141414] tracking-tight">
              Operational Spend & Telemetry.
            </h3>
            <p className="text-xs text-[#6b7280]">
              Carrier pulse billing and real-time inference cost audit.
            </p>
          </div>
        </div>

        <button
          onClick={fetchStats}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full border border-[#e5e7eb] bg-white text-xs font-medium text-[#141414] hover:bg-[#f8f9fa] transition-all cursor-pointer"
          title="Refresh Metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0066ff]" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Hero Grand Total Spend Pill Card */}
      <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">
              Total Operations Spend
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#141414] tracking-tight mt-1 font-mono">
              ₹{totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-[#6b7280] mt-1 flex items-center space-x-1">
              <span>Carrier pulse standard: ₹0.45 per 60-second block.</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white border border-[#e5e7eb] rounded-2xl px-4 py-3 text-right">
              <span className="text-[10px] text-[#6b7280] font-semibold block uppercase">
                Active Calls
              </span>
              <span className="text-lg font-bold font-mono text-[#141414]">
                {stats ? stats.total_calls : 0}
              </span>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-2xl px-4 py-3 text-right">
              <span className="text-[10px] text-[#6b7280] font-semibold block uppercase">
                Avg Cost / Call
              </span>
              <span className="text-lg font-bold font-mono text-[#0066ff]">
                ₹{avgCostPerCall}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Component Distribution Stacked Bar (Visual SVG / CSS Bar) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#141414]">Cost Distribution Breakdown</span>
          <span className="text-[#6b7280] font-mono text-[11px]">
            {stats ? stats.total_telephony_pulses : 0} Pulses Recorded
          </span>
        </div>

        {/* Stacked Bar */}
        <div className="h-4 w-full bg-[#f1f3f5] rounded-full overflow-hidden flex">
          <div
            style={{ width: `${Math.max(telPct, totalCost > 0 ? 5 : 40)}%` }}
            className="bg-[#141414] transition-all duration-500"
            title={`Telephony Pulses: ${telPct}%`}
          />
          <div
            style={{ width: `${Math.max(sttPct, totalCost > 0 ? 3 : 25)}%` }}
            className="bg-[#4b5563] transition-all duration-500"
            title={`STT Streaming: ${sttPct}%`}
          />
          <div
            style={{ width: `${Math.max(llmPct, totalCost > 0 ? 3 : 20)}%` }}
            className="bg-[#9ca3af] transition-all duration-500"
            title={`Language Model: ${llmPct}%`}
          />
          <div
            style={{ width: `${Math.max(ttsPct, totalCost > 0 ? 3 : 15)}%` }}
            className="bg-[#0066ff] transition-all duration-500"
            title={`Speech Synthesis: ${ttsPct}%`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#141414] shrink-0" />
            <span className="text-[#6b7280]">Telephony ({telPct}%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4b5563] shrink-0" />
            <span className="text-[#6b7280]">Speech-to-Text</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9ca3af] shrink-0" />
            <span className="text-[#6b7280]">Dialogue LLM</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0066ff] shrink-0" />
            <span className="text-[#6b7280]">Neural TTS</span>
          </div>
        </div>
      </div>

      {/* Grid of Micro-Cost Breakdowns */}
      <div className="grid grid-cols-2 gap-3">
        {/* Telephony Pulses */}
        <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#141414] flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-[#141414]" />
              <span>Telephony Pulses</span>
            </span>
            <span className="text-[10px] font-mono text-[#6b7280]">₹0.45/60s</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#141414]">
            ₹{telCost.toFixed(2)}
          </div>
          <p className="text-[10px] text-[#6b7280]">
            {stats ? stats.total_telephony_pulses : 0} Pulses ({stats ? stats.total_duration_seconds : 0}s airtime)
          </p>
        </div>

        {/* Speech Recognition STT */}
        <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#141414] flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#141414]" />
              <span>Speech Recognition</span>
            </span>
            <span className="text-[10px] font-mono text-[#6b7280]">Streaming</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#141414]">
            ₹{sttCost.toFixed(3)}
          </div>
          <p className="text-[10px] text-[#6b7280]">16kHz carrier streaming audio</p>
        </div>

        {/* Dialogue LLM */}
        <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#141414] flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-[#141414]" />
              <span>Dialogue Intelligence</span>
            </span>
            <span className="text-[10px] font-mono text-[#6b7280]">Tokens</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#141414]">
            ₹{llmCost.toFixed(4)}
          </div>
          <p className="text-[10px] text-[#6b7280]">Freight extraction & routing</p>
        </div>

        {/* Neural Voice TTS */}
        <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#141414] flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0066ff]" />
              <span>Neural Voice (TTS)</span>
            </span>
            <span className="text-[10px] font-mono text-[#0066ff]">Shanaya (Ritu)</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#141414]">
            ₹{ttsCost.toFixed(4)}
          </div>
          <p className="text-[10px] text-[#6b7280]">Synthesized speech units</p>
        </div>
      </div>

      {/* Latency SLO Gauge */}
      <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center">
            <Gauge className="w-4 h-4 text-[#0066ff]" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#141414] block">
              Round-Trip Audio Latency (p50)
            </span>
            <p className="text-[10px] text-[#6b7280]">Operational Target SLO: &lt; 900 ms</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-base font-bold font-mono text-[#0066ff]">
            {stats && stats.average_p50_latency_ms > 0
              ? `${stats.average_p50_latency_ms} ms`
              : "820 ms"}
          </span>
          <p className="text-[10px] text-[#6b7280] font-medium">Sub-second response</p>
        </div>
      </div>
    </div>
  );
}
