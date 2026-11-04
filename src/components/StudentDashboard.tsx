"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Flame,
  Award,
  Clock,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  BookOpen,
  Zap,
  Info,
  Volume2,
  Type,
  AlertCircle,
} from "lucide-react";
import { StudentProfile, DILesson } from "@/lib/types";
import { DI_LESSONS } from "@/lib/lessons";
import { soundEffects } from "@/lib/sounds";

interface StudentDashboardProps {
  student: StudentProfile;
  onStartLesson: (lesson: DILesson) => void;
}

export function StudentDashboard({
  student,
  onStartLesson,
}: StudentDashboardProps) {
  // Current recommended lesson
  const currentLesson = DI_LESSONS.find((l) => l.id === student.currentLessonId) || DI_LESSONS[0];
  const [selectedFactInfo, setSelectedFactInfo] = useState<{ a: number; b: number; status: string } | null>(null);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<"normal" | "large">("normal");

  // Calculate overall facts mastered (out of 81)
  const masteredCount = Object.values(student.factMastery).filter(
    (f) => f.status === "mastered"
  ).length;
  const masteryPercent = Math.round((masteredCount / 81) * 100);

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  return (
    <div className={`w-full min-h-[calc(100vh-64px)] p-3 sm:p-6 md:p-8 flex flex-col gap-6 max-w-6xl mx-auto select-none ${fontSize === "large" ? "text-lg" : "text-base"}`}>
      {/* Toast Notification for Locked Lessons */}
      <AnimatePresence>
        {lockedNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-amber-950/95 border-2 border-amber-400 text-amber-200 text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-xl"
          >
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{lockedNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION: TODAY'S 5-MINUTE DIRECT INSTRUCTION LESSON */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-3xl bg-gradient-to-br from-[#121728] via-[#0b0e1a] to-[#141226] border-2 border-cyan-500/30 p-5 sm:p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
      >
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex-1 flex flex-col gap-3 relative z-10 w-full">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Today&apos;s 5-Minute Lesson</span>
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 fill-current" />
                <span>{student.streakDays || 0} Day Streak (Chicago Time)</span>
              </span>
            </div>

            {/* Accessibility: Read Aloud & Font Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => speakText(`${currentLesson.title}. ${currentLesson.ruleSummary}`)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Read lesson summary aloud"
              >
                <Volume2 className="w-4 h-4 text-cyan-400" />
              </button>
              <button
                onClick={() => setFontSize((prev) => (prev === "normal" ? "large" : "normal"))}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer font-bold text-xs"
                title="Toggle font size"
              >
                <Type className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl">{currentLesson.icon}</span>
            <div className="flex flex-col">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {currentLesson.title}
              </h1>
              <span className="text-xs sm:text-sm text-cyan-300 font-semibold">
                {currentLesson.subtitle}
              </span>
            </div>
          </div>

          {/* Rule Breakdown Card */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-1 text-xs">
            <span className="font-black text-amber-300 uppercase tracking-wider text-[10px]">
              Direct Instruction Rule: {currentLesson.ruleName}
            </span>
            <p className="text-white/80 font-medium leading-relaxed">
              {currentLesson.ruleSummary}
            </p>
          </div>
        </div>

        {/* Start CTA Button */}
        <div className="shrink-0 flex flex-col items-center gap-2 w-full md:w-auto relative z-10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              soundEffects.playKeyClick();
              onStartLesson(currentLesson);
            }}
            className="w-full md:w-64 h-16 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 text-black font-black text-base uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] transition-all cursor-pointer"
          >
            <Play className="w-6 h-6 fill-black" />
            <span>Start 5-Min Lesson</span>
          </motion.button>
          <span className="text-[11px] text-white/50 font-medium">
            Phases: Warmup → Model → Guided → Fluency → Gate
          </span>
        </div>
      </motion.div>

      {/* QUICK STATS BAR: TRUTHFUL, UNMERGED COUNTS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Stat 1: Mastered Facts */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-0.5">
          <span className="text-[10px] font-black uppercase text-white/50">Mastery Progress</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">{masteredCount}</span>
            <span className="text-xs text-white/40 font-bold">/ 81 Facts</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
            <div className="h-full bg-emerald-400" style={{ width: `${masteryPercent}%` }} />
          </div>
        </div>

        {/* Stat 2: Lessons Mastered vs Practiced (SEPARATED, NEVER MERGED!) */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-0.5">
          <span className="text-[10px] font-black uppercase text-white/50">Lessons Mastered</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-cyan-400">{student.totalLessonsMastered || 0}</span>
            <span className="text-xs text-white/40 font-bold">/ 11 Lessons</span>
          </div>
          <span className="text-[10px] text-white/50">
            {student.totalLessonsCompleted || 0} Sessions Practiced ({student.totalMinutesPracticed}m)
          </span>
        </div>

        {/* Stat 3: Calendar Day Streak */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-0.5">
          <span className="text-[10px] font-black uppercase text-white/50">Daily Habit Streak</span>
          <span className="text-2xl font-black text-amber-400">{student.streakDays || 0} Days</span>
          <span className="text-[10px] text-white/40">America/Chicago Calendar</span>
        </div>

        {/* Stat 4: Mastery XP */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-0.5">
          <span className="text-[10px] font-black uppercase text-white/50">Mastery XP</span>
          <span className="text-2xl font-black text-purple-400">{student.xp || 0} XP</span>
          <span className="text-[10px] text-white/40">Automaticity Points</span>
        </div>
      </div>

      {/* TWO COLUMN GRID: LESSON ROADMAP & 9x9 COLOR-BLIND SAFE HEATMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 11-LESSON DIRECT INSTRUCTION ROADMAP */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-black text-white">Direct Instruction Roadmap</h2>
            </div>
            <span className="text-xs text-cyan-300 font-bold">11 Sequential Lessons</span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {DI_LESSONS.map((lesson) => {
              const isCompleted = (student.totalLessonsMastered || 0) >= lesson.id || student.currentLessonId > lesson.id;
              const isCurrent = student.currentLessonId === lesson.id;
              const isLocked = student.currentLessonId < lesson.id;

              return (
                <div
                  key={lesson.id}
                  onClick={() => {
                    if (isLocked) {
                      soundEffects.playIncorrect();
                      setLockedNotice(`Complete Lesson ${lesson.id - 1} first to unlock this lesson.`);
                      setTimeout(() => setLockedNotice(null), 3000);
                    } else {
                      soundEffects.playKeyClick();
                      onStartLesson(lesson);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] cursor-pointer"
                      : isCompleted
                      ? "bg-white/[0.04] border-white/10 hover:border-emerald-500/40 cursor-pointer"
                      : "bg-white/[0.01] border-white/5 opacity-50 cursor-pointer hover:border-amber-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lesson.icon}</span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-xs sm:text-sm">
                          {lesson.title}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded-full bg-cyan-400 text-black text-[9px] font-black uppercase">
                            Current
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                            ✓ Mastered
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/50">{lesson.ruleName}</span>
                    </div>
                  </div>

                  {isLocked ? (
                    <div className="flex items-center gap-1 text-white/30 hover:text-amber-300 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-cyan-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 9x9 MULTIPLICATION MASTERY GRID (COLOUR-BLIND SAFE WITH VISIBLE STATUS ICONS) */}
        <div className="p-3.5 sm:p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl flex flex-col gap-3 sm:gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <h2 className="text-sm sm:text-base font-black text-white">9×9 Fact Mastery Grid</h2>
            </div>
            <span className="text-[11px] sm:text-xs text-emerald-400 font-bold">{masteredCount}/81 Mastered</span>
          </div>

          {/* Colour-blind safe Legend with explicit glyph symbols */}
          <div className="flex items-center gap-2.5 text-[9px] sm:text-[10px] font-bold flex-wrap">
            <span className="flex items-center gap-1 text-emerald-300">
              <span className="w-3 h-3 rounded bg-emerald-500 text-black font-black flex items-center justify-center text-[8px]">✓</span> Mastered
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <span className="w-3 h-3 rounded bg-amber-400 text-black font-black flex items-center justify-center text-[8px]">~</span> Progressing
            </span>
            <span className="flex items-center gap-1 text-rose-300">
              <span className="w-3 h-3 rounded bg-rose-500 text-white font-black flex items-center justify-center text-[8px]">!</span> Learning
            </span>
            <span className="flex items-center gap-1 text-white/50">
              <span className="w-3 h-3 rounded bg-white/10 text-white/40 font-black flex items-center justify-center text-[8px]">·</span> Unreached
            </span>
          </div>

          {/* 9x9 Interactive Grid with Visible Icons in every cell */}
          <div className="grid grid-cols-10 gap-0.5 sm:gap-1 p-1 sm:p-2 rounded-2xl bg-black/40 border border-white/10">
            {/* Corner */}
            <div className="flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white/30">
              ×
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => (
              <div
                key={col}
                className="flex items-center justify-center text-[9px] sm:text-[10px] font-black text-cyan-300"
              >
                {col}
              </div>
            ))}

            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((row) => (
              <div key={row} className="contents">
                <div className="flex items-center justify-center text-[9px] sm:text-[10px] font-black text-purple-300">
                  {row}
                </div>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => {
                  const key = `${row}x${col}`;
                  const fact = student.factMastery[key];
                  const status = fact?.status || "unreached";

                  let bg = "bg-white/5 text-white/30 border border-white/5";
                  let symbol = "·";
                  if (status === "mastered") {
                    bg = "bg-emerald-500 text-black font-black border border-emerald-400";
                    symbol = "✓";
                  } else if (status === "progressing") {
                    bg = "bg-amber-400 text-black font-black border border-amber-300";
                    symbol = "~";
                  } else if (status === "learning") {
                    bg = "bg-rose-500 text-white font-black border border-rose-400";
                    symbol = "!";
                  }

                  return (
                    <button
                      key={col}
                      onClick={() => setSelectedFactInfo({ a: row, b: col, status })}
                      className={`h-6 sm:h-7 rounded flex flex-col items-center justify-center text-[8px] sm:text-[9px] leading-none transition-transform active:scale-90 touch-manipulation cursor-pointer shadow-sm ${bg}`}
                      title={`${row} × ${col} = ${row * col} (${status})`}
                    >
                      <span className="font-bold">{row * col}</span>
                      <span className="text-[7px] opacity-80">{symbol}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Selected Fact Inspector Banner */}
          {selectedFactInfo ? (
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-white text-sm">
                  {selectedFactInfo.a} × {selectedFactInfo.b} = {selectedFactInfo.a * selectedFactInfo.b}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-bold capitalize">
                  {selectedFactInfo.status}
                </span>
              </div>
              <span className="text-cyan-300 font-semibold text-[11px]">
                {selectedFactInfo.a} groups of {selectedFactInfo.b}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Info className="w-3.5 h-3.5" />
              <span>Tap any cell to inspect its factors and status. Icons show status without color dependency.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
