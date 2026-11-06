"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Play, UserPlus, User } from "lucide-react";
import { StudentProfile } from "@/lib/types";
import { createNewStudent, getOrCreateGuestProfile, loadAllStudents } from "@/lib/storage";
import { soundEffects } from "@/lib/sounds";

interface StudentLoginProps {
  students?: StudentProfile[];
  onSelectStudent: (student: StudentProfile) => void;
}

const AVATAR_OPTIONS = ["🦁", "🐬", "🚀", "🦄", "⚡", "🦊", "🐯", "🐼", "🐲", "🌟"];

export function StudentLogin({
  students = [],
  onSelectStudent,
}: StudentLoginProps) {
  const allStudents = students.length > 0 ? students : loadAllStudents();
  const [isAddingNew, setIsAddingNew] = useState(allStudents.length === 0);
  const [newName, setNewName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);

  const showCreateForm = allStudents.length === 0 || isAddingNew;

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    soundEffects.playCorrect();
    const created = createNewStudent(newName.trim(), selectedAvatar);
    setIsAddingNew(false);
    setNewName("");
    onSelectStudent(created);
  };

  const handleContinueAsGuest = () => {
    soundEffects.playKeyClick();
    const guest = getOrCreateGuestProfile();
    onSelectStudent(guest);
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl flex flex-col items-center gap-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Direct Instruction 5-Minute Lessons</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {!showCreateForm ? "Who is Learning Today?" : "Welcome to ChadMath!"}
          </h1>

          <p className="text-sm text-white/60 max-w-md">
            {!showCreateForm
              ? "Pick your profile to continue your daily 5-minute mastery lesson."
              : "Enter your name and pick an emoji to start your daily 5-minute multiplication mastery lesson."}
          </p>
        </div>

        {/* Student Profiles Roster (Emoji Profile Selection) */}
        {!showCreateForm ? (
          <div className="w-full rounded-3xl bg-white/[0.03] border border-white/10 p-5 sm:p-6 backdrop-blur-2xl shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-white/50">
                Classroom Roster ({allStudents.length})
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ New User</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {allStudents.map((student) => {
                const masteredCount = Object.values(student.factMastery).filter(
                  (f) => f.status === "mastered"
                ).length;
                return (
                  <motion.button
                    key={student.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      soundEffects.playKeyClick();
                      onSelectStudent(student);
                    }}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 transition-all flex items-center gap-3.5 text-left group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner">
                      {student.avatar}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-white group-hover:text-cyan-300 text-sm truncate">
                          {student.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                          Lvl {student.currentLessonId}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-white/50">
                        <span>{masteredCount}/81 Mastered</span>
                        <span>•</span>
                        <span>{student.totalMinutesPracticed}m</span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
                  </motion.button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => onSelectStudent(allStudents[0])}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Continue as {allStudents[0].name.split(" ")[0]}</span>
              </button>
              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Continue as Guest</span>
              </button>
            </div>
          </div>
        ) : (
          /* Create Student Profile Form (Shown automatically when history/storage is empty or when + New User is clicked on login) */
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreateStudent}
            className="w-full rounded-3xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-2xl shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black text-white">Create Student Profile</h2>
              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Continue as Guest</span>
              </button>
            </div>

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
                placeholder="e.g. Chad1"
                className="w-full h-12 rounded-xl bg-black/60 border border-white/20 px-4 text-white font-bold text-lg outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all placeholder:text-white/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-white/70 uppercase tracking-wider">
                Choose Emoji
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

            <div className="flex items-center gap-3 pt-2">
              {allStudents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Start Learning</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </div>
  );
}
