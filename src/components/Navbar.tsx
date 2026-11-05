"use client";

import { Flame, LogOut } from "lucide-react";
import { StudentProfile } from "@/lib/types";

interface NavbarProps {
  currentStudent: StudentProfile | null;
  onGoHome: () => void;
  onSwitchStudent?: () => void;
}

export function Navbar({
  currentStudent,
  onGoHome,
  onSwitchStudent,
}: NavbarProps) {
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

      {/* Controls: Active User Badge & Change User / Logout Button */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {currentStudent && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              onClick={onGoHome}
              className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 select-none cursor-pointer hover:bg-white/[0.08] transition-all"
              title="View your lessons and progress"
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

            {onSwitchStudent && (
              <button
                onClick={onSwitchStudent}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/25 text-rose-300 hover:text-white border border-rose-500/30 hover:border-rose-400/50 text-xs font-black transition-all cursor-pointer touch-manipulation shrink-0"
                title="Change user / Log out"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Change User</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
