"use client";

import React from "react";
import {
  Ship,
  FileSpreadsheet,
  Coins,
  Radio,
  PhoneForwarded,
  CheckCircle,
  ShieldAlert,
  Zap,
} from "lucide-react";

export type DashboardTab = "inquiries" | "costs" | "voice" | "outbound";

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  inquiriesCount?: number;
  totalSpend?: number;
  isCallLive?: boolean;
  backendHealthy?: boolean | null;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  inquiriesCount = 0,
  totalSpend = 0,
  isCallLive = false,
  backendHealthy = true,
}: SidebarProps) {
  const navItems = [
    {
      id: "inquiries" as DashboardTab,
      label: "Inquiries Manifest",
      description: "Cargo specs & customer manifests",
      icon: FileSpreadsheet,
      badge: inquiriesCount > 0 ? `${inquiriesCount}` : undefined,
      badgeColor: "bg-[#141414] text-white",
    },
    {
      id: "costs" as DashboardTab,
      label: "Cost & Telemetry",
      description: "Carrier pulses & compute ledger",
      icon: Coins,
      badge: totalSpend > 0 ? `₹${totalSpend.toFixed(1)}` : undefined,
      badgeColor: "bg-[#f1f3f5] text-[#141414] border border-[#e5e7eb]",
    },
    {
      id: "voice" as DashboardTab,
      label: "Voice Agent Studio",
      description: "Interactive browser voice testing",
      icon: Radio,
      badge: isCallLive ? "LIVE" : undefined,
      badgeColor: "bg-[#0066ff] text-white animate-pulse",
    },
    {
      id: "outbound" as DashboardTab,
      label: "Outbound Dispatcher",
      description: "Cellular telephony calling",
      icon: PhoneForwarded,
      badge: "Vobiz SIP",
      badgeColor: "bg-[#f1f3f5] text-[#6b7280] border border-[#e5e7eb]",
    },
  ];

  return (
    <aside className="w-72 h-screen sticky top-0 bg-white border-r border-[#e5e7eb] flex flex-col justify-between shrink-0 overflow-y-auto select-none z-40">
      <div className="p-6 space-y-6 shrink-0">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 pb-6 border-b border-[#f1f3f5]">
          <div className="w-10 h-10 rounded-[28%] bg-[#141414] text-white flex items-center justify-center shrink-0">
            <Ship className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold tracking-tight text-base text-[#141414]">
                EXIMPLE
              </span>
              <span className="text-[10px] font-semibold bg-[#f1f3f5] text-[#6b7280] px-2 py-0.5 rounded-full border border-[#e5e7eb]">
                v1.0
              </span>
            </div>
            <p className="text-xs text-[#6b7280]">Freight Voice Telemetry</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider px-3 mb-2">
            Operations Workspace
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-3.5 py-3 rounded-2xl transition-all flex items-center justify-between group cursor-pointer ${
                  isActive
                    ? "bg-[#141414] text-white"
                    : "text-[#141414] hover:bg-[#f8f9fa]"
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? "bg-white/15 text-white"
                        : "bg-[#f1f3f5] text-[#141414] group-hover:bg-[#e5e7eb]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold tracking-tight truncate ${
                        isActive ? "text-white" : "text-[#141414]"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p
                      className={`text-[10px] truncate ${
                        isActive ? "text-gray-300" : "text-[#6b7280]"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`ml-2 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Telemetry Status */}
      <div className="p-6 border-t border-[#f1f3f5] space-y-3 shrink-0">
        <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6b7280] flex items-center space-x-1.5 text-[11px]">
              <Zap className="w-3.5 h-3.5 text-[#0066ff]" />
              <span>Carrier Pulse</span>
            </span>
            <span className="font-mono font-bold text-[#141414] text-xs">
              ₹0.45 / 60s
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6b7280] pt-1 border-t border-[#e5e7eb]">
            <span>System State</span>
            <span className="flex items-center space-x-1">
              {backendHealthy ? (
                <>
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Online</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                  <span className="text-amber-700 font-medium">Offline</span>
                </>
              )}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-[#9ca3af] text-center">
          Eximple Autonomous Logistics © 2026
        </p>
      </div>
    </aside>
  );
}
