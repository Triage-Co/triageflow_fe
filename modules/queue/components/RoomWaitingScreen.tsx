"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRoomDisplaySocket } from "../hooks/useRoomDisplaySocket";
import { useQueueSound } from "../hooks/useQueueSound";
import { AnimatedQueueNumber } from "./AnimatedQueueNumber";
import { RebalanceBanner } from "./RebalanceBanner";
import { roomService } from "../services/roomService";
import { useAuthStore } from "@/modules/auth/store/authStore";
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Calendar,
  Shuffle,
} from "lucide-react";

const UPCOMING_DISPLAY_LIMIT = 7;

interface RoomWaitingScreenProps {
  roomId?: string;
  /** staff_id of the doctor assigned to this room — required for socket room join */
  staffId?: string;
}

const UI_LOG = "[TV Display][UI]";

export function RoomWaitingScreen({
  roomId: initialRoomId,
  staffId: initialStaffId,
}: RoomWaitingScreenProps) {
  const authUser = useAuthStore((s) => s.user);

  const isUuid = (value?: string) =>
    !!value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim(),
    );

  const [roomId] = useState<string | undefined>(initialRoomId);
  // TV is anonymous — only pass real staff UUID (never auth email like admin@gmail.com)
  const [staffId] = useState<string | undefined>(() => {
    if (isUuid(initialStaffId)) return initialStaffId!.trim();
    if (isUuid(authUser?.id)) return authUser!.id.trim();
    return undefined;
  });
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [blinkColon, setBlinkColon] = useState<boolean>(true);
  const [roomDetails, setRoomDetails] = useState<{
    roomName: string;
    department: string;
  } | null>(null);

  useEffect(() => {
    console.log(`${UI_LOG} mount`, {
      roomId: roomId ?? "(missing)",
      staffId: staffId ?? "(anonymous TV)",
      authUserId: authUser?.id ?? "(not logged in)",
      href: typeof window !== "undefined" ? window.location.href : "(ssr)",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- debug snapshot on first paint
  }, []);

  // Fetch room details (human readable room_name & specialty) if roomId is provided
  useEffect(() => {
    if (!roomId) return;
    roomService
      .getRooms()
      .then((rooms) => {
        const found = rooms.find(
          (r) => r.room_id === roomId || r.room_name === roomId,
        );
        if (found) {
          setRoomDetails({
            roomName: found.room_name,
            department: found.specialty?.specialty_name || "KHOA KHÁM BỆNH",
          });
        } else {
          console.warn(
            `${UI_LOG} roomId không có trong GET /api/room — vẫn join socket bằng UUID này`,
          );
        }
      })
      .catch((err) => {
        console.warn(`${UI_LOG} getRooms failed`, err);
      });
  }, [roomId]);

  // ── Sound & Audio Chime Hook ──────────────────────────────────────────────
  const {
    soundEnabled,
    setSoundEnabled,
    playDing,
    isAudioBlocked,
    enableAudio,
  } = useQueueSound();

  // ── Socket.IO real-time connection ────────────────────────────────────────
  const {
    data: socketData,
    rebalanceSuggestions,
    isConnected,
    error: socketError,
  } = useRoomDisplaySocket({
    roomId,
    staffId,
  });

  useEffect(() => {
    console.log(`${UI_LOG} socket state`, {
      isConnected,
      socketError,
      hasSocketData: !!socketData,
      current_number: socketData?.current_patient?.queue_number ?? null,
      upcoming_count: socketData?.upcoming_patients?.length ?? 0,
      upcoming_numbers: (socketData?.upcoming_patients ?? []).map(
        (p) => p.queue_number,
      ),
      room_info: socketData?.room_info ?? null,
    });
  }, [socketData, isConnected, socketError]);

  // Track queue number changes to trigger chime bell sound
  const prevQueueNumberRef = useRef<string | null>(null);

  useEffect(() => {
    const currentNum =
      socketData?.current_patient?.queue_number ?
        String(socketData.current_patient.queue_number).trim()
      : null;

    if (
      prevQueueNumberRef.current !== null &&
      currentNum !== null &&
      currentNum !== prevQueueNumberRef.current
    ) {
      playDing();
    }
    if (currentNum !== null) {
      prevQueueNumberRef.current = currentNum;
    }
  }, [socketData?.current_patient?.queue_number, playDing]);

  // ── Live Clock ────────────────────────────────────────────────────────────
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setBlinkColon((prev) => !prev);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  const formatVietnameseDate = (date: Date | null) => {
    if (!date) return "";
    const days = [
      "Chủ nhật",
      "Thứ hai",
      "Thứ ba",
      "Thứ tư",
      "Thứ năm",
      "Thứ sáu",
      "Thứ bảy",
    ];
    const dayName = days[date.getDay()];
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dayName}, ngày ${dd}/${mm}/${yyyy}`;
  };

  const formatTime = (date: Date | null) => {
    if (!date) return { hh: "00", mm: "00", ss: "00" };
    return {
      hh: String(date.getHours()).padStart(2, "0"),
      mm: String(date.getMinutes()).padStart(2, "0"),
      ss: String(date.getSeconds()).padStart(2, "0"),
    };
  };

  const isUuidString = (str?: string): boolean => {
    if (!str) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      str.trim(),
    );
  };

  const formatDisplayRoomName = (rawName?: string): string => {
    if (!rawName || isUuidString(rawName)) return "PHÒNG KHÁM";
    const upper = rawName.trim().toUpperCase();
    if (upper.startsWith("PHÒNG")) return upper;
    return `PHÒNG ${upper}`;
  };

  // Determine room name & department to display (prioritizing non-UUID names)
  const socketRoomName = socketData?.room_info?.room_name;
  const resolvedRoomName =
    !isUuidString(socketRoomName) && socketRoomName ?
      socketRoomName
    : roomDetails?.roomName || (!isUuidString(roomId) ? roomId : "PHÒNG KHÁM");

  const resolvedDeptName =
    socketData?.room_info?.specialty_name ||
    roomDetails?.department ||
    "KHOA KHÁM BỆNH";

  const activeData = socketData ?? {
    room_info: {
      room_name: resolvedRoomName,
      specialty_name: resolvedDeptName,
      // Never use logged-in auth user (e.g. admin email) as room doctor on TV
      doctor_name: "Đang cập nhật",
    },
    current_patient: null,
    upcoming_patients: [],
  };

  const room = {
    roomName: formatDisplayRoomName(resolvedRoomName),
    department: resolvedDeptName.toUpperCase(),
    doctorName: activeData.room_info?.doctor_name || "Đang cập nhật",
  };

  const currentPatient =
    activeData.current_patient ?
      {
        queueNumber: String(activeData.current_patient.queue_number),
        patientName: activeData.current_patient.patient_name,
        status: String(activeData.current_patient.status ?? "").toUpperCase(),
      }
    : null;

  const displayUpcoming = (activeData.upcoming_patients ?? [])
    .slice(0, UPCOMING_DISPLAY_LIMIT)
    .map((p, idx) => ({
      id: p.queue_id ? String(p.queue_id) : `socket-${idx}`,
      queueNumber: String(p.queue_number),
      patientName: p.patient_name,
      queueType: p.queue_type,
      position: idx + 1,
    }));

  /** CALLING = vừa gọi vào phòng; IN_PROGRESS = đang khám */
  const currentStatusLabel =
    !currentPatient ? "SẴN SÀNG ĐÓN BỆNH NHÂN"
    : currentPatient.status === "CALLING" ? "ĐANG GỌI BỆNH NHÂN"
    : "ĐANG KHÁM BỆNH";

  const clock = formatTime(currentTime);

  // Log only when queue payload / connection changes (not every clock tick)
  useEffect(() => {
    console.log(`${UI_LOG} render snapshot`, {
      isConnected,
      usingFallbackEmpty: !socketData,
      roomName: room.roomName,
      doctorName: room.doctorName,
      currentPatient:
        currentPatient ?
          {
            queueNumber: currentPatient.queueNumber,
            status: currentPatient.status,
          }
        : null,
      statusLabel: currentStatusLabel,
      upcoming: displayUpcoming.map((p) => ({
        position: p.position,
        queueNumber: p.queueNumber,
        patientName: p.patientName,
      })),
    });
    // intentionally exclude clock-driven state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, socketData]);

  return (
    /* h-screen + overflow-hidden = khóa chặt trong viewport, không scroll */
    <div
      className="relative h-screen w-screen flex flex-col font-sans select-none overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, #DFE1FF 0%, #DFE1FF 45%, #F0D2C1 100%)",
      }}
    >
      {/* ── Controls overlay (hidden by default, revealed on hover) ── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
        {/* Audio Unblock Prompt */}
        {isAudioBlocked ?
          <button
            onClick={enableAudio}
            className="flex items-center gap-2 text-xs font-extrabold px-3 py-1.5 rounded-full bg-amber-500 text-amber-950 shadow-md animate-bounce"
          >
            <Volume2 className="w-4 h-4" /> Bấm để bật chuông gọi số
          </button>
        : <div />}

        <div className="flex items-center gap-2">
          {/* Socket status indicator */}
          <div
            className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${isConnected ? "bg-emerald-100/90 text-emerald-800 border border-emerald-300" : "bg-red-100/90 text-red-700 border border-red-300"}`}
          >
            {isConnected ?
              <>
                <Wifi className="w-3 h-3" /> LIVE
              </>
            : <>
                <WifiOff className="w-3 h-3" />{" "}
                {socketError ? "Lỗi kết nối" : "Đang kết nối..."}
              </>
            }
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title="Âm thanh"
            className="p-2 rounded-xl bg-white/40 hover:bg-white/70 text-neutral-700 backdrop-blur-md transition shadow-sm"
          >
            {soundEnabled ?
              <Volume2 className="w-4 h-4 text-emerald-600" />
            : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>
          <button
            onClick={toggleFullscreen}
            title="Toàn màn hình"
            className="p-2 rounded-xl bg-white/40 hover:bg-white/70 text-neutral-700 backdrop-blur-md transition shadow-sm"
          >
            {isFullscreen ?
              <Minimize2 className="w-4 h-4" />
            : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── 1. HEADER BANNER ── */}
      <div className="shrink-0 bg-gradient-to-r from-[#6997E5] via-[#7AA6F0] to-[#6997E5] text-white px-6 sm:px-8 py-3 flex items-center justify-between shadow-md">
        {/* Bên trái: Tên phòng */}
        <div className="text-left flex-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight drop-shadow-sm leading-none uppercase">
            {room.roomName}
          </h1>
        </div>

        {/* Bên phải: BS: [Tên bác sĩ] */}
        <div className="text-right shrink-0 min-w-0 pl-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-wide text-white drop-shadow-sm truncate">
            BS: {room.doctorName.replace(/^(BS\.|BS:?\s*)/i, "").trim()}
          </h2>
        </div>
      </div>

      {/* ── 1.5 REBALANCE BANNER (Phase 4) ── */}
      <RebalanceBanner
        suggestions={rebalanceSuggestions}
        currentRoomId={roomId}
      />

      {/* Socket disconnected warning */}
      {!isConnected && (
        <div className="shrink-0 mx-auto my-1.5 flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-4 py-1.5 rounded-full shadow-sm">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          {socketError ?? "Đang kết nối lại máy chủ..."}
        </div>
      )}

      {/* ── 2. BODY: CURRENT (left ~60%) | UPCOMING (right ~40%) ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: current patient */}
        <div className="w-[60%] min-w-0 flex flex-col border-r border-black/10">
          <AnimatedQueueNumber
            queueNumber={currentPatient?.queueNumber ?? "---"}
            patientName={currentPatient?.patientName ?? "Chưa có bệnh nhân"}
            statusLabel={currentStatusLabel}
            status={currentPatient?.status ?? ""}
          />
        </div>

        {/* Right: upcoming queue (single column, max 7) */}
        <div className="w-[40%] min-w-0 flex flex-col bg-white/40 backdrop-blur-sm px-4 sm:px-6 py-3 overflow-hidden">
          <div className="shrink-0 mb-2 pb-2 border-b-2 border-black/20">
            <span className="text-sm sm:text-base md:text-lg font-black tracking-[0.2em] text-black uppercase">
              SẮP TỚI LƯỢT
            </span>
          </div>

          {displayUpcoming.length === 0 ?
            <div className="flex-1 flex items-center justify-center text-black/40 font-bold text-base sm:text-lg">
              Không có bệnh nhân đang chờ
            </div>
          : <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {displayUpcoming.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between py-1.5 sm:py-2 text-base sm:text-lg md:text-xl lg:text-2xl font-bold ${
                    idx < displayUpcoming.length - 1 ?
                      "border-b border-black/10"
                    : ""
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 truncate min-w-0">
                    <span className="text-[10px] sm:text-xs font-black bg-indigo-950 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0">
                      {p.position}
                    </span>
                    <span className="text-black font-black font-mono min-w-[3.5rem] sm:min-w-[4.5rem] shrink-0">
                      {p.queueNumber}
                    </span>
                    <span className="text-black/30 font-normal shrink-0">—</span>
                    <span className="text-black font-semibold truncate">
                      {p.patientName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {p.queueType === "APPOINTMENT" && (
                      <span className="text-[10px] sm:text-xs font-extrabold bg-blue-600 text-white px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> HẸN
                      </span>
                    )}
                    {p.queueType === "TRANSFER" && (
                      <span className="text-[10px] sm:text-xs font-extrabold bg-orange-600 text-white px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Shuffle className="w-3 h-3" /> CHUYỂN
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* ── 4. FOOTER ── */}
      <div className="shrink-0 bg-white/30 backdrop-blur-sm border-t border-black/10 px-8 md:px-12 py-2.5 flex items-center justify-between">
        <div className="text-base sm:text-lg font-medium text-black/70">
          {formatVietnameseDate(currentTime)}
        </div>

        {/* Socket live indicator in footer */}
        <div
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-colors ${isConnected ? "text-emerald-700 bg-emerald-100/60" : "text-amber-700 bg-amber-100/60"}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400 animate-bounce"}`}
          />
          {isConnected ? "LIVE" : "Đang kết nối lại..."}
        </div>

        {/* Digital Clock with Blinking Colon */}
        <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wider font-mono text-black">
          <span>{clock.hh}</span>
          <span className={blinkColon ? "opacity-100" : "opacity-20"}>:</span>
          <span>{clock.mm}</span>
          <span className={blinkColon ? "opacity-100" : "opacity-20"}>:</span>
          <span>{clock.ss}</span>
        </div>
      </div>
    </div>
  );
}
