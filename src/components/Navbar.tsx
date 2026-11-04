"use client";

import { useState } from "react";
import { Volume2, VolumeX, Flame } from "lucide-react";
import { StudentProfile } from "@/lib/types";
import { soundEffects } from "@/lib/sounds";

interface NavbarProps {
  currentStudent: StudentProfile | null;
  onGoHome: () => void;
}

export function Navbar({ currentStudent, onGoHome }: NavbarProps) {
  const [isMuted, setIsMuted] = useState(!soundEffects.enabled);

  const toggleSound = () => {
    soundEffects.enabled = !soundEffects.enabled;
    setIsMuted(!soundEffects.enabled);
  };

  return (
    <header className="w-full bg-[#08090f]/95 border-b border-white/10 backdrop-blur-xl px-3 sm:px-6 py-2.5 pt-safe flex items-center justify-between shrink-0 sticky top-0 z-40 select-none">
      {/* Brand Logo & Direct Instruction Tag */}
      <div
        onClick={onGoHome}
        className="flex items-center gap-2.5 cursor-pointer group select-none min-w-0"
      >
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
          <div className="w-full h-full bg-[#08090f] rounded-[10px] flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-tr from-cyan-300 to-emerald-300 text-base sm:text-xl">
            C
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-white text-base sm:text-lg tracking-tight">
              ChadMath
            </span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[8px] sm:text-[9px] font-black uppercase tracking-wider hidden xs:inline">
              DI
            </span>
          </div>
          <span className="text-[10px] text-white/50 font-medium -mt-0.5 hidden md:inline">
            5-Minute Direct Instruction Mastery
          </span>
        </div>
      </div>

      {/* Controls: Active User Badge & Sound Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Active User Badge (Informational) */}
        {currentStudent && (
          <div
            onClick={onGoHome}
            className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 select-none cursor-pointer hover:bg-white/[0.08] transition-all"
            title="Go to dashboard"
          >
            <span className="text-base sm:text-lg">{currentStudent.avatar}</span>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-white truncate max-w-[80px] sm:max-w-none">
                {currentStudent.name}
              </span>
              <span className="text-[9px] text-white/50 font-semibold hidden xs:block">
                Lvl {currentStudent.currentLessonId}
              </span>
            </div>

            {/* Streak Flame */}
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] sm:text-[10px] font-black ml-0.5">
              <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 fill-current" />
              <span>{currentStudent.streakDays || 0}d</span>
            </div>
          </div>
        )}

        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer touch-manipulation shrink-0"
          title={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          )}
        </button>
      </div>
    </header>
  );
}
