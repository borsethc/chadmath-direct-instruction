"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ShieldCheck,
  Sparkles,
  Layers,
  Info,
} from "lucide-react";
import {
  AnalyticsDateRange,
  AppAnalyticsReport,
  LearnerAnalyticsSummary,
  PortalAuthSession,
} from "@/lib/types";
import {
  fetchOwnerAppAnalytics,
  formatActiveDuration,
  STAGE_LABELS,
} from "@/lib/analytics";

interface AppAnalyticsPanelProps {
  portalSession: PortalAuthSession;
}

type SortField =
  | "learnerId"
  | "accountType"
  | "lastActiveAt"
  | "sessionCount"
  | "totalActiveSeconds"
  | "latestLevel"
  | "completedLessonsCount"
  | "firstAttemptAccuracy";

type SortDirection = "asc" | "desc";

export function AppAnalyticsPanel({ portalSession }: AppAnalyticsPanelProps) {
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>("all");
  const [report, setReport] = useState<AppAnalyticsReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("lastActiveAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [expandedLearnerId, setExpandedLearnerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAuthError(null);

    fetchOwnerAppAnalytics(portalSession, dateRange).then((res) => {
      if (cancelled) return;
      if (!res.ok || !res.report) {
        setAuthError(res.error || "Owner access required for App Analytics.");
        setReport(null);
      } else {
        setReport(res.report);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [portalSession, dateRange]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedLearners = useMemo(() => {
    if (!report) return [];
    const list = [...report.learners];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "learnerId":
          cmp = a.learnerId.localeCompare(b.learnerId);
          break;
        case "accountType":
          cmp = a.accountType.localeCompare(b.accountType);
          break;
        case "lastActiveAt":
          cmp = new Date(a.lastActiveAt).getTime() - new Date(b.lastActiveAt).getTime();
          break;
        case "sessionCount":
          cmp = a.sessionCount - b.sessionCount;
          break;
        case "totalActiveSeconds":
          cmp = (a.totalActiveSeconds ?? -1) - (b.totalActiveSeconds ?? -1);
          break;
        case "latestLevel":
          cmp =
            (a.latestLevelReached?.lessonId ?? 0) -
            (b.latestLevelReached?.lessonId ?? 0);
          break;
        case "completedLessonsCount":
          cmp = a.completedLessonsCount - b.completedLessonsCount;
          break;
        case "firstAttemptAccuracy": {
          const accA =
            a.firstAttemptTotal > 0 ? a.firstAttemptCorrect / a.firstAttemptTotal : -1;
          const accB =
            b.firstAttemptTotal > 0 ? b.firstAttemptCorrect / b.firstAttemptTotal : -1;
          cmp = accA - accB;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [report, sortField, sortDir]);

  if (authError) {
    return (
      <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-6 flex flex-col items-center text-center gap-2">
        <AlertTriangle className="w-8 h-8 text-rose-400" />
        <h3 className="text-lg font-black text-white">Owner Access Required</h3>
        <p className="text-xs text-rose-200/80 max-w-md">{authError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar: Owner Verification Badge, Guest Privacy Notice, & Date Filter */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Owner-Only App Analytics
            </span>
            <span className="text-xs text-white/50">
              All registered learners & anonymous guests
            </span>
          </div>
          <p className="text-xs text-white/60 flex items-center gap-1.5 mt-1">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              Guests use a random ID persisted in the same browser. A guest using a different browser or device appears as a separate learner. No guest names, emails, or device fingerprints are collected.
            </span>
          </p>
        </div>

        {/* Date Range Filters: Last 7 days, Last 30 days, All time */}
        <div
          className="inline-flex items-center rounded-xl bg-black/50 border border-white/10 p-1 self-start lg:self-auto shrink-0"
          role="group"
          aria-label="Date range filter"
        >
          {(
            [
              { id: "7d", label: "Last 7 days" },
              { id: "30d", label: "Last 30 days" },
              { id: "all", label: "All time" },
            ] as { id: AnalyticsDateRange; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setDateRange(opt.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                dateRange === opt.id
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !report ? (
        <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-12 text-center text-white/50 text-sm font-bold">
          Loading App Analytics...
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Unique Active Learners & Total Sessions */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-white/50 text-xs font-bold">
                <span>ACTIVE LEARNERS & SESSIONS</span>
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-black text-white">
                  {report.uniqueActiveLearners}
                </span>
                <span className="text-xs font-bold text-cyan-300">
                  learners · {report.totalSessions} sessions
                </span>
              </div>
              <span className="text-[11px] text-white/45">
                {report.registeredLearnersCount} registered · {report.guestLearnersCount} browser-scoped guest{report.guestLearnersCount === 1 ? "" : "s"}
              </span>
            </div>

            {/* 2. Median Active Time Per Session */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-white/50 text-xs font-bold">
                <span>MEDIAN ACTIVE TIME / SESSION</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400">
                {formatActiveDuration(report.medianActiveSecondsPerSession)}
              </div>
              <span className="text-[11px] text-white/45">
                Visible & active only (pauses when hidden or idle ≥60s)
              </span>
            </div>

            {/* 3. Lessons Started & Completed */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-white/50 text-xs font-bold">
                <span>LESSONS STARTED & COMPLETED</span>
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-300">
                  {report.lessonsCompleted}
                </span>
                <span className="text-sm font-bold text-white/60">
                  / {report.lessonsStarted} started
                </span>
              </div>
              <span className="text-[11px] text-white/45">
                {report.lessonsStarted > 0
                  ? `${Math.round((report.lessonsCompleted / report.lessonsStarted) * 100)}% session completion rate`
                  : "No lessons started in range"}
              </span>
            </div>

            {/* 4. Where Learners Most Often Stop */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-white/50 text-xs font-bold">
                <span>MOST COMMON STOP STAGE</span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-black text-purple-300 truncate">
                {report.mostCommonStopStage
                  ? report.mostCommonStopStage.stageLabel
                  : "No sessions yet"}
              </div>
              <span className="text-[11px] text-white/45">
                {report.mostCommonStopStage
                  ? `${report.mostCommonStopStage.count} session${report.mostCommonStopStage.count === 1 ? "" : "s"} ended at this stage`
                  : "Based on last recorded lesson stage"}
              </span>
            </div>
          </div>

          {/* Middle Breakdown Row: Completion Counts by Multiplication Level & Last Recorded Stage Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Completion Counts by Multiplication Level */}
            <div className="lg:col-span-7 rounded-3xl bg-white/[0.03] border border-white/10 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Completion Counts by Multiplication Level</span>
                  </h2>
                  <p className="text-xs text-white/50">
                    Lessons started vs. completed across all 11 multiplication levels
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {report.completionsByLevel.map((lvl) => {
                  const pct =
                    lvl.startedCount > 0
                      ? Math.min(100, Math.round((lvl.completedCount / lvl.startedCount) * 100))
                      : 0;
                  return (
                    <div
                      key={lvl.lessonId}
                      className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-black text-xs shrink-0">
                            L{lvl.lessonNumber} · {lvl.factorLabel}
                          </span>
                          <span className="text-xs font-bold text-white/80 truncate">
                            {lvl.title}
                          </span>
                        </div>
                        <span className="text-xs font-black text-emerald-400 shrink-0">
                          {lvl.completedCount} completed
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-white/45">
                        <span>{lvl.startedCount} started</span>
                        <span>{pct}% completed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Where Learners Most Often Stop (Last Recorded Lesson Stage) */}
            <div className="lg:col-span-5 rounded-3xl bg-white/[0.03] border border-white/10 p-5 flex flex-col gap-4">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Where Learners Most Often Stop</span>
                </h2>
                <p className="text-xs text-white/50">
                  Distribution of sessions by last recorded lesson stage
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {report.dropoffByStage.map((item) => {
                  const isCompleteStage = item.stage === "complete";
                  return (
                    <div
                      key={item.stage}
                      className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`font-bold ${
                            isCompleteStage ? "text-emerald-300" : "text-white/85"
                          }`}
                        >
                          {item.stageLabel}
                        </span>
                        <span className="font-mono font-bold text-white/70">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isCompleteStage ? "bg-emerald-400" : "bg-purple-400"
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sortable Learner Table */}
          <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-white">
                  All Learners ({sortedLearners.length})
                </h2>
                <p className="text-xs text-white/50">
                  Click any column header to sort. Click a learner row to inspect recent sessions and progress by level (opened vs. completed).
                </p>
              </div>
            </div>

            {sortedLearners.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm">
                No learner activity recorded in this date range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-white/50">
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort("learnerId")}
                          className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                        >
                          <span>Learner ID & Type</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort("lastActiveAt")}
                          className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                        >
                          <span>Last Active & Sessions</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort("totalActiveSeconds")}
                          className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                        >
                          <span>Active Learning Time</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort("latestLevel")}
                          className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                        >
                          <span>Latest Reached Level & Stage</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort("completedLessonsCount")}
                          className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                        >
                          <span>Lessons Completed</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort("firstAttemptAccuracy")}
                          className="inline-flex items-center gap-1 hover:text-white cursor-pointer"
                        >
                          <span>First-Attempt Accuracy</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-2 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs">
                    {sortedLearners.map((learner: LearnerAnalyticsSummary) => {
                      const isExpanded = expandedLearnerId === learner.learnerId;
                      const firstAttemptPct =
                        learner.firstAttemptTotal > 0
                          ? Math.round(
                              (learner.firstAttemptCorrect / learner.firstAttemptTotal) * 100
                            )
                          : null;

                      return (
                        <Fragment key={learner.learnerId}>
                          <tr
                            onClick={() =>
                              setExpandedLearnerId(isExpanded ? null : learner.learnerId)
                            }
                            className={`transition-colors cursor-pointer ${
                              isExpanded
                                ? "bg-cyan-500/10"
                                : "hover:bg-white/[0.04]"
                            }`}
                          >
                            {/* Learner ID & Account Type */}
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col gap-1">
                                <span className="font-mono font-bold text-white">
                                  {learner.learnerId}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                      learner.accountType === "guest"
                                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    }`}
                                  >
                                    {learner.accountType}
                                  </span>
                                  {learner.teacherId && (
                                    <span className="text-[10px] text-white/40">
                                      {learner.teacherId}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Last Active Date & Session Count */}
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-white/90">
                                  {new Date(learner.lastActiveAt).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                <span className="text-[11px] text-white/50">
                                  {learner.sessionCount} session{learner.sessionCount === 1 ? "" : "s"}
                                </span>
                              </div>
                            </td>

                            {/* Total Active Learning Time */}
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-emerald-300">
                                  {formatActiveDuration(learner.totalActiveSeconds)}
                                </span>
                                {learner.hasUntrackedTime && learner.totalActiveSeconds !== null && (
                                  <span className="text-[10px] text-white/40">
                                    + older untracked sessions
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Most Recently Reached Level & Stage */}
                            <td className="py-3.5 px-3">
                              {learner.latestLevelReached ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-black text-cyan-300">
                                    Level {learner.latestLevelReached.lessonNumber} (
                                    {learner.latestLevelReached.factorLabel}) —{" "}
                                    {learner.latestLevelReached.title}
                                  </span>
                                  <span className="text-[11px] text-white/60">
                                    Stage: {STAGE_LABELS[learner.latestLevelReached.stage]}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-white/40">None</span>
                              )}
                            </td>

                            {/* Lessons Completed */}
                            <td className="py-3.5 px-3">
                              <div className="flex flex-col gap-1">
                                <span className="font-black text-amber-300">
                                  {learner.completedLessonsCount} / 11 completed
                                </span>
                                {learner.completedLessonIds.length > 0 && (
                                  <span className="text-[10px] text-white/50">
                                    Levels:{" "}
                                    {learner.completedLessonIds.map((id) => `L${id}`).join(", ")}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* First-Attempt Accuracy (correct / attempted) */}
                            <td className="py-3.5 px-3">
                              {learner.hasTrackedAttempts && learner.firstAttemptTotal > 0 ? (
                                <div className="flex flex-col">
                                  <span className="font-black text-white">
                                    {learner.firstAttemptCorrect} / {learner.firstAttemptTotal}{" "}
                                    <span className="text-cyan-300">({firstAttemptPct}%)</span>
                                  </span>
                                  {learner.retryTotal > 0 && (
                                    <span className="text-[10px] text-white/45">
                                      Retries: {learner.retryCorrect}/{learner.retryTotal}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-white/45 italic">Not tracked</span>
                              )}
                            </td>

                            {/* Expand icon */}
                            <td className="py-3.5 px-2 text-right">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-white/60">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-cyan-300" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Learner Row Detail View */}
                          {isExpanded && (
                            <tr className="bg-black/60">
                              <td colSpan={7} className="p-4 sm:p-5">
                                <div className="flex flex-col gap-5">
                                  {/* Explicit Side-by-Side Comparison: Latest Level Opened/Reached vs. Completed Lessons */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col gap-1">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                                        Most Recently Reached / Opened Level
                                      </span>
                                      <span className="text-sm font-black text-white">
                                        {learner.latestLevelReached
                                          ? `Level ${learner.latestLevelReached.lessonNumber} (${learner.latestLevelReached.factorLabel}): ${learner.latestLevelReached.title}`
                                          : "No level opened yet"}
                                      </span>
                                      {learner.latestLevelReached && (
                                        <span className="text-xs text-cyan-200/80">
                                          Last recorded stage:{" "}
                                          <strong>
                                            {STAGE_LABELS[learner.latestLevelReached.stage]}
                                          </strong>{" "}
                                          ·{" "}
                                          {learner.completedLessonIds.includes(
                                            learner.latestLevelReached.lessonId
                                          )
                                            ? "Completed this level"
                                            : "Opened (not yet completed)"}
                                        </span>
                                      )}
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-1">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                                        Completed Multiplication Levels ({learner.completedLessonsCount} / 11)
                                      </span>
                                      <span className="text-sm font-black text-white">
                                        {learner.completedLessonIds.length > 0
                                          ? learner.completedLessonIds
                                              .map((id) => {
                                                const lp = learner.levelProgress.find(
                                                  (l) => l.lessonId === id
                                                );
                                                return lp
                                                  ? `L${lp.lessonNumber} (${lp.factorLabel})`
                                                  : `L${id}`;
                                              })
                                              .join(", ")
                                          : "No levels completed yet"}
                                      </span>
                                      <span className="text-xs text-emerald-200/80">
                                        Distinguishes levels opened in practice from levels fully completed
                                      </span>
                                    </div>
                                  </div>

                                  {/* Progress by Multiplication Level (1–11) */}
                                  <div className="flex flex-col gap-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-white/70">
                                      Progress by Level (Lessons 1–11)
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                      {learner.levelProgress.map((lp) => {
                                        const statusBadge = lp.completed
                                          ? "Completed"
                                          : lp.opened
                                          ? `Opened · ${
                                              lp.highestStageReached
                                                ? STAGE_LABELS[lp.highestStageReached]
                                                : "In Progress"
                                            }`
                                          : "Not opened";

                                        return (
                                          <div
                                            key={lp.lessonId}
                                            className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                                              lp.completed
                                                ? "bg-emerald-500/10 border-emerald-500/30"
                                                : lp.opened
                                                ? "bg-cyan-500/10 border-cyan-500/30"
                                                : "bg-white/[0.02] border-white/10 opacity-60"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between gap-1">
                                              <span className="font-black text-white text-xs">
                                                L{lp.lessonNumber} · {lp.factorLabel}
                                              </span>
                                              <span
                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                  lp.completed
                                                    ? "bg-emerald-500/20 text-emerald-300"
                                                    : lp.opened
                                                    ? "bg-cyan-500/20 text-cyan-300"
                                                    : "bg-white/5 text-white/40"
                                                }`}
                                              >
                                                {statusBadge}
                                              </span>
                                            </div>
                                            <span className="text-[11px] text-white/60 truncate">
                                              {lp.title}
                                            </span>
                                            <div className="flex items-center justify-between text-[10px] text-white/50 pt-1 border-t border-white/5">
                                              <span>
                                                Time: {formatActiveDuration(lp.activeSeconds)}
                                              </span>
                                              <span>
                                                1st Try:{" "}
                                                {lp.firstAttemptTotal !== null &&
                                                lp.firstAttemptTotal > 0
                                                  ? `${lp.firstAttemptCorrect}/${lp.firstAttemptTotal}`
                                                  : "Not tracked"}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Recent Sessions Table */}
                                  <div className="flex flex-col gap-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-white/70">
                                      Recent Sessions ({learner.recentSessions.length})
                                    </h4>
                                    {learner.recentSessions.length === 0 ? (
                                      <div className="text-xs text-white/40">
                                        No individual session logs recorded.
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto rounded-xl border border-white/10">
                                        <table className="w-full text-left border-collapse text-xs">
                                          <thead>
                                            <tr className="bg-white/5 text-[10px] font-black uppercase tracking-wider text-white/50">
                                              <th className="py-2 px-3">Date</th>
                                              <th className="py-2 px-3">Level</th>
                                              <th className="py-2 px-3">Last Stage</th>
                                              <th className="py-2 px-3">Status</th>
                                              <th className="py-2 px-3">Active Time</th>
                                              <th className="py-2 px-3">
                                                First-Attempt Accuracy
                                              </th>
                                              <th className="py-2 px-3">Retries</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-white/5">
                                            {learner.recentSessions.map((sess) => {
                                              const firstAtts = sess.attempts.filter(
                                                (a) => a.attemptNumber === 1
                                              );
                                              const firstCorr = firstAtts.filter(
                                                (a) => a.isCorrect
                                              ).length;
                                              const retries = sess.attempts.filter(
                                                (a) => a.attemptNumber > 1
                                              );
                                              const retryCorr = retries.filter(
                                                (a) => a.isCorrect
                                              ).length;

                                              return (
                                                <tr key={sess.sessionId}>
                                                  <td className="py-2 px-3 text-white/80">
                                                    {new Date(
                                                      sess.lastUpdatedAt
                                                    ).toLocaleString(undefined, {
                                                      month: "short",
                                                      day: "numeric",
                                                      hour: "numeric",
                                                      minute: "2-digit",
                                                    })}
                                                  </td>
                                                  <td className="py-2 px-3 font-bold text-cyan-300">
                                                    L{sess.lessonId} ({sess.factorLabel})
                                                  </td>
                                                  <td className="py-2 px-3 text-white/80">
                                                    {STAGE_LABELS[sess.lastStage]}
                                                  </td>
                                                  <td className="py-2 px-3">
                                                    {sess.completed ? (
                                                      <span className="text-emerald-400 font-bold">
                                                        Completed
                                                      </span>
                                                    ) : (
                                                      <span className="text-amber-300 font-bold">
                                                        Stopped at {STAGE_LABELS[sess.lastStage]}
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-3 font-mono text-white/80">
                                                    {formatActiveDuration(
                                                      sess.activeDurationSeconds
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-3 font-mono text-white/80">
                                                    {sess.attemptsTracked &&
                                                    firstAtts.length > 0 ? (
                                                      `${firstCorr} / ${firstAtts.length}`
                                                    ) : (
                                                      <span className="italic text-white/40">
                                                        Not tracked
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-3 font-mono text-white/60">
                                                    {sess.attemptsTracked ? (
                                                      retries.length > 0 ? (
                                                        `${retryCorr} / ${retries.length}`
                                                      ) : (
                                                        "0"
                                                      )
                                                    ) : (
                                                      <span className="italic text-white/40">
                                                        Not tracked
                                                      </span>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

