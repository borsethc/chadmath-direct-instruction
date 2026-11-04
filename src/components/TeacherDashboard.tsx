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
  GraduationCap,
  Sparkles,
  Lock,
  ListRestart,
  HelpCircle,
  Play,
} from "lucide-react";
import { StudentProfile, TeacherAnalytics, FactMasteryRecord } from "@/lib/types";
import {
  computeTeacherAnalytics,
  exportClassDataCsv,
  resetStudent,
  createNewStudent,
  loadAllStudents,
  removeFromReDrillQueue,
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
  const [studentDetailTab, setStudentDetailTab] = useState<"heatmap" | "redrill" | "facts">("heatmap");
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Teacher Analytics
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                Private Portal
              </span>
            </div>
            <p className="text-xs sm:text-sm text-white/60">
              Single-user private dashboard monitoring direct instruction mastery, accuracy, and re-drill queue
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
            <span>Export CSV</span>
          </button>

          <button
            onClick={onBackToApp}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            Return to App
          </button>
        </div>
      </div>

      {/* Accuracy Formula Banner */}
      <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-bold">Accuracy Formula: </span>
          <span className="font-mono text-cyan-300">{analytics.accuracyFormula}</span>
        </div>
        <span className="text-[10px] text-cyan-400/80 italic">Verified against recorded attempts</span>
      </div>

      {/* Analytics KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white">{analytics.totalStudents}</span>
          <span className="text-[11px] text-white/40">Private Local Profile</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold">
            <span>Sessions Practiced</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400">
            {analytics.totalLessonsCompleted}
          </span>
          <span className="text-[11px] text-white/40">{analytics.totalMinutesLogged} Practice Minutes</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold">
            <span>Average Fact Mastery</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-amber-400">
            {analytics.classAverageMastery}%
          </span>
          <span className="text-[11px] text-white/40">Verified via Gate Pass</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold">
            <span>First-Try Accuracy</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-purple-400">
            {analytics.classAverageAccuracy}%
          </span>
          <span className="text-[11px] text-white/40">Guided & Fluency (No copies)</span>
        </div>
      </div>

      {/* Class Struggling Facts Alert Banner */}
      {analytics.strugglingFacts.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                Direct Instruction Re-Teaching Needed
              </span>
              <span className="text-xs text-rose-100">
                Facts with corrective feedback triggers:
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
                <th className="pb-3 px-2">Mastered Lessons</th>
                <th className="pb-3 px-2">Mastered Facts</th>
                <th className="pb-3 px-2">Re-Drill Queue</th>
                <th className="pb-3 px-2">Streak (Chicago)</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.map((student) => {
                const masteredCount = Object.values(student.factMastery).filter(
                  (f) => f.status === "mastered"
                ).length;
                const masteredPercent = Math.round((masteredCount / 81) * 100);
                const reDrillCount = student.reDrillQueue?.length || 0;

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

                    {/* Mastered Lessons */}
                    <td className="py-3 px-2 font-bold text-emerald-400">
                      {student.totalLessonsMastered || 0} / 11
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

                    {/* Re-Drill Queue Count */}
                    <td className="py-3 px-2">
                      {reDrillCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          {reDrillCount} queued
                        </span>
                      ) : (
                        <span className="text-white/30 italic">None</span>
                      )}
                    </td>

                    {/* Streak */}
                    <td className="py-3 px-2 font-bold text-amber-400">
                      {student.streakDays || 0} days
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setInspectingStudent(student);
                            setStudentDetailTab("heatmap");
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>

                        <button
                          onClick={() => onSelectStudentToPlay(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Launch
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

      {/* STUDENT DETAIL INSPECTOR MODAL */}
      {inspectingStudent && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl rounded-3xl bg-[#0f121d] border border-white/15 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 my-auto max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{inspectingStudent.avatar}</span>
                <div className="flex flex-col">
                  <h3 className="text-lg font-black text-white">{inspectingStudent.name}</h3>
                  <span className="text-xs text-white/50">
                    Lesson {inspectingStudent.currentLessonId} • {inspectingStudent.totalLessonsMastered || 0} Mastered • {inspectingStudent.totalMinutesPracticed} Mins Practiced
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

            {/* Sub-tabs: Heatmap | Re-Drill Queue | Per-Fact Table */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button
                onClick={() => setStudentDetailTab("heatmap")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  studentDetailTab === "heatmap"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-white/60 hover:text-white"
                }`}
              >
                9×9 Color-Blind Heatmap
              </button>
              <button
                onClick={() => setStudentDetailTab("redrill")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  studentDetailTab === "redrill"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <span>Re-Drill Queue</span>
                {inspectingStudent.reDrillQueue && inspectingStudent.reDrillQueue.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                    {inspectingStudent.reDrillQueue.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setStudentDetailTab("facts")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  studentDetailTab === "facts"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Per-Fact Accuracy History
              </button>
            </div>

            {/* TAB 1: 9x9 COLOR-BLIND SAFE HEATMAP */}
            {studentDetailTab === "heatmap" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-white/70">
                    9×9 Fact Grid with Explicit Glyphs
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-emerald-300">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 text-black flex items-center justify-center text-[7px] font-black">✓</span> Mastered
                    </span>
                    <span className="flex items-center gap-1 text-amber-300">
                      <span className="w-2.5 h-2.5 rounded bg-amber-400 text-black flex items-center justify-center text-[7px] font-black">~</span> Progressing
                    </span>
                    <span className="flex items-center gap-1 text-rose-300">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500 text-white flex items-center justify-center text-[7px] font-black">!</span> Learning
                    </span>
                    <span className="flex items-center gap-1 text-white/40">
                      <span className="w-2.5 h-2.5 rounded bg-white/10 text-white/40 flex items-center justify-center text-[7px]">·</span> Unreached
                    </span>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-10 gap-1 p-2 rounded-2xl bg-black/40 border border-white/10">
                  <div className="flex items-center justify-center text-[10px] font-black text-white/30">×</div>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => (
                    <div key={col} className="flex items-center justify-center text-[10px] font-black text-cyan-300">{col}</div>
                  ))}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((row) => (
                    <div key={row} className="contents">
                      <div className="flex items-center justify-center text-[10px] font-black text-purple-300">{row}</div>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => {
                        const key = `${row}x${col}`;
                        const fact = inspectingStudent.factMastery[key];
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
                          <div
                            key={col}
                            title={`${row} × ${col} = ${row * col} (${status}) - First-Try: ${fact?.firstTryCorrect || 0}`}
                            className={`h-7 rounded flex flex-col items-center justify-center text-[9px] leading-none shadow-sm ${bg}`}
                          >
                            <span className="font-bold">{row * col}</span>
                            <span className="text-[7px] opacity-80">{symbol}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: RE-DRILL QUEUE */}
            {studentDetailTab === "redrill" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
                      "Try Again Soon" Re-Drill Queue
                    </h4>
                    <p className="text-[11px] text-white/60">
                      Missed facts scheduled for re-presentation with full scaffold before new facts
                    </p>
                  </div>

                  {inspectingStudent.reDrillQueue && inspectingStudent.reDrillQueue.length > 0 && (
                    <button
                      onClick={() => {
                        onSelectStudentToPlay(inspectingStudent);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Re-drill Now</span>
                    </button>
                  )}
                </div>

                {(!inspectingStudent.reDrillQueue || inspectingStudent.reDrillQueue.length === 0) ? (
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-white/40">
                    Re-drill queue is clean! All attempted facts have been mastered or answered correctly on first try.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                    {inspectingStudent.reDrillQueue.map((item) => (
                      <div
                        key={item.factKey}
                        className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-white text-sm">
                            {item.a} × {item.b} = {item.a * item.b}
                          </span>
                          <span className="text-[10px] text-white/50">
                            Missed: {new Date(item.missedAt).toLocaleDateString()}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            removeFromReDrillQueue(inspectingStudent.id, item.a, item.b);
                            refreshData();
                          }}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-300 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PER-FACT ACCURACY HISTORY TABLE */}
            {studentDetailTab === "facts" && (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-white/70">
                  Per-Fact Detailed History (First-Try vs Corrected)
                </span>
                <div className="max-h-64 overflow-y-auto border border-white/10 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#0f121d] border-b border-white/10 text-white/40 uppercase font-black tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Fact</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">First-Try Correct</th>
                        <th className="py-2 px-3">Corrected Answers</th>
                        <th className="py-2 px-3">Total Attempts</th>
                        <th className="py-2 px-3">Missed Dates</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {Object.values(inspectingStudent.factMastery)
                        .filter((f) => f.attempts > 0 || f.status === "mastered")
                        .map((rec) => (
                          <tr key={rec.factKey} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-mono font-black text-white">
                              {rec.a} × {rec.b} = {rec.product}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                  rec.status === "mastered"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : rec.status === "progressing"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-rose-500/20 text-rose-300"
                                }`}
                              >
                                {rec.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-emerald-400 font-bold">
                              {rec.firstTryCorrect || 0}
                            </td>
                            <td className="py-2 px-3 font-mono text-amber-400 font-bold">
                              {rec.correctedCount || 0}
                            </td>
                            <td className="py-2 px-3 font-mono text-white/60">
                              {rec.attempts}
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px] text-white/40">
                              {rec.missedDates && rec.missedDates.length > 0
                                ? rec.missedDates.join(", ")
                                : "None"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
