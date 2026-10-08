"use client";

import React, { useState } from "react";
import { X, Check, Loader2, Sparkles } from "lucide-react";

export interface InquiryData {
  id: string;
  company_name: string;
  pol: string;
  pod: string;
  cargo: string;
  load_type?: "FCL" | "LCL";
  container_type: string;
  inquiry_type?: string;
  status: string;
  notes?: string;
  session_id?: string;
  created_at: string;
}

interface EditInquiryDialogProps {
  inquiry: InquiryData;
  backendUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: InquiryData) => void;
}

export default function EditInquiryDialog({
  inquiry,
  backendUrl,
  isOpen,
  onClose,
  onSaved,
}: EditInquiryDialogProps) {
  const [companyName, setCompanyName] = useState(inquiry.company_name || "");
  const [loadType, setLoadType] = useState<"FCL" | "LCL">(
    inquiry.load_type === "LCL" ? "LCL" : "FCL"
  );
  const [pol, setPol] = useState(inquiry.pol || "");
  const [pod, setPod] = useState(inquiry.pod || "");
  const [cargo, setCargo] = useState(inquiry.cargo || "");
  const [containerType, setContainerType] = useState(inquiry.container_type || "20ft Standard");
  const [status, setStatus] = useState(inquiry.status || "Sales Desk Assigned");
  const [notes, setNotes] = useState(inquiry.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      company_name: companyName.trim(),
      load_type: loadType,
      pol: pol.trim(),
      pod: pod.trim(),
      cargo: cargo.trim(),
      container_type: containerType.trim(),
      status: status,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch(`${backendUrl}/api/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update inquiry.");
      }

      const updated = await res.json();
      onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-8 space-y-6 shadow-none animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[11px] font-semibold tracking-wider text-[#0066ff] uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Operations Desk</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#141414]">
              Edit Freight Inquiry.
            </h2>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Update shipment routing, container specs, or assignment status.
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full border border-[#e5e7eb] flex items-center justify-center text-[#6b7280] hover:text-[#141414] hover:bg-[#f1f3f5] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-xs font-semibold text-[#141414] mb-1.5">
              Company Name
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-[#f1f3f5] border border-transparent focus:border-[#141414] focus:bg-white rounded-full px-4 py-2.5 text-xs text-[#141414] outline-none transition-all"
              placeholder="e.g. Apex Exports Pvt Ltd"
            />
          </div>

          {/* Load Type Segmented Pill Toggle */}
          <div>
            <label className="block text-xs font-semibold text-[#141414] mb-1.5">
              Shipment Load Type
            </label>
            <div className="inline-flex p-1 bg-[#f1f3f5] rounded-full border border-[#e5e7eb]">
              <button
                type="button"
                onClick={() => setLoadType("FCL")}
                className={`px-5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  loadType === "FCL"
                    ? "bg-[#141414] text-white shadow-none"
                    : "text-[#6b7280] hover:text-[#141414]"
                }`}
              >
                FCL (Full Container)
              </button>
              <button
                type="button"
                onClick={() => setLoadType("LCL")}
                className={`px-5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  loadType === "LCL"
                    ? "bg-[#141414] text-white shadow-none"
                    : "text-[#6b7280] hover:text-[#141414]"
                }`}
              >
                LCL (Less than Container)
              </button>
            </div>
          </div>

          {/* Routing: POL & POD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1.5">
                Port of Loading (POL)
              </label>
              <input
                type="text"
                required
                value={pol}
                onChange={(e) => setPol(e.target.value)}
                className="w-full bg-[#f1f3f5] border border-transparent focus:border-[#141414] focus:bg-white rounded-full px-4 py-2.5 text-xs text-[#141414] outline-none transition-all"
                placeholder="e.g. Nhava Sheva (JNPT)"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1.5">
                Port of Discharge (POD)
              </label>
              <input
                type="text"
                required
                value={pod}
                onChange={(e) => setPod(e.target.value)}
                className="w-full bg-[#f1f3f5] border border-transparent focus:border-[#141414] focus:bg-white rounded-full px-4 py-2.5 text-xs text-[#141414] outline-none transition-all"
                placeholder="e.g. Jebel Ali (Dubai)"
              />
            </div>
          </div>

          {/* Cargo & Container Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1.5">
                Cargo Commodity
              </label>
              <input
                type="text"
                required
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full bg-[#f1f3f5] border border-transparent focus:border-[#141414] focus:bg-white rounded-full px-4 py-2.5 text-xs text-[#141414] outline-none transition-all"
                placeholder="e.g. Cotton Yarn / Rice / Auto Parts"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1.5">
                Container / Unit Type
              </label>
              <input
                type="text"
                required
                value={containerType}
                onChange={(e) => setContainerType(e.target.value)}
                className="w-full bg-[#f1f3f5] border border-transparent focus:border-[#141414] focus:bg-white rounded-full px-4 py-2.5 text-xs text-[#141414] outline-none transition-all"
                placeholder="e.g. 20ft Standard, 40ft HC, 5 CBM"
              />
            </div>
          </div>

          {/* Operational Status */}
          <div>
            <label className="block text-xs font-semibold text-[#141414] mb-1.5">
              Fulfillment Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[#f1f3f5] border border-transparent focus:border-[#141414] focus:bg-white rounded-full px-4 py-2.5 text-xs text-[#141414] outline-none transition-all cursor-pointer"
            >
              <option value="sales_assigned">Sales Desk Assigned</option>
              <option value="processing">In Review / Processing</option>
              <option value="rates_calculated">Rates Calculated</option>
              <option value="completed">Completed / Dispatched</option>
              <option value="new">New Inquiry</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#141414] mb-1.5">
              Operations & Freight Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#f1f3f5] border border-transparent focus:border-[#141414] focus:bg-white rounded-2xl p-3 text-xs text-[#141414] outline-none transition-all resize-none"
              placeholder="Additional cargo weight, hazardous class, or target dispatch timeline..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-[#e5e7eb] text-xs font-medium text-[#141414] hover:bg-[#f1f3f5] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-1.5 px-6 py-2 rounded-full bg-[#141414] text-white text-xs font-semibold hover:bg-black transition-all disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
