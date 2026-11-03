"use client";

import { useState } from "react";
import { Volume2, VolumeX, ShieldCheck, Flame, UserCheck, Sparkles, GraduationCap } from "lucide-react";
import { StudentProfile } from "@/lib/types";
import { soundEffects } from "@/lib/sounds";
import { TEACHER_PIN } from "@/lib/storage";

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
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const toggleSound = () => {
    soundEffects.enabled = !soundEffects.enabled;
    setIsMuted(!soundEffects.enabled);
  };

  const handleTeacherClick = () => {
    if (isTeacherView) {
      onGoHome();
    } else {
      setShowPinModal(true);
      setEnteredPin("");
      setPinError(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === TEACHER_PIN) {
      setShowPinModal(false);
      onOpenTeacherDashboard();
    } else {
      setPinError(true);
      soundEffects.playIncorrect();
    }
  };

  return (
    <>
      <header className="w-full bg-[#08090f]/90 border-b border-white/10 backdrop-blur-xl px-3 sm:px-6 py-2.5 flex items-center justify-between shrink-0 sticky top-0 z-40">
        {/* Brand Logo & Direct Instruction Tag */}
        <div
          onClick={onGoHome}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
            <div className="w-full h-full bg-[#08090f] rounded-[10px] flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-tr from-cyan-300 to-emerald-300 text-lg sm:text-xl">
              C
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white text-base sm:text-lg tracking-tight">
                ChadMath
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-black uppercase tracking-wider">
                Direct Instruction
              </span>
            </div>
            <span className="text-[10px] text-white/50 font-medium -mt-0.5 hidden sm:inline">
              5-Minute Mastery Pedagogy (1×1 to 9×9)
            </span>
          </div>
        </div>

        {/* Controls: Student Info, Sound, Teacher Portal */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Student Pill */}
          {currentStudent && !isTeacherView && (
            <button
              onClick={onSwitchStudent}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer group"
              title="Click to switch student"
            >
              <span className="text-base sm:text-lg">{currentStudent.avatar}</span>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors">
                  {currentStudent.name}
                </span>
                <span className="text-[9px] text-white/50 font-semibold">
                  Lesson {currentStudent.currentLessonId}
                </span>
              </div>

              {/* Streak Flame */}
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black ml-1">
                <Flame className="w-3 h-3 text-amber-400 fill-current" />
                <span>{currentStudent.streakDays || 1}d</span>
              </div>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
              isTeacherView
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border-white/10 hover:border-cyan-500/40"
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">
              {isTeacherView ? "Exit Teacher View" : "Teacher Portal"}
            </span>
          </button>
        </div>
      </header>

      {/* Teacher PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm rounded-3xl bg-[#0f121d] border border-white/15 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-black text-white text-base">Teacher Portal Access</h3>
                <span className="text-xs text-white/50">Enter teacher PIN to track progress</span>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="flex flex-col gap-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={enteredPin}
                onChange={(e) => {
                  setPinError(false);
                  setEnteredPin(e.target.value.replace(/[^0-9]/g, ""));
                }}
                placeholder="Enter PIN (Default: 9999)"
                className="w-full h-12 rounded-2xl bg-black/50 border-2 border-white/15 text-center text-xl font-mono tracking-widest text-white focus:border-amber-400 outline-none"
              />

              {pinError && (
                <span className="text-xs text-rose-400 text-center font-bold">
                  Incorrect PIN! Use default PIN 9999.
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
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
