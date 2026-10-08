"use client";

import React, { useState } from "react";
import {
  PhoneCall,
  CheckCircle,
  AlertCircle,
  PhoneForwarded,
  Loader2,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe2,
} from "lucide-react";

interface OutboundDialerTabProps {
  backendUrl: string;
}

export default function OutboundDialerTab({ backendUrl }: OutboundDialerTabProps) {
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    dispatchId?: string;
  } | null>(null);

  const handleDial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.trim().length < 8) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${backendUrl}/api/calls/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_phone: phoneNumber.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to dispatch call.");
      }

      setResult({
        success: true,
        message: data.message || `Outbound cellular dispatch initiated to ${phoneNumber}`,
        dispatchId: data.dispatch_id,
      });
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "Failed to connect with dispatch gateway.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-7 space-y-2">
        <div className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-[#0066ff] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cellular Telephony Gateway</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141414] tracking-tight">
          Outbound Telephony Dispatcher.
        </h1>
        <p className="text-xs sm:text-sm text-[#6b7280]">
          Deploy Shubh to initiate outbound calls to shippers, exporters, and logistics managers over regular telephone networks.
        </p>
      </div>

      {/* Main Dialer Card */}
      <div className="bg-white border border-[#e5e7eb] rounded-3xl p-8 sm:p-10 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-3.5 pb-6 border-b border-[#f1f3f5]">
          <div className="w-12 h-12 rounded-[28%] bg-[#141414] text-white flex items-center justify-center shrink-0">
            <PhoneForwarded className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#141414] tracking-tight">
              Direct PSTN / Mobile Call Trigger
            </h2>
            <p className="text-xs text-[#6b7280]">
              Dispatches an autonomous agent outbound session via Vobiz carrier SIP media gateway.
            </p>
          </div>
        </div>

        <form onSubmit={handleDial} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#141414]">
              Destination Mobile / Landline (E.164 International Format)
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+919876543210"
              className="w-full bg-[#f1f3f5] border border-transparent focus:border-[#141414] focus:bg-white rounded-full px-5 py-3.5 text-base text-[#141414] placeholder-[#9ca3af] outline-none font-mono tracking-wider transition-all"
              required
            />
            <div className="flex flex-wrap items-center justify-between text-[11px] text-[#6b7280] pt-1">
              <span>Must include country code (+91 for India)</span>
              <span className="font-mono font-medium text-[#141414]">Carrier Rate: ₹0.45 / 60s pulse</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-full bg-[#141414] hover:bg-black text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2.5 disabled:opacity-50 cursor-pointer shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Dispatching SIP Call to Phone...</span>
              </>
            ) : (
              <>
                <PhoneCall className="w-4 h-4" />
                <span>Initiate Outbound Call to {phoneNumber}</span>
              </>
            )}
          </button>
        </form>

        {result && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-start space-x-3 ${
              result.success
                ? "bg-[#0066ff]/5 border-[#0066ff]/20 text-[#141414]"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {result.success ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-[#0066ff] mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold">{result.message}</p>
              {result.dispatchId && (
                <p className="text-[11px] text-[#6b7280] font-mono">
                  LiveKit Dispatch Reference: {result.dispatchId}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Carrier Architecture Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#6b7280]">
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-[#141414] font-bold">
            <Zap className="w-4 h-4 text-[#0066ff]" />
            <span>Telephony Pulse Billing</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            Calls are billed strictly in 60-second carrier increments at ₹0.45 per block via Vobiz SIP Trunk media gateways.
          </p>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-[#141414] font-bold">
            <Globe2 className="w-4 h-4 text-[#0066ff]" />
            <span>PSTN Audio Codec</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            Uses G.711 PCMU/PCMA carrier codecs with real-time server-side noise reduction for clear conversation in factory or transit noise.
          </p>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-[#141414] font-bold">
            <ShieldCheck className="w-4 h-4 text-[#0066ff]" />
            <span>Automatic Sync</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            Once the call concludes, the inquiry details and session cost telemetry automatically synchronize into your Inquiries Manifest and Cost Ledger.
          </p>
        </div>
      </div>
    </div>
  );
}
