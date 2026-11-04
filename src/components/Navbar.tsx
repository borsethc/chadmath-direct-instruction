"use client";

import { useState } from "react";
import { Volume2, VolumeX, Flame, GraduationCap, Lock, KeyRound } from "lucide-react";
import { StudentProfile } from "@/lib/types";
import { soundEffects } from "@/lib/sounds";
import { hasTeacherPinSet, setTeacherPin, verifyTeacherPin } from "@/lib/storage";

interface NavbarProps {
  currentStudent: StudentProfile | null;
  onOpenTeacherDashboard: () => void;
  onSwitchStudent: () => void;
  onGoHome: () => void;
  isTeacherView?: boolean;
}

export function Navbar({
  currentStudent,
  onOpenTeacherDashboard,
  onSwitchStudent,
  onGoHome,
  isTeacherView = false,
}: NavbarProps) {
  const [isMuted, setIsMuted] = useState(!soundEffects.enabled);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isOwnerSetup, setIsOwnerSetup] = useState(false);
  
  // Unlock state
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");

  // Setup state
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const toggleSound = () => {
    soundEffects.enabled = !soundEffects.enabled;
    setIsMuted(!soundEffects.enabled);
  };

  const handleTeacherClick = () => {
    if (isTeacherView) {
      onGoHome();
    } else {
      const pinConfigured = hasTeacherPinSet();
      setIsOwnerSetup(!pinConfigured);
      setEnteredPin("");
      setNewPin("");
      setConfirmPin("");
      setPinError("");
      setShowPinModal(true);
    }
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyTeacherPin(enteredPin)) {
      setShowPinModal(false);
      onOpenTeacherDashboard();
    } else {
      setPinError("Incorrect PIN. Please try again.");
      soundEffects.playIncorrect();
    }
  };

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) {
      setPinError("PIN must be at least 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("PINs do not match. Please re-enter.");
      return;
    }
    setTeacherPin(newPin);
    setShowPinModal(false);
    onOpenTeacherDashboard();
  };

  return (
    <>
      <header className="w-full bg-[#08090f]/95 border-b border-white/10 backdrop-blur-xl px-2.5 sm:px-6 py-2 pt-safe flex items-center justify-between shrink-0 sticky top-0 z-40 select-none">
        {/* Brand Logo & Direct Instruction Tag */}
        <div
          onClick={onGoHome}
          className="flex items-center gap-2 cursor-pointer group select-none min-w-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#08090f] rounded-[10px] flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-tr from-cyan-300 to-emerald-300 text-base sm:text-xl">
              C
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white text-sm sm:text-lg tracking-tight">
                ChadMath
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[8px] sm:text-[9px] font-black uppercase tracking-wider hidden xs:inline">
                DI
              </span>
            </div>
            <span className="text-[9px] text-white/50 font-medium -mt-0.5 hidden md:inline">
              5-Minute Mastery (1×1 to 9×9)
            </span>
          </div>
        </div>

        {/* Controls: Student Info, Sound, Teacher Portal */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Active Student Pill */}
          {currentStudent && !isTeacherView && (
            <button
              onClick={onSwitchStudent}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 transition-all cursor-pointer group touch-manipulation"
              title="Click to switch student"
            >
              <span className="text-base sm:text-lg">{currentStudent.avatar}</span>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors truncate max-w-[70px] sm:max-w-none">
                  {currentStudent.name.split(" ")[0]}
                </span>
                <span className="text-[8px] sm:text-[9px] text-white/50 font-semibold hidden xs:block">
                  Lvl {currentStudent.currentLessonId}
                </span>
              </div>

              {/* Streak Flame */}
              <div className="flex items-center gap-0.5 px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] sm:text-[10px] font-black ml-0.5">
                <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 fill-current" />
                <span>{currentStudent.streakDays || 0}d</span>
              </div>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer touch-manipulation shrink-0"
            title={isMuted ? "Unmute sounds" : "Mute sounds"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Teacher Portal Button */}
          <button
            onClick={handleTeacherClick}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border touch-manipulation shrink-0 ${
              isTeacherView
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border-white/10 hover:border-cyan-500/40"
            }`}
            title="Teacher Portal"
          >
            <GraduationCap className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">
              {isTeacherView ? "Exit" : "Teacher"}
            </span>
          </button>
        </div>
      </header>

      {/* Teacher PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm rounded-3xl bg-[#0f121d] border border-white/15 p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            {isOwnerSetup ? (
              // One-time Owner Setup Mode
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-black text-white text-base">Set Owner Teacher PIN</h3>
                    <span className="text-xs text-white/50">One-time private setup</span>
                  </div>
                </div>

                <p className="text-xs text-white/70 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
                  Set a 4 to 8 digit PIN for your private teacher dashboard. This PIN will be stored securely on this device and will never be displayed again.
                </p>

                <form onSubmit={handleSetupSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                      Create New PIN
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      autoFocus
                      value={newPin}
                      onChange={(e) => {
                        setPinError("");
                        setNewPin(e.target.value.replace(/[^0-9]/g, ""));
                      }}
                      placeholder="••••"
                      className="w-full h-11 rounded-xl bg-black/60 border border-white/20 text-center text-xl font-mono tracking-widest text-white focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                      Confirm PIN
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      value={confirmPin}
                      onChange={(e) => {
                        setPinError("");
                        setConfirmPin(e.target.value.replace(/[^0-9]/g, ""));
                      }}
                      placeholder="••••"
                      className="w-full h-11 rounded-xl bg-black/60 border border-white/20 text-center text-xl font-mono tracking-widest text-white focus:border-amber-400 outline-none"
                    />
                  </div>

                  {pinError && (
                    <span className="text-xs text-rose-400 text-center font-bold">
                      {pinError}
                    </span>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPinModal(false)}
                      className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={newPin.length < 4 || newPin !== confirmPin}
                      className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-50 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      Save & Unlock
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Standard Unlock Mode
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-black text-white text-base">Teacher Portal Access</h3>
                    <span className="text-xs text-white/50">Private teacher dashboard</span>
                  </div>
                </div>

                <form onSubmit={handleUnlockSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                      Enter PIN
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      autoFocus
                      value={enteredPin}
                      onChange={(e) => {
                        setPinError("");
                        setEnteredPin(e.target.value.replace(/[^0-9]/g, ""));
                      }}
                      placeholder="••••"
                      className="w-full h-12 rounded-2xl bg-black/60 border-2 border-white/15 text-center text-xl font-mono tracking-widest text-white focus:border-amber-400 outline-none"
                    />
                  </div>

                  {pinError && (
                    <span className="text-xs text-rose-400 text-center font-bold">
                      {pinError}
                    </span>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPinModal(false)}
                      className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={enteredPin.length < 4}
                      className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-50 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      Unlock
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

