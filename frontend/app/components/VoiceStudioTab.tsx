"use client";

import React, { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteTrackPublication } from "livekit-client";
import {
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Volume2,
  Zap,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

interface VoiceStudioTabProps {
  backendUrl: string;
  onCallStateChange?: (isLive: boolean) => void;
}

export default function VoiceStudioTab({
  backendUrl,
  onCallStateChange,
}: VoiceStudioTabProps) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Telecom Pulse Calculation (₹0.45 per 60-second block)
  const pulses = Math.max(1, Math.ceil(callDuration / 60));
  const telephonyCost = (pulses * 0.45).toFixed(2);
  const secondsIntoCurrentPulse = callDuration % 60 || (callDuration > 0 ? 60 : 0);
  const pulseProgressPercent = Math.min(100, Math.round((secondsIntoCurrentPulse / 60) * 100));

  useEffect(() => {
    if (connected) {
      if (onCallStateChange) onCallStateChange(true);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (onCallStateChange) onCallStateChange(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [connected, onCallStateChange]);

  const startVoiceCall = async () => {
    setConnecting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${backendUrl}/api/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_name: "Operations-Evaluator" }),
      });

      if (!res.ok) {
        throw new Error(`Token service error: ${res.statusText}`);
      }

      const data = await res.json();
      const token = data.token;
      const wsUrl = data.url;
      setRoomName(data.room_name);

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track: Track, publication: RemoteTrackPublication) => {
        if (track.kind === Track.Kind.Audio) {
          if (!audioElRef.current) {
            audioElRef.current = document.createElement("audio");
            audioElRef.current.autoplay = true;
            document.body.appendChild(audioElRef.current);
          }
          track.attach(audioElRef.current);
        }
      });

      newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        let agentActive = false;
        let userActive = false;
        speakers.forEach((s) => {
          if (s.isAgent || s.identity.includes("agent") || s.identity.includes("eximple")) {
            agentActive = true;
          } else {
            userActive = true;
          }
        });
        setAgentSpeaking(agentActive);
        setUserSpeaking(userActive);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setRoom(null);
        if (onCallStateChange) onCallStateChange(false);
      });

      await newRoom.connect(wsUrl, token);
      await newRoom.localParticipant.setMicrophoneEnabled(true);

      setRoom(newRoom);
      setConnected(true);
    } catch (err: any) {
      console.error("Failed to connect voice session:", err);
      setErrorMessage(err.message || "Failed to start call. Ensure server is active.");
    } finally {
      setConnecting(false);
    }
  };

  const endVoiceCall = async () => {
    if (room) {
      await room.disconnect();
    }
    setConnected(false);
    setRoom(null);
    if (onCallStateChange) onCallStateChange(false);
  };

  const toggleMute = async () => {
    if (room) {
      const nextMuted = !isMuted;
      await room.localParticipant.setMicrophoneEnabled(!nextMuted);
      setIsMuted(nextMuted);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-7 space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-[#0066ff] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voice Intelligence Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141414] tracking-tight">
              Talk to Shubh.
            </h1>
            <p className="text-xs sm:text-sm text-[#6b7280]">
              Autonomous Hindi-English freight intake specialist with conversational pauses, instant entity capture, and barge-in interruption.
            </p>
          </div>

          {connected && (
            <div className="flex items-center space-x-2 bg-[#0066ff]/10 border border-[#0066ff]/20 px-4 py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0066ff] animate-ping" />
              <span className="text-xs font-mono font-bold text-[#0066ff]">
                LIVE {formatTime(callDuration)}
              </span>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Main Studio Viewport */}
      <div className="bg-white border border-[#e5e7eb] rounded-3xl p-8 sm:p-12 text-center space-y-8">
        {!connected ? (
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-24 h-24 rounded-full bg-[#f8f9fa] border border-[#e5e7eb] mx-auto flex items-center justify-center">
              <Volume2 className="w-10 h-10 text-[#141414]" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#141414] tracking-tight">
                Simulate Exporter Inbound Call
              </h2>
              <p className="text-xs text-[#6b7280] mt-1.5 leading-relaxed">
                Connect your browser microphone to evaluate conversational intake for FCL/LCL cargo, container sizing, and destination countries.
              </p>
            </div>

            <button
              onClick={startVoiceCall}
              disabled={connecting}
              className="w-full sm:w-auto px-10 py-3.5 rounded-full bg-[#141414] hover:bg-black text-white font-bold text-xs tracking-wider uppercase transition-all shadow-none disabled:opacity-50 cursor-pointer inline-flex items-center justify-center space-x-2.5"
            >
              <Mic className="w-4 h-4" />
              <span>{connecting ? "Connecting to Shubh..." : "Start Call with Shubh"}</span>
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto space-y-8">
            {/* Visualizer and Speaker State */}
            <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-3xl p-8 space-y-4">
              <div className="flex items-center justify-center space-x-2 h-14">
                <span className={`w-2 rounded-full bg-[#141414] ${agentSpeaking ? "wave-bar-1" : "h-1.5"}`} />
                <span className={`w-2 rounded-full bg-[#141414] ${agentSpeaking ? "wave-bar-2" : "h-2.5"}`} />
                <span className={`w-2 rounded-full bg-[#0066ff] ${agentSpeaking ? "wave-bar-3" : "h-2"}`} />
                <span className={`w-2 rounded-full bg-[#141414] ${agentSpeaking ? "wave-bar-4" : "h-3.5"}`} />
                <span className={`w-2 rounded-full bg-[#0066ff] ${agentSpeaking ? "wave-bar-5" : "h-1.5"}`} />
                <span className={`w-2 rounded-full bg-[#141414] ${agentSpeaking ? "wave-bar-6" : "h-2.5"}`} />
                <span className={`w-2 rounded-full bg-[#141414] ${agentSpeaking ? "wave-bar-7" : "h-1.5"}`} />
              </div>

              <div>
                <p className="text-base font-bold text-[#141414]">
                  {agentSpeaking
                    ? "Shubh is speaking..."
                    : userSpeaking
                    ? "Listening to your request..."
                    : "Shubh is listening..."}
                </p>
                <p className="text-xs text-[#6b7280] font-mono mt-0.5">Session: {roomName}</p>
              </div>
            </div>

            {/* Carrier Billing Pulse Progress Gauge */}
            <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-5 space-y-2.5 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#141414] font-bold flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-[#0066ff]" />
                  <span>Carrier Telephony Pulse #{pulses}</span>
                </span>
                <span className="font-mono font-bold text-[#141414]">
                  ₹{telephonyCost} Accrued
                </span>
              </div>

              <div className="w-full bg-[#e5e7eb] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#141414] h-full transition-all duration-300"
                  style={{ width: `${pulseProgressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-[#6b7280]">
                <span>{secondsIntoCurrentPulse}s into current 60s pulse</span>
                <span>Standard ₹0.45 / 60s block</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4 pt-2">
              <button
                onClick={toggleMute}
                className={`p-3.5 rounded-full border transition-all cursor-pointer ${
                  isMuted
                    ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                    : "bg-white border-[#e5e7eb] text-[#141414] hover:bg-[#f1f3f5]"
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={endVoiceCall}
                className="px-8 py-3 rounded-full bg-[#141414] hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Disconnect Call</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Operational Test Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#6b7280]">
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 space-y-1.5">
          <h3 className="font-bold text-[#141414] flex items-center space-x-1.5">
            <CheckCircle className="w-4 h-4 text-[#0066ff]" />
            <span>FCL vs. LCL Questions</span>
          </h3>
          <p className="leading-relaxed text-[11px]">
            Shubh will ask if the shipment is full container (FCL) or loose cargo (LCL). Specifying FCL prompts for container size; LCL bypasses container sizing.
          </p>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 space-y-1.5">
          <h3 className="font-bold text-[#141414] flex items-center space-x-1.5">
            <CheckCircle className="w-4 h-4 text-[#0066ff]" />
            <span>Country Fallback</span>
          </h3>
          <p className="leading-relaxed text-[11px]">
            Callers can mention country names (e.g. &quot;Germany&quot;, &quot;Dubai&quot;) without knowing port UN/LOCODEs. Shubh accepts the country gracefully.
          </p>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 space-y-1.5">
          <h3 className="font-bold text-[#141414] flex items-center space-x-1.5">
            <CheckCircle className="w-4 h-4 text-[#0066ff]" />
            <span>Sales Reassurance</span>
          </h3>
          <p className="leading-relaxed text-[11px]">
            All inquiries are registered into the operations desk with an explicit guarantee that Eximple&apos;s sales desk will follow up promptly with rates.
          </p>
        </div>
      </div>
    </div>
  );
}
