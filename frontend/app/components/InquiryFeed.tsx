"use client";

import React, { useState, useEffect } from "react";
import {
  Ship,
  RefreshCw,
  Anchor,
  Box,
  ArrowRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Pencil,
  Phone,
  Cpu,
  Layers,
  FileText,
  MessageSquare,
  Sparkles,
  Zap,
} from "lucide-react";
import EditInquiryDialog, { InquiryData } from "./EditInquiryDialog";

export interface SessionCostReport {
  session_id: string;
  duration_seconds?: number;
  telephony_pulses?: number;
  telephony_pulse_rate_inr?: number;
  telephony_cost_inr?: number;
  stt_cost_inr?: number;
  llm_cost_inr?: number;
  tts_cost_inr?: number;
  total_cost_inr?: number;
  latency_p50_ms?: number | null;
  transcript?: Array<{
    role: "agent" | "user" | string;
    text: string;
    timestamp?: string;
  }>;
  created_at?: string;
}

interface InquiryFeedProps {
  backendUrl: string;
}

export default function InquiryFeed({ backendUrl }: InquiryFeedProps) {
  const [inquiries, setInquiries] = useState<InquiryData[]>([]);
  const [costReports, setCostReports] = useState<Record<string, SessionCostReport>>({});
  const [loading, setLoading] = useState(false);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});
  const [editingInquiry, setEditingInquiry] = useState<InquiryData | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch inquiries and cost reports in parallel
      const [inqRes, costRes] = await Promise.all([
        fetch(`${backendUrl}/api/inquiries`),
        fetch(`${backendUrl}/api/calls/cost`),
      ]);

      if (inqRes.ok) {
        const inqData: InquiryData[] = await inqRes.json();
        setInquiries(inqData);
      }

      if (costRes.ok) {
        const costList: SessionCostReport[] = await costRes.json();
        const map: Record<string, SessionCostReport> = {};
        costList.forEach((c) => {
          if (c.session_id) {
            map[c.session_id] = c;
          }
        });
        setCostReports(map);
      }
    } catch (e) {
      console.warn("Could not load inquiries or cost telemetry:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  const toggleTranscript = (id: string) => {
    setExpandedTranscripts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSavedInquiry = (updated: InquiryData) => {
    setInquiries((prev) =>
      prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
    );
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  const formatStatusLabel = (st?: string) => {
    if (!st) return "Sales Desk Assigned";
    switch (st.toLowerCase()) {
      case "sales_assigned":
        return "Sales Desk Assigned";
      case "processing":
        return "In Review";
      case "rates_calculated":
        return "Rates Calculated";
      case "completed":
        return "Completed";
      case "new":
        return "New Inquiry";
      default:
        return st;
    }
  };

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-7 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#f1f3f5]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-[28%] bg-[#141414] text-white flex items-center justify-center">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#141414] tracking-tight">
              Captured Freight Inquiries.
            </h3>
            <p className="text-xs text-[#6b7280]">
              Operational manifest with linked session telemetry and dialogue audits.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full border border-[#e5e7eb] bg-white text-xs font-medium text-[#141414] hover:bg-[#f8f9fa] transition-all cursor-pointer"
          title="Refresh Inquiries"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0066ff]" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {inquiries.length === 0 ? (
        <div className="py-12 text-center text-[#6b7280]">
          <div className="w-12 h-12 rounded-[28%] bg-[#f1f3f5] mx-auto mb-3 flex items-center justify-center">
            <Ship className="w-6 h-6 text-[#9ca3af]" />
          </div>
          <p className="text-sm font-semibold text-[#141414]">No freight inquiries captured yet.</p>
          <p className="text-xs text-[#6b7280] mt-1 max-w-sm mx-auto">
            Place an inbound test call or dial via Vobiz to generate an inquiry with instant cost telemetry.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[720px] overflow-y-auto pr-1">
          {inquiries.map((inq) => {
            const report = inq.session_id ? costReports[inq.session_id] : null;
            const hasTranscript =
              (report?.transcript && report.transcript.length > 0) || false;
            const isTranscriptOpen = !!expandedTranscripts[inq.id];

            return (
              <div
                key={inq.id}
                className="bg-white border border-[#e5e7eb] hover:border-[#d1d5db] rounded-2xl p-5 space-y-4 transition-all"
              >
                {/* Top Row: Company & Status Badges */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-base text-[#141414] tracking-tight">
                        {inq.company_name}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#141414] text-white">
                        {inq.load_type || "FCL"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <p className="text-xs text-[#6b7280]">
                        Commodity: <span className="text-[#141414] font-medium">{inq.cargo}</span>
                      </p>
                      {inq.whatsapp_opt_in !== false ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>WA: {inq.whatsapp_number || inq.caller_number || "Opted In"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                          <span>WA: Declined</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#0066ff]/10 text-[#0066ff] border border-[#0066ff]/20">
                      <Sparkles className="w-3 h-3" />
                      <span>{formatStatusLabel(inq.status)}</span>
                    </span>

                    <button
                      onClick={() => setEditingInquiry(inq)}
                      className="inline-flex items-center space-x-1 px-3 py-1 rounded-full border border-[#e5e7eb] hover:border-[#141414] bg-white text-xs font-medium text-[#141414] transition-all cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* Routing & Container Specs Row */}
                <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2 text-[#141414] font-semibold">
                    <span className="text-xs">{inq.pol}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#9ca3af]" />
                    <span className="text-xs">{inq.pod}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[#141414] font-medium">
                    <Box className="w-3.5 h-3.5 text-[#6b7280]" />
                    <span>{inq.container_type}</span>
                  </div>
                </div>

                {/* Linked Individual Session Cost Analysis Box */}
                <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#141414]">
                      <Zap className="w-3.5 h-3.5 text-[#0066ff]" />
                      <span>Session Cost Telemetry</span>
                    </div>
                    {report ? (
                      <span className="text-xs font-mono font-bold text-[#141414] bg-white px-2.5 py-0.5 rounded-full border border-[#e5e7eb]">
                        Total: ₹{(report.total_cost_inr ?? 0).toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-[#6b7280]">
                        Telephony Pulse: ₹0.45 / 60s
                      </span>
                    )}
                  </div>

                  {report ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="bg-white rounded-lg p-2 border border-[#e5e7eb]">
                        <span className="text-[#6b7280] block text-[10px]">DURATION</span>
                        <span className="font-mono font-semibold text-[#141414]">
                          {formatSeconds(report.duration_seconds || 0)}
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-[#e5e7eb]">
                        <span className="text-[#6b7280] block text-[10px]">PULSES</span>
                        <span className="font-mono font-semibold text-[#141414]">
                          {report.telephony_pulses ?? 0} @ ₹{(report.telephony_pulse_rate_inr ?? 0.45).toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-[#e5e7eb]">
                        <span className="text-[#6b7280] block text-[10px]">AI COMPUTE</span>
                        <span className="font-mono font-semibold text-[#141414]">
                          ₹{((report.stt_cost_inr || 0) + (report.llm_cost_inr || 0) + (report.tts_cost_inr || 0)).toFixed(4)}
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-[#e5e7eb]">
                        <span className="text-[#6b7280] block text-[10px]">LATENCY (P50)</span>
                        <span className="font-mono font-semibold text-[#0066ff]">
                          {report.latency_p50_ms != null && report.latency_p50_ms > 0
                            ? `${report.latency_p50_ms} ms`
                            : "< 900 ms"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#6b7280]">
                      Telemetry active. Billed at 60-second carrier increments with sub-second neural inference.
                    </p>
                  )}
                </div>

                {/* Expandable Conversation Transcript Accordion */}
                <div className="border-t border-[#f1f3f5] pt-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleTranscript(inq.id)}
                      className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#141414] hover:text-[#0066ff] transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#6b7280]" />
                      <span>
                        {hasTranscript
                          ? `Transcript Audit (${report?.transcript?.length} turns)`
                          : "Transcript Audit"}
                      </span>
                      {isTranscriptOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#6b7280]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#6b7280]" />
                      )}
                    </button>

                    <div className="flex items-center space-x-1 text-[11px] text-[#6b7280]">
                      <Clock className="w-3 h-3 text-[#9ca3af]" />
                      <span>
                        {new Date(inq.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {isTranscriptOpen && (
                    <div className="mt-3 bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-3.5 space-y-2 max-h-60 overflow-y-auto">
                      {hasTranscript && report?.transcript ? (
                        report.transcript.map((msg, idx) => {
                          const isAgent = msg.role === "agent" || msg.role === "assistant";
                          return (
                            <div
                              key={idx}
                              className={`flex flex-col text-xs ${
                                isAgent ? "items-start" : "items-end"
                              }`}
                            >
                              <span className="text-[10px] text-[#6b7280] mb-0.5 font-medium">
                                {isAgent ? "Shanaya (Voice Agent)" : "Caller"}
                              </span>
                              <div
                                className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-relaxed ${
                                  isAgent
                                    ? "bg-white text-[#141414] border border-[#e5e7eb]"
                                    : "bg-[#141414] text-white"
                                }`}
                              >
                                {msg.text}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-4 text-center text-xs text-[#6b7280]">
                          <p>Detailed turn-by-turn transcript is saved upon call completion.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Inquiry Modal */}
      {editingInquiry && (
        <EditInquiryDialog
          inquiry={editingInquiry}
          backendUrl={backendUrl}
          isOpen={true}
          onClose={() => setEditingInquiry(null)}
          onSaved={handleSavedInquiry}
        />
      )}
    </div>
  );
}
