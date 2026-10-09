"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Search,
  Zap,
  MessageSquare,
  Sparkles,
  Filter,
} from "lucide-react";
import EditInquiryDialog, { InquiryData } from "./EditInquiryDialog";
import { SessionCostReport } from "./InquiryFeed";

interface InquiryListTabProps {
  backendUrl: string;
  onInquiriesLoaded?: (count: number) => void;
}

export default function InquiryListTab({
  backendUrl,
  onInquiriesLoaded,
}: InquiryListTabProps) {
  const [inquiries, setInquiries] = useState<InquiryData[]>([]);
  const [costReports, setCostReports] = useState<Record<string, SessionCostReport>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});
  const [editingInquiry, setEditingInquiry] = useState<InquiryData | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inqRes, costRes] = await Promise.all([
        fetch(`${backendUrl}/api/inquiries`),
        fetch(`${backendUrl}/api/calls/cost`),
      ]);

      if (inqRes.ok) {
        const inqData: InquiryData[] = await inqRes.json();
        setInquiries(inqData);
        if (onInquiriesLoaded) onInquiriesLoaded(inqData.length);
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
    const interval = setInterval(fetchData, 6000);
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

  // Filter & Search Logic
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inq.company_name?.toLowerCase().includes(q) ||
        inq.cargo?.toLowerCase().includes(q) ||
        inq.pol?.toLowerCase().includes(q) ||
        inq.pod?.toLowerCase().includes(q) ||
        inq.container_type?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedFilter === "FCL") return inq.load_type === "FCL";
      if (selectedFilter === "LCL") return inq.load_type === "LCL";
      if (selectedFilter === "PROCESSING") return inq.status === "processing";
      if (selectedFilter === "SALES_ASSIGNED")
        return inq.status === "sales_assigned" || !inq.status;
      if (selectedFilter === "COMPLETED") return inq.status === "completed";

      return true;
    });
  }, [inquiries, searchQuery, selectedFilter]);

  const fclCount = inquiries.filter((i) => i.load_type === "FCL").length;
  const lclCount = inquiries.filter((i) => i.load_type === "LCL").length;

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-[#0066ff] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Operations Manifest</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141414] tracking-tight">
              Ocean Freight Inquiries.
            </h1>
            <p className="text-xs sm:text-sm text-[#6b7280] mt-0.5">
              Comprehensive list of captured customer demands with linked carrier pulse audits.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchData}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full border border-[#e5e7eb] bg-white text-xs font-semibold text-[#141414] hover:bg-[#f8f9fa] transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0066ff]" : ""}`} />
              <span>Refresh Inquiries</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#f1f3f5]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9ca3af] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company, cargo commodity, or port (e.g. Mundra, Dubai, Rice)..."
              className="w-full bg-[#f1f3f5] border border-transparent focus:border-[#141414] focus:bg-white rounded-full pl-10 pr-4 py-2.5 text-xs text-[#141414] placeholder-[#9ca3af] outline-none transition-all"
            />
          </div>

          {/* Segmented Stadium Filter Pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            {[
              { id: "ALL", label: `All (${inquiries.length})` },
              { id: "FCL", label: `FCL (${fclCount})` },
              { id: "LCL", label: `LCL (${lclCount})` },
              { id: "SALES_ASSIGNED", label: "Assigned" },
              { id: "PROCESSING", label: "In Review" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  selectedFilter === f.id
                    ? "bg-[#141414] text-white"
                    : "bg-[#f1f3f5] text-[#6b7280] hover:text-[#141414] hover:bg-[#e5e7eb]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inquiry List Cards */}
      {filteredInquiries.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-3xl p-12 text-center text-[#6b7280]">
          <div className="w-12 h-12 rounded-[28%] bg-[#f1f3f5] mx-auto mb-3 flex items-center justify-center">
            <Ship className="w-6 h-6 text-[#9ca3af]" />
          </div>
          <p className="text-base font-bold text-[#141414]">No matching freight inquiries found.</p>
          <p className="text-xs text-[#6b7280] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "Try adjusting your search query or switching filter tabs."
              : "Place a call through the Voice Agent Studio or Outbound Dispatcher to record an inquiry."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((inq) => {
            const report = inq.session_id ? costReports[inq.session_id] : null;
            const hasTranscript =
              (report?.transcript && report.transcript.length > 0) || false;
            const isTranscriptOpen = !!expandedTranscripts[inq.id];

            return (
              <div
                key={inq.id}
                className="bg-white border border-[#e5e7eb] hover:border-[#d1d5db] rounded-3xl p-6 sm:p-7 space-y-4 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-[28%] bg-[#141414] text-white flex items-center justify-center shrink-0">
                      <Anchor className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2.5">
                        <h3 className="text-lg font-bold text-[#141414] tracking-tight">
                          {inq.company_name}
                        </h3>
                        <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#141414] text-white">
                          {inq.load_type || "FCL"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <p className="text-xs text-[#6b7280]">
                          Commodity:{" "}
                          <span className="text-[#141414] font-medium">{inq.cargo}</span>
                        </p>
                        {inq.whatsapp_opt_in !== false ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <MessageSquare className="w-3 h-3" />
                            <span>WA: {inq.whatsapp_number || inq.caller_number || "Opted In"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                            <span>WA: Declined (Call only)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#0066ff]/10 text-[#0066ff] border border-[#0066ff]/20">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{formatStatusLabel(inq.status)}</span>
                    </span>

                    <button
                      onClick={() => setEditingInquiry(inq)}
                      className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full border border-[#e5e7eb] hover:border-[#141414] bg-white text-xs font-semibold text-[#141414] transition-all cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Inquiry</span>
                    </button>
                  </div>
                </div>

                {/* Routing & Container Specs Banner */}
                <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-3 text-[#141414] font-bold">
                    <span className="text-sm">{inq.pol}</span>
                    <ArrowRight className="w-4 h-4 text-[#9ca3af]" />
                    <span className="text-sm">{inq.pod}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[#141414] font-medium">
                    <Box className="w-4 h-4 text-[#6b7280]" />
                    <span className="font-mono text-xs">{inq.container_type}</span>
                  </div>
                </div>

                {/* Linked Individual Session Cost Analysis */}
                <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-[#141414]">
                      <Zap className="w-4 h-4 text-[#0066ff]" />
                      <span>Linked Telephony & Compute Telemetry</span>
                    </div>
                    {report ? (
                      <span className="text-xs font-mono font-bold text-[#141414] bg-white px-3 py-1 rounded-full border border-[#e5e7eb]">
                        Session Cost: ₹{(report.total_cost_inr ?? 0).toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-[#6b7280]">
                        Telephony Pulse: ₹0.45 / 60s standard
                      </span>
                    )}
                  </div>

                  {report ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="bg-white rounded-xl p-2.5 border border-[#e5e7eb]">
                        <span className="text-[#6b7280] block text-[10px] font-semibold">
                          CALL AIRTIME
                        </span>
                        <span className="font-mono font-bold text-[#141414]">
                          {formatSeconds(report.duration_seconds || 0)}
                        </span>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 border border-[#e5e7eb]">
                        <span className="text-[#6b7280] block text-[10px] font-semibold">
                          TELEPHONY PULSES
                        </span>
                        <span className="font-mono font-bold text-[#141414]">
                          {report.telephony_pulses ?? 0} @ ₹{(report.telephony_pulse_rate_inr ?? 0.45).toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 border border-[#e5e7eb]">
                        <span className="text-[#6b7280] block text-[10px] font-semibold">
                          AI COMPUTE CHARGE
                        </span>
                        <span className="font-mono font-bold text-[#141414]">
                          ₹{((report.stt_cost_inr || 0) + (report.llm_cost_inr || 0) + (report.tts_cost_inr || 0)).toFixed(4)}
                        </span>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 border border-[#e5e7eb]">
                        <span className="text-[#6b7280] block text-[10px] font-semibold">
                          AUDIO LATENCY (P50)
                        </span>
                        <span className="font-mono font-bold text-[#0066ff]">
                          {report.latency_p50_ms != null && report.latency_p50_ms > 0
                            ? `${report.latency_p50_ms} ms`
                            : "< 900 ms"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6b7280]">
                      Telemetry active. Billed in 60-second carrier increments with sub-second neural inference.
                    </p>
                  )}
                </div>

                {/* Expandable Conversation Transcript Accordion */}
                <div className="border-t border-[#f1f3f5] pt-3.5">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleTranscript(inq.id)}
                      className="inline-flex items-center space-x-2 text-xs font-bold text-[#141414] hover:text-[#0066ff] transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-[#6b7280]" />
                      <span>
                        {hasTranscript
                          ? `Conversation Transcript Audit (${report?.transcript?.length} turns)`
                          : "Conversation Transcript Audit"}
                      </span>
                      {isTranscriptOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#6b7280]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#6b7280]" />
                      )}
                    </button>

                    <div className="flex items-center space-x-1.5 text-xs text-[#6b7280]">
                      <Clock className="w-3.5 h-3.5 text-[#9ca3af]" />
                      <span>
                        {new Date(inq.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {isTranscriptOpen && (
                    <div className="mt-3.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 space-y-2.5 max-h-72 overflow-y-auto">
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
                              <span className="text-[10px] text-[#6b7280] mb-0.5 font-semibold">
                                {isAgent ? "Shanaya (Voice Agent)" : "Caller"}
                              </span>
                              <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed ${
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

      {/* Edit Inquiry Modal Dialog */}
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
