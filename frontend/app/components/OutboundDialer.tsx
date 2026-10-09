"use client";

import React, { useState } from "react";
import { PhoneCall, CheckCircle, AlertCircle, PhoneForwarded, Loader2 } from "lucide-react";

interface OutboundDialerProps {
  backendUrl: string;
}

export default function OutboundDialer({ backendUrl }: OutboundDialerProps) {
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
        message: data.message || `Outbound telephony dispatch initiated to ${phoneNumber}`,
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
    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-7 space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-[#f1f3f5]">
        <div className="w-10 h-10 rounded-[28%] bg-[#141414] text-white flex items-center justify-center">
          <PhoneForwarded className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#141414] tracking-tight">
            Outbound Dispatcher.
          </h3>
          <p className="text-xs text-[#6b7280]">
            Deploy Shanaya to contact shippers directly over mobile telephony.
          </p>
        </div>
      </div>

      <form onSubmit={handleDial} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#141414] mb-1.5">
            Destination Phone Number (E.164 Format)
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+919876543210"
            className="w-full bg-[#f1f3f5] border border-transparent focus:border-[#141414] focus:bg-white rounded-full px-5 py-3 text-sm text-[#141414] placeholder-[#9ca3af] outline-none font-mono tracking-wider transition-all"
            required
          />
          <p className="text-[11px] text-[#6b7280] mt-1.5">
            Pulse standard: ₹0.45 per 60s airtime via Vobiz SIP carrier trunk.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-[#141414] hover:bg-black text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Dispatching Call...</span>
            </>
          ) : (
            <>
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Initiate Telephony Call</span>
            </>
          )}
        </button>
      </form>

      {result && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-start space-x-2.5 ${
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
          <div>
            <p className="font-semibold">{result.message}</p>
            {result.dispatchId && (
              <p className="text-[10px] text-[#6b7280] font-mono mt-0.5">
                Dispatch Reference: {result.dispatchId}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
