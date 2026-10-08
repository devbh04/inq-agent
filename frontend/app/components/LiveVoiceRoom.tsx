"use client";

import React, { useState, useEffect, useRef } from "react";
import { Room, RoomEvent, Track, RemoteTrackPublication } from "livekit-client";
import { Mic, MicOff, PhoneOff, Radio, Volume2, Zap } from "lucide-react";

interface LiveVoiceRoomProps {
  backendUrl: string;
  onCallEnded?: () => void;
}

export default function LiveVoiceRoom({ backendUrl, onCallEnded }: LiveVoiceRoomProps) {
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
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [connected]);

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
        if (onCallEnded) onCallEnded();
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
    if (onCallEnded) onCallEnded();
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
    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#f1f3f5]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-[28%] bg-[#141414] text-white flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#141414] tracking-tight">
              Talk to Shubh.
            </h2>
            <p className="text-xs text-[#6b7280]">
              Autonomous freight specialist for container inquiry intake.
            </p>
          </div>
        </div>

        {connected && (
          <div className="flex items-center space-x-2 bg-[#0066ff]/10 border border-[#0066ff]/20 px-3.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#0066ff] animate-ping" />
            <span className="text-xs font-mono font-semibold text-[#0066ff]">
              LIVE {formatTime(callDuration)}
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs">
          {errorMessage}
        </div>
      )}

      {!connected ? (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#f8f9fa] border border-[#e5e7eb] flex items-center justify-center transition-all">
            <Volume2 className="w-8 h-8 text-[#141414]" />
          </div>
          <div>
            <h3 className="text-[#141414] font-bold text-sm tracking-tight">
              Interactive Web Telephony Test.
            </h3>
            <p className="text-[#6b7280] text-xs max-w-sm mt-1">
              Speak with Shubh to book a container inquiry. Evaluates natural conversational pauses and Hindi-English dialogue.
            </p>
          </div>
          <button
            onClick={startVoiceCall}
            disabled={connecting}
            className="px-8 py-3 rounded-full bg-[#141414] hover:bg-black text-white font-semibold text-xs tracking-wide transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>{connecting ? "Connecting to Shubh..." : "Start Call with Shubh"}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Active Call Status Card */}
          <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            {/* Visualizer bars */}
            <div className="flex items-center space-x-1.5 h-10 mb-3">
              <span className={`w-1.5 rounded-full bg-[#141414] ${agentSpeaking ? "wave-bar-1" : "h-1"}`} />
              <span className={`w-1.5 rounded-full bg-[#141414] ${agentSpeaking ? "wave-bar-2" : "h-2"}`} />
              <span className={`w-1.5 rounded-full bg-[#0066ff] ${agentSpeaking ? "wave-bar-3" : "h-1.5"}`} />
              <span className={`w-1.5 rounded-full bg-[#141414] ${agentSpeaking ? "wave-bar-4" : "h-3"}`} />
              <span className={`w-1.5 rounded-full bg-[#0066ff] ${agentSpeaking ? "wave-bar-5" : "h-1"}`} />
              <span className={`w-1.5 rounded-full bg-[#141414] ${agentSpeaking ? "wave-bar-6" : "h-2"}`} />
              <span className={`w-1.5 rounded-full bg-[#141414] ${agentSpeaking ? "wave-bar-7" : "h-1"}`} />
            </div>

            <p className="text-sm font-bold text-[#141414] mb-0.5">
              {agentSpeaking
                ? "Shubh is speaking..."
                : userSpeaking
                ? "Listening to caller..."
                : "Awaiting speech..."}
            </p>
            <p className="text-[11px] text-[#6b7280] font-mono">Room: {roomName}</p>
          </div>

          {/* Telephony Pulse Meter */}
          <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#141414] font-semibold flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-[#0066ff]" />
                <span>Carrier Pulse Meter</span>
              </span>
              <span className="font-mono font-bold text-[#141414]">
                Pulse #{pulses} (₹{telephonyCost})
              </span>
            </div>

            {/* Progress bar towards next pulse */}
            <div className="w-full bg-[#e5e7eb] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#141414] h-full transition-all duration-300"
                style={{ width: `${pulseProgressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#6b7280]">
              <span>{secondsIntoCurrentPulse}s of 60s pulse</span>
              <span>₹0.45 per pulse</span>
            </div>
          </div>

          {/* Call Controls */}
          <div className="flex items-center justify-center space-x-3 pt-1">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full border transition-all cursor-pointer ${
                isMuted
                  ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                  : "bg-white border-[#e5e7eb] text-[#141414] hover:bg-[#f1f3f5]"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={endVoiceCall}
              className="px-6 py-2.5 rounded-full bg-[#141414] hover:bg-black text-white text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
