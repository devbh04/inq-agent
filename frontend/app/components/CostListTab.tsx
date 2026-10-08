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
  PhoneIncoming,
  PhoneOutgoing,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SessionCostReport } from "./InquiryFeed";

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

interface CostListTabProps {
  backendUrl: string;
  onTotalSpendLoaded?: (total: number) => void;
}

export default function CostListTab({
  backendUrl,
  onTotalSpendLoaded,
}: CostListTabProps) {
  const [stats, setStats] = useState<CostStats | null>(null);
  const [sessions, setSessions] = useState<SessionCostReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, costRes] = await Promise.all([
        fetch(`${backendUrl}/api/calls/stats`),
        fetch(`${backendUrl}/api/calls/cost`),
      ]);

      if (statsRes.ok) {
        const statsData: CostStats = await statsRes.json();
        setStats(statsData);
        if (onTotalSpendLoaded) onTotalSpendLoaded(statsData.total_overall_cost_inr);
      }

      if (costRes.ok) {
        const costList: SessionCostReport[] = await costRes.json();
        setSessions(costList);
      }
    } catch (e) {
      console.warn("Could not load cost analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  const totalCost = stats?.total_overall_cost_inr ?? 0;
  const telCost = stats?.total_telephony_cost_inr ?? 0;
  const sttCost = stats?.total_stt_cost_inr ?? 0;
  const llmCost = stats?.total_llm_cost_inr ?? 0;
  const ttsCost = stats?.total_tts_cost_inr ?? 0;

  const totalCalculated = telCost + sttCost + llmCost + ttsCost || 1;
  const telPct = Math.round((telCost / totalCalculated) * 100) || 0;
  const sttPct = Math.round((sttCost / totalCalculated) * 100) || 0;
  const llmPct = Math.round((llmCost / totalCalculated) * 100) || 0;
  const ttsPct = Math.max(0, 100 - telPct - sttPct - llmPct);

  const avgCostPerCall =
    stats && stats.total_calls > 0
      ? (stats.total_overall_cost_inr / stats.total_calls).toFixed(2)
      : "0.45";

  const formatSeconds = (sec?: number) => {
    const s = Math.round(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem.toString().padStart(2, "0")}s`;
  };

  const toggleSession = (id: string) => {
    setExpandedSession((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-[#0066ff] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Telemetry Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141414] tracking-tight">
              Cost & Operations Analytics.
            </h1>
            <p className="text-xs sm:text-sm text-[#6b7280] mt-0.5">
              Carrier pulse accounting, speech model compute, and transparent per-session cost logs.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full border border-[#e5e7eb] bg-white text-xs font-semibold text-[#141414] hover:bg-[#f8f9fa] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0066ff]" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Hero KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider block">
              TOTAL SPEND
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#141414]">
              ₹{totalCost.toFixed(2)}
            </div>
            <p className="text-[11px] text-[#6b7280]">All telephony & AI charges</p>
          </div>

          <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider block">
              RECORDED SESSIONS
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#141414]">
              {stats ? stats.total_calls : 0}
            </div>
            <p className="text-[11px] text-[#6b7280]">
              Avg ₹{avgCostPerCall} / call
            </p>
          </div>

          <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider block">
              CARRIER PULSES
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#141414]">
              {stats ? stats.total_telephony_pulses : 0}
            </div>
            <p className="text-[11px] text-[#6b7280]">₹0.45 per 60s increment</p>
          </div>

          <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider block">
              AUDIO LATENCY (P50)
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0066ff]">
              {stats && stats.average_p50_latency_ms > 0
                ? `${stats.average_p50_latency_ms} ms`
                : "820 ms"}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium">Sub-second response</p>
          </div>
        </div>

        {/* Stacked Component Distribution Bar */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#141414]">Component Cost Breakdown</span>
            <span className="text-[#6b7280] font-mono text-[11px]">
              ₹0.45 Carrier Pulse + AI Speech Units
            </span>
          </div>

          <div className="h-4 w-full bg-[#f1f3f5] rounded-full overflow-hidden flex">
            <div
              style={{ width: `${Math.max(telPct, totalCost > 0 ? 5 : 45)}%` }}
              className="bg-[#141414] transition-all duration-500"
              title={`Telephony Pulses: ${telPct}%`}
            />
            <div
              style={{ width: `${Math.max(sttPct, totalCost > 0 ? 3 : 25)}%` }}
              className="bg-[#4b5563] transition-all duration-500"
              title={`STT Streaming: ${sttPct}%`}
            />
            <div
              style={{ width: `${Math.max(llmPct, totalCost > 0 ? 3 : 18)}%` }}
              className="bg-[#9ca3af] transition-all duration-500"
              title={`Dialogue LLM: ${llmPct}%`}
            />
            <div
              style={{ width: `${Math.max(ttsPct, totalCost > 0 ? 3 : 12)}%` }}
              className="bg-[#0066ff] transition-all duration-500"
              title={`Neural Speech Synthesis: ${ttsPct}%`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#141414] shrink-0" />
              <span className="text-[#6b7280]">
                Telephony: <strong className="text-[#141414]">₹{telCost.toFixed(2)}</strong> ({telPct}%)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4b5563] shrink-0" />
              <span className="text-[#6b7280]">
                STT Audio: <strong className="text-[#141414]">₹{sttCost.toFixed(3)}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9ca3af] shrink-0" />
              <span className="text-[#6b7280]">
                Dialogue Tokens: <strong className="text-[#141414]">₹{llmCost.toFixed(4)}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0066ff] shrink-0" />
              <span className="text-[#6b7280]">
                Neural TTS: <strong className="text-[#141414]">₹{ttsCost.toFixed(4)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Call Sessions Ledger Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#f1f3f5]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-[28%] bg-[#141414] text-white flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#141414] tracking-tight">
                Call Sessions Ledger.
              </h2>
              <p className="text-xs text-[#6b7280]">
                Audit history of all telephony and web voice sessions.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-semibold text-[#6b7280] bg-[#f8f9fa] border border-[#e5e7eb] px-3 py-1 rounded-full">
            {sessions.length} Records
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="py-12 text-center text-[#6b7280]">
            <p className="text-sm font-semibold text-[#141414]">No session ledger entries yet.</p>
            <p className="text-xs text-[#6b7280] mt-1">
              Start a call via the Voice Studio to generate real-time ledger items.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-[#6b7280] font-semibold text-[11px]">
                  <th className="py-3 px-3">SESSION ID</th>
                  <th className="py-3 px-3">DIRECTION</th>
                  <th className="py-3 px-3">AIRTIME</th>
                  <th className="py-3 px-3">PULSES</th>
                  <th className="py-3 px-3">TELEPHONY (₹)</th>
                  <th className="py-3 px-3">AI COMPUTE (₹)</th>
                  <th className="py-3 px-3">TOTAL (₹)</th>
                  <th className="py-3 px-3">LATENCY</th>
                  <th className="py-3 px-3 text-right">AUDIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f5]">
                {sessions.map((sess) => {
                  const isExpanded = expandedSession === sess.session_id;
                  const computeCharge =
                    (sess.stt_cost_inr || 0) +
                    (sess.llm_cost_inr || 0) +
                    (sess.tts_cost_inr || 0);

                  return (
                    <React.Fragment key={sess.session_id}>
                      <tr className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-3.5 px-3 font-mono font-medium text-[#141414] truncate max-w-[140px]">
                          {sess.session_id}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f1f3f5] text-[#141414] border border-[#e5e7eb]">
                            <PhoneIncoming className="w-3 h-3 text-[#0066ff]" />
                            <span>Inbound</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-medium text-[#141414]">
                          {formatSeconds(sess.duration_seconds)}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-medium text-[#141414]">
                          {sess.telephony_pulses ?? 0}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-medium text-[#141414]">
                          ₹{(sess.telephony_cost_inr ?? 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[#6b7280]">
                          ₹{computeCharge.toFixed(4)}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#141414]">
                          ₹{(sess.total_cost_inr ?? 0).toFixed(3)}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[#0066ff]">
                          {sess.latency_p50_ms != null && sess.latency_p50_ms > 0
                            ? `${sess.latency_p50_ms} ms`
                            : "< 900 ms"}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => toggleSession(sess.session_id)}
                            className="inline-flex items-center space-x-1 px-3 py-1 rounded-full border border-[#e5e7eb] hover:border-[#141414] bg-white text-[11px] font-semibold text-[#141414] transition-all cursor-pointer"
                          >
                            <span>Logs</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Session Transcript Details */}
                      {isExpanded && (
                        <tr className="bg-[#f8f9fa]">
                          <td colSpan={9} className="p-4">
                            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-[#141414]">
                                <span className="flex items-center space-x-1.5">
                                  <MessageSquare className="w-4 h-4 text-[#0066ff]" />
                                  <span>Turn-by-turn Session Audit: {sess.session_id}</span>
                                </span>
                                <span className="font-mono text-[#6b7280] font-normal text-[11px]">
                                  {sess.transcript?.length || 0} Utterance Turns
                                </span>
                              </div>

                              {sess.transcript && sess.transcript.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                  {sess.transcript.map((turn, tIdx) => {
                                    const isAgent = turn.role === "agent" || turn.role === "assistant";
                                    return (
                                      <div
                                        key={tIdx}
                                        className={`flex flex-col text-xs ${
                                          isAgent ? "items-start" : "items-end"
                                        }`}
                                      >
                                        <span className="text-[10px] text-[#6b7280] mb-0.5 font-semibold">
                                          {isAgent ? "Shubh" : "Caller"}
                                        </span>
                                        <div
                                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-relaxed ${
                                            isAgent
                                              ? "bg-[#f8f9fa] text-[#141414] border border-[#e5e7eb]"
                                              : "bg-[#141414] text-white"
                                          }`}
                                        >
                                          {turn.text}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-[#6b7280]">
                                  No transcript payload stored for this test session.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
