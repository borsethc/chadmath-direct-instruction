"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { StudentProfile } from "@/lib/types";
import { createNewStudent } from "@/lib/storage";
import { soundEffects } from "@/lib/sounds";

interface StudentLoginProps {
  onSelectStudent: (student: StudentProfile) => void;
}

const AVATAR_OPTIONS = ["🦁", "🐬", "🚀", "🦄", "⚡", "🦊", "🐯", "🐼", "🐲", "🌟"];

export function StudentLogin({ onSelectStudent }: StudentLoginProps) {
  const [newName, setNewName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    soundEffects.playCorrect();
    const created = createNewStudent(newName.trim(), selectedAvatar);
    onSelectStudent(created);
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center gap-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Direct Instruction 5-Minute Lessons</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Welcome to ChadMath!
          </h1>

          <p className="text-sm text-white/60 max-w-sm">
            Enter a username to begin your daily 5-minute multiplication mastery journey.
          </p>
        </div>

        {/* Clean Username Creation Form */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreateStudent}
          className="w-full rounded-3xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-2xl shadow-2xl flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-white/70 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full h-12 rounded-xl bg-black/60 border border-white/20 px-4 text-white font-bold text-lg outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all placeholder:text-white/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-white/70 uppercase tracking-wider">
              Choose Avatar
            </label>
            <div className="flex items-center gap-2 flex-wrap justify-between">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer border ${
                    selectedAvatar === av
                      ? "bg-cyan-500/20 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-105"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>Start Learning</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </motion.form>
      </div>
    </div>
  );
}
