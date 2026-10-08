"use client";

import React, { useState, useEffect } from "react";
import Sidebar, { DashboardTab } from "./components/Sidebar";
import InquiryListTab from "./components/InquiryListTab";
import CostListTab from "./components/CostListTab";
import VoiceStudioTab from "./components/VoiceStudioTab";
import OutboundDialerTab from "./components/OutboundDialerTab";
import {
  Menu,
  X,
  Radio,
  CheckCircle,
  ShieldAlert,
  Mic,
  ArrowRight,
  Ship,
} from "lucide-react";

export default function Home() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const [activeTab, setActiveTab] = useState<DashboardTab>("inquiries");
  const [inquiriesCount, setInquiriesCount] = useState<number>(0);
  const [totalSpend, setTotalSpend] = useState<number>(0);
  const [isCallLive, setIsCallLive] = useState<boolean>(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${backendUrl}/health`);
        setBackendHealthy(res.ok);
      } catch {
        setBackendHealthy(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  // Tab Breadcrumbs mapping
  const tabTitles: Record<DashboardTab, { title: string; subtitle: string }> = {
    inquiries: {
      title: "Inquiries Manifest",
      subtitle: "Ocean freight demand and container sizing triage",
    },
    costs: {
      title: "Cost & Telemetry",
      subtitle: "Carrier pulses, compute ledger, and per-session telemetry",
    },
    voice: {
      title: "Voice Agent Studio",
      subtitle: "Interactive in-browser testing with Shubh",
    },
    outbound: {
      title: "Outbound Dispatcher",
      subtitle: "Carrier cellular telephony calling via Vobiz SIP trunk",
    },
  };

  return (
    <div className="h-screen w-screen bg-[#f8f9fa] text-[#141414] flex flex-row overflow-hidden selection:bg-[#141414] selection:text-white">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block shrink-0 h-screen">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          inquiriesCount={inquiriesCount}
          totalSpend={totalSpend}
          isCallLive={isCallLive}
          backendHealthy={backendHealthy}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 bg-white flex flex-col h-full">
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="w-8 h-8 rounded-full border border-[#e5e7eb] flex items-center justify-center text-[#6b7280]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(t) => {
                setActiveTab(t);
                setMobileSidebarOpen(false);
              }}
              inquiriesCount={inquiriesCount}
              totalSpend={totalSpend}
              isCallLive={isCallLive}
              backendHealthy={backendHealthy}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Operational Header (always pinned at top) */}
        <header className="shrink-0 bg-white border-b border-[#e5e7eb] px-6 py-4 flex items-center justify-between z-30">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-full border border-[#e5e7eb] text-[#141414] hover:bg-[#f8f9fa]"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center space-x-2 text-xs text-[#6b7280]">
                <span>Eximple Freight Operations</span>
                <span>/</span>
                <span className="font-semibold text-[#141414]">
                  {tabTitles[activeTab].title}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-3">
            {/* Live Call Banner Indicator */}
            {isCallLive && (
              <button
                onClick={() => setActiveTab("voice")}
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0066ff] text-white text-xs font-bold animate-pulse cursor-pointer shadow-none"
              >
                <Radio className="w-3.5 h-3.5 text-white" />
                <span>Call In Progress &bull; View Studio</span>
              </button>
            )}

            {/* Quick Trigger Button */}
            {activeTab !== "voice" && (
              <button
                onClick={() => setActiveTab("voice")}
                className="hidden sm:inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#141414] hover:bg-black text-white text-xs font-semibold transition-all cursor-pointer shadow-none"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Simulate Call</span>
              </button>
            )}

            {/* System Status Stadium Pill */}
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#f8f9fa] border border-[#e5e7eb] text-xs font-medium">
              {backendHealthy === null ? (
                <span className="text-[#6b7280]">Connecting...</span>
              ) : backendHealthy ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[#141414] font-semibold text-[11px]">Online</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-amber-700 font-semibold text-[11px]">Port 8000</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Tab Viewport */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="max-w-7xl mx-auto w-full space-y-8">
            {activeTab === "inquiries" && (
              <InquiryListTab
                backendUrl={backendUrl}
                onInquiriesLoaded={setInquiriesCount}
              />
            )}

            {activeTab === "costs" && (
              <CostListTab
                backendUrl={backendUrl}
                onTotalSpendLoaded={setTotalSpend}
              />
            )}

            {activeTab === "voice" && (
              <VoiceStudioTab
                backendUrl={backendUrl}
                onCallStateChange={setIsCallLive}
              />
            )}

            {activeTab === "outbound" && (
              <OutboundDialerTab backendUrl={backendUrl} />
            )}

            {/* Subtle Clean Operational Footer */}
            <div className="pt-8 pb-4 text-center text-xs text-[#9ca3af] border-t border-[#e5e7eb] flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>&copy; 2026 Eximple Logistics Technologies. All rights reserved.</p>
              <p className="font-mono text-[11px]">Carrier Pulse: ₹0.45/60s &bull; Sub-Second Neural Inference</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
