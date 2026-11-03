"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Clock,
  Award,
  AlertTriangle,
  Download,
  RotateCcw,
  UserPlus,
  Eye,
  CheckCircle2,
  X,
  FileSpreadsheet,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { StudentProfile, TeacherAnalytics } from "@/lib/types";
import {
  computeTeacherAnalytics,
  exportClassDataCsv,
  resetStudent,
  createNewStudent,
  loadAllStudents,
} from "@/lib/storage";

interface TeacherDashboardProps {
  onBackToApp: () => void;
  onSelectStudentToPlay: (student: StudentProfile) => void;
}

export function TeacherDashboard({
  onBackToApp,
  onSelectStudentToPlay,
}: TeacherDashboardProps) {
  const [students, setStudents] = useState<StudentProfile[]>(loadAllStudents());
  const [analytics, setAnalytics] = useState<TeacherAnalytics>(computeTeacherAnalytics());
  const [inspectingStudent, setInspectingStudent] = useState<StudentProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAvatar, setNewStudentAvatar] = useState("🦁");

  const refreshData = () => {
    const updated = loadAllStudents();
    setStudents(updated);
    setAnalytics(computeTeacherAnalytics());
    if (inspectingStudent) {
      setInspectingStudent(updated.find((s) => s.id === inspectingStudent.id) || null);
    }
  };

  const handleExportCsv = () => {
    const csvContent = exportClassDataCsv();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ChadMath_DI_Class_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetStudent = (id: string, name: string) => {
    if (confirm(`Are you sure you want to reset all progress for ${name}?`)) {
      resetStudent(id);
      refreshData();
    }
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    createNewStudent(newStudentName.trim(), newStudentAvatar);
    setNewStudentName("");
    setShowAddModal(false);
    refreshData();
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] p-4 sm:p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto select-none">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Teacher Analytics & Progress Tracker
            </h1>
            <p className="text-xs sm:text-sm text-white/60">
              Monitoring Direct Instruction fidelity, automaticity, and 5-minute daily lesson mastery
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white">{analytics.totalStudents}</span>
          <span className="text-[11px] text-white/40">Active in Classroom</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold">
            <span>5-Min Lessons Completed</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400">
            {analytics.totalLessonsCompleted}
          </span>
          <span className="text-[11px] text-white/40">{analytics.totalMinutesLogged} Total Practice Mins</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold">
            <span>Class Average Mastery</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-amber-400">
            {analytics.classAverageMastery}%
          </span>
          <span className="text-[11px] text-white/40">Accurate & Automatic (&lt; 2.5s)</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold">
            <span>Overall Accuracy</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-purple-400">
            {analytics.classAverageAccuracy}%
          </span>
          <span className="text-[11px] text-white/40">Across all guided & fluency phases</span>
        </div>
      </div>

      {/* Class Struggling Facts Alert Banner */}
      {analytics.strugglingFacts.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                Class Direct Instruction Re-Teaching Needed
              </span>
              <span className="text-xs text-rose-100">
                These specific facts generated the highest corrective feedback attempts across students:
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {analytics.strugglingFacts.map((sf) => (
              <span
                key={sf.factKey}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 font-mono font-black text-xs"
              >
                {sf.factKey.replace("x", " × ")} ({sf.errorCount} misses)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Student Roster Table */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-5 sm:p-6 backdrop-blur-2xl shadow-xl flex flex-col gap-4 overflow-hidden">
        <h2 className="text-base font-black text-white">Student Progress Roster</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40 uppercase font-black tracking-wider text-[10px]">
                <th className="pb-3 px-2">Student</th>
                <th className="pb-3 px-2">Current DI Lesson</th>
                <th className="pb-3 px-2">Mastered Facts</th>
                <th className="pb-3 px-2">Time Logged</th>
                <th className="pb-3 px-2">Streak</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.map((student) => {
                const masteredCount = Object.values(student.factMastery).filter(
                  (f) => f.status === "mastered"
                ).length;
                const masteredPercent = Math.round((masteredCount / 81) * 100);

                return (
                  <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Student Info */}
                    <td className="py-3 px-2 flex items-center gap-2.5">
                      <span className="text-xl">{student.avatar}</span>
                      <span className="font-bold text-white text-sm">{student.name}</span>
                    </td>

                    {/* Lesson Level */}
                    <td className="py-3 px-2 font-bold text-cyan-300">
                      Lesson {student.currentLessonId}
                    </td>

                    {/* Mastered Facts Progress */}
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-emerald-400"
                            style={{ width: `${masteredPercent}%` }}
                          />
                        </div>
                        <span className="text-white/70 font-mono font-bold">
                          {masteredCount}/81
                        </span>
                      </div>
                    </td>

                    {/* Time Logged */}
                    <td className="py-3 px-2 font-mono text-white/60">
                      {student.totalMinutesPracticed} mins
                    </td>

                    {/* Streak */}
                    <td className="py-3 px-2 font-bold text-amber-400">
                      {student.streakDays} days
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingStudent(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Heatmap</span>
                        </button>

                        <button
                          onClick={() => onSelectStudentToPlay(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Launch Lesson
                        </button>

                        <button
                          onClick={() => handleResetStudent(student.id, student.name)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Reset student progress"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT DETAIL / 9x9 HEATMAP MODAL */}
      {inspectingStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl rounded-3xl bg-[#0f121d] border border-white/15 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 my-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{inspectingStudent.avatar}</span>
                <div className="flex flex-col">
                  <h3 className="text-lg font-black text-white">{inspectingStudent.name}</h3>
                  <span className="text-xs text-white/50">
                    Lesson {inspectingStudent.currentLessonId} • {inspectingStudent.totalMinutesPracticed} Mins Total
                  </span>
                </div>
              </div>

              <button
                onClick={() => setInspectingStudent(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 9x9 Multiplication Mastery Heatmap Grid */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white/70">
                  9×9 Multiplication Automaticity Heatmap
                </span>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Mastered
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-400" /> Progressing
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Learning
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-white/10" /> Unreached
                  </span>
                </div>
              </div>

              {/* Grid: 1..9 by 1..9 */}
              <div className="grid grid-cols-10 gap-1 p-2 rounded-2xl bg-black/40 border border-white/10">
                {/* Header corner */}
                <div className="flex items-center justify-center text-[10px] font-black text-white/30">
                  ×
                </div>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => (
                  <div
                    key={col}
                    className="flex items-center justify-center text-[10px] font-black text-cyan-300"
                  >
                    {col}
                  </div>
                ))}

                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((row) => (
                  <div key={row} className="contents">
                    <div className="flex items-center justify-center text-[10px] font-black text-purple-300">
                      {row}
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => {
                      const key = `${row}x${col}`;
                      const fact = inspectingStudent.factMastery[key];
                      const status = fact?.status || "unreached";

                      let bg = "bg-white/5 text-white/30";
                      if (status === "mastered") bg = "bg-emerald-500 text-black font-black";
                      else if (status === "progressing") bg = "bg-amber-400 text-black font-black";
                      else if (status === "learning") bg = "bg-rose-500 text-white font-black";

                      return (
                        <div
                          key={col}
                          title={`${row} × ${col} = ${row * col} (${status})`}
                          className={`h-7 rounded-md flex items-center justify-center text-[10px] transition-transform hover:scale-110 cursor-pointer shadow-sm ${bg}`}
                        >
                          {row * col}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Session History Log */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-white/70">
                Recent 5-Minute Lessons
              </span>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                {inspectingStudent.lessonHistory.length === 0 ? (
                  <span className="text-xs text-white/40 italic">No lessons recorded yet.</span>
                ) : (
                  inspectingStudent.lessonHistory.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold text-white">Lesson {h.lessonId}</span>
                        <span className="text-[10px] text-white/40">
                          {new Date(h.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {h.checkoutPassed !== undefined && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              h.checkoutPassed
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {h.checkoutPassed ? "✓ Verified" : "Needs Firming"}
                          </span>
                        )}
                        <span className="text-cyan-300 font-bold">{h.accuracyPercent}% Accuracy</span>
                        <span className="text-amber-400 font-bold">{"★".repeat(h.starsEarned)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateStudent}
            className="w-full max-w-sm rounded-3xl bg-[#0f121d] border border-white/15 p-6 shadow-2xl flex flex-col gap-4"
          >
            <h3 className="font-black text-white text-base">Add New Student</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-white/60">Student Name</label>
              <input
                type="text"
                required
                autoFocus
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="e.g. Taylor Smith"
                className="w-full h-11 rounded-xl bg-black/50 border border-white/15 px-3 text-white text-sm font-bold outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 h-10 rounded-xl bg-white/5 text-white/70 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-10 rounded-xl bg-cyan-500 text-black text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Save Student
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
