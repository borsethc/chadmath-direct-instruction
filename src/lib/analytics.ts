import type {
  AnalyticsDateRange,
  AnalyticsQuestionAttempt,
  AnalyticsSessionRecord,
  AnalyticsStage,
  AppAnalyticsReport,
  LearnerAnalyticsSummary,
  LearnerLevelProgress,
  PortalAuthSession,
  StudentProfile,
} from "./types.ts";
import {
  getOrCreateGuestLearnerId,
  isGuestId,
  loadAllStudents,
  loadGuestProfile,
  verifyOwnerPin,
} from "./storage.ts";

export const ANALYTICS_STORAGE_KEY = "chadmath_di_analytics_store_v1";
export const IDLE_TIMEOUT_MS = 60_000; // 60 seconds idle cutoff
export const PERIODIC_SAVE_INTERVAL_MS = 5_000; // Save active time every 5 seconds

export interface LessonLevelMeta {
  lessonId: number;
  lessonNumber: number;
  factorLabel: string;
  shortTitle: string;
  fullTitle: string;
}

export const LESSON_LEVEL_METADATA: LessonLevelMeta[] = [
  { lessonId: 1, lessonNumber: 1, factorLabel: "×1", shortTitle: "1s (Identity)", fullTitle: "Lesson 1: The Identity Rule (×1)" },
  { lessonId: 2, lessonNumber: 2, factorLabel: "×2", shortTitle: "2s (Doubles)", fullTitle: "Lesson 2: Multiply by 2 (×2)" },
  { lessonId: 3, lessonNumber: 3, factorLabel: "×5", shortTitle: "5s (Count by 5s)", fullTitle: "Lesson 3: Multiply by 5 (×5)" },
  { lessonId: 4, lessonNumber: 4, factorLabel: "×3", shortTitle: "3s (Double + 1 Group)", fullTitle: "Lesson 4: Multiply by 3 (×3)" },
  { lessonId: 5, lessonNumber: 5, factorLabel: "×4", shortTitle: "4s (Double-Double)", fullTitle: "Lesson 5: Double-Double (×4)" },
  { lessonId: 6, lessonNumber: 6, factorLabel: "×9", shortTitle: "9s (10× Minus 1 Group)", fullTitle: "Lesson 6: Ten Times Minus One Group (×9)" },
  { lessonId: 7, lessonNumber: 7, factorLabel: "Squares", shortTitle: "Squares (6×6, 7×7, 8×8)", fullTitle: "Lesson 7: Perfect Squares" },
  { lessonId: 8, lessonNumber: 8, factorLabel: "×6", shortTitle: "6s (Landmark 5s + 1 Group)", fullTitle: "Lesson 8: Landmark Sixes (×6)" },
  { lessonId: 9, lessonNumber: 9, factorLabel: "×8", shortTitle: "8s (Triple-Double)", fullTitle: "Lesson 9: Tricky Eights (×8)" },
  { lessonId: 10, lessonNumber: 10, factorLabel: "×7", shortTitle: "7s (7×8 & 7s Mastery)", fullTitle: "Lesson 10: The 7s & Final Fact (7×8)" },
  { lessonId: 11, lessonNumber: 11, factorLabel: "Mixed", shortTitle: "Mixed Sprint (All Facts)", fullTitle: "Lesson 11: Mixed Fact Retrieval" },
];

export function getLessonMeta(lessonId: number): LessonLevelMeta {
  return (
    LESSON_LEVEL_METADATA.find((m) => m.lessonId === lessonId) || {
      lessonId,
      lessonNumber: lessonId,
      factorLabel: `L${lessonId}`,
      shortTitle: `Lesson ${lessonId}`,
      fullTitle: `Lesson ${lessonId}`,
    }
  );
}

export const STAGE_LABELS: Record<AnalyticsStage, string> = {
  strategy_intro: "Strategy Overview",
  model: "Model: I Do",
  review: "Warm-Up Review",
  guided: "Practice: We Do",
  fluency: "Practice: You Do",
  transition_gate: "Pre-Check Gate",
  checkout: "Checkout Gate",
  complete: "Completed",
};

export const STAGE_ORDER: Record<AnalyticsStage, number> = {
  strategy_intro: 1,
  model: 2,
  review: 3,
  guided: 4,
  fluency: 5,
  transition_gate: 6,
  checkout: 7,
  complete: 8,
};

export type AnalyticsEventPayload =
  | {
      type: "lesson_start";
      eventId: string;
      sessionId: string;
      learnerId: string;
      accountType: "registered" | "guest";
      teacherId?: string;
      lessonId: number;
      stage?: AnalyticsStage;
      timestamp: string;
    }
  | {
      type: "stage_change";
      eventId: string;
      sessionId: string;
      learnerId: string;
      accountType?: "registered" | "guest";
      teacherId?: string;
      lessonId: number;
      stage: AnalyticsStage;
      activeDurationSeconds?: number;
      timestamp: string;
    }
  | {
      type: "answer_submitted";
      eventId: string;
      sessionId: string;
      learnerId: string;
      accountType?: "registered" | "guest";
      teacherId?: string;
      lessonId: number;
      stage: AnalyticsStage;
      questionId: string;
      attemptNumber: number;
      isCorrect: boolean;
      activeDurationSeconds?: number;
      timestamp: string;
    }
  | {
      type: "active_time_sync";
      eventId: string;
      sessionId: string;
      learnerId: string;
      accountType?: "registered" | "guest";
      teacherId?: string;
      lessonId: number;
      stage?: AnalyticsStage;
      activeDurationSeconds: number;
      timestamp: string;
    }
  | {
      type: "lesson_complete";
      eventId: string;
      sessionId: string;
      learnerId: string;
      accountType?: "registered" | "guest";
      teacherId?: string;
      lessonId: number;
      checkoutPassed: boolean;
      activeDurationSeconds: number;
      timestamp: string;
    };

export interface AnalyticsStoreData {
  sessions: Record<string, AnalyticsSessionRecord>;
  processedEventIds: string[];
  updatedAt: string;
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return null;
}

export function createEmptyAnalyticsStore(): AnalyticsStoreData {
  return {
    sessions: {},
    processedEventIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadClientAnalyticsStore(): AnalyticsStoreData {
  const storage = getStorage();
  if (!storage) return createEmptyAnalyticsStore();
  try {
    const raw = storage.getItem(ANALYTICS_STORAGE_KEY);
    if (!raw) return createEmptyAnalyticsStore();
    const parsed = JSON.parse(raw) as AnalyticsStoreData;
    if (!parsed || typeof parsed.sessions !== "object") {
      return createEmptyAnalyticsStore();
    }
    return {
      sessions: parsed.sessions || {},
      processedEventIds: Array.isArray(parsed.processedEventIds) ? parsed.processedEventIds : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return createEmptyAnalyticsStore();
  }
}

export function saveClientAnalyticsStore(store: AnalyticsStoreData): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    // Keep last 5000 event IDs to bound storage size while preventing duplicates
    if (store.processedEventIds.length > 5000) {
      store.processedEventIds = store.processedEventIds.slice(-5000);
    }
    store.updatedAt = new Date().toISOString();
    storage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error("Failed to save analytics store:", err);
  }
}

/**
 * Deterministic Active Learning Time Tracker
 * Counts time ONLY while:
 * 1. Page is visible (isPageVisible === true)
 * 2. Lesson is not paused (isPaused === false) and not completed (isCompleted === false)
 * 3. Learner is actively interacting (time since last interaction < 60,000ms) OR watching an active lesson animation (isWatchingAnimation === true)
 */
export class ActiveLearningTimer {
  private lastTickMs: number;
  private lastInteractionMs: number;
  private accumulatedActiveMs: number = 0;
  private isPageVisible: boolean = true;
  private isPaused: boolean = false;
  private isWatchingAnimation: boolean = false;
  private isCompleted: boolean = false;
  private idleTimeoutMs: number;

  constructor(nowMs: number = Date.now(), idleTimeoutMs: number = IDLE_TIMEOUT_MS) {
    this.lastTickMs = nowMs;
    this.lastInteractionMs = nowMs;
    this.idleTimeoutMs = idleTimeoutMs;
  }

  public advanceTo(nowMs: number): number {
    if (nowMs <= this.lastTickMs) {
      return this.getActiveSeconds();
    }

    if (this.isPageVisible && !this.isPaused && !this.isCompleted) {
      if (this.isWatchingAnimation) {
        this.accumulatedActiveMs += nowMs - this.lastTickMs;
        // Keep interaction fresh while animation is playing
        this.lastInteractionMs = nowMs;
      } else {
        const activeDeadlineMs = this.lastInteractionMs + this.idleTimeoutMs;
        const effectiveEndMs = Math.min(nowMs, activeDeadlineMs);
        if (effectiveEndMs > this.lastTickMs) {
          this.accumulatedActiveMs += effectiveEndMs - this.lastTickMs;
        }
      }
    }

    this.lastTickMs = nowMs;
    return this.getActiveSeconds();
  }

  public recordInteraction(nowMs: number = Date.now()): number {
    this.advanceTo(nowMs);
    this.lastInteractionMs = nowMs;
    return this.getActiveSeconds();
  }

  public setPageVisible(visible: boolean, nowMs: number = Date.now()): number {
    this.advanceTo(nowMs);
    this.isPageVisible = visible;
    if (visible) {
      this.lastInteractionMs = nowMs;
    }
    return this.getActiveSeconds();
  }

  public setPaused(paused: boolean, nowMs: number = Date.now()): number {
    this.advanceTo(nowMs);
    this.isPaused = paused;
    if (!paused) {
      this.lastInteractionMs = nowMs;
    }
    return this.getActiveSeconds();
  }

  public setWatchingAnimation(watching: boolean, nowMs: number = Date.now()): number {
    this.advanceTo(nowMs);
    this.isWatchingAnimation = watching;
    this.lastInteractionMs = nowMs;
    return this.getActiveSeconds();
  }

  public markCompleted(nowMs: number = Date.now()): number {
    this.advanceTo(nowMs);
    this.isCompleted = true;
    return this.getActiveSeconds();
  }

  public isCurrentlyIdle(nowMs: number = Date.now()): boolean {
    if (this.isWatchingAnimation) return false;
    return nowMs - this.lastInteractionMs >= this.idleTimeoutMs;
  }

  public getActiveSeconds(nowMs?: number): number {
    if (typeof nowMs === "number") {
      this.advanceTo(nowMs);
    }
    return Math.round(this.accumulatedActiveMs / 1000);
  }
}

/**
 * Applies a single telemetry event idempotently to an AnalyticsStoreData object.
 * Duplicate eventIds are ignored; active time and completion updates are idempotent per sessionId.
 */
export function applyAnalyticsEvent(
  store: AnalyticsStoreData,
  event: AnalyticsEventPayload
): AnalyticsStoreData {
  if (!event || !event.eventId || !event.sessionId || !event.learnerId) {
    return store;
  }

  // Deduplicate by eventId
  if (store.processedEventIds.includes(event.eventId)) {
    return store;
  }
  store.processedEventIds.push(event.eventId);

  const meta = getLessonMeta(event.lessonId);
  const resolvedAccountType: "registered" | "guest" =
    event.accountType || (isGuestId(event.learnerId) ? "guest" : "registered");

  let session = store.sessions[event.sessionId];
  if (!session) {
    const initialStage: AnalyticsStage =
      event.type === "lesson_complete"
        ? "complete"
        : event.stage || "strategy_intro";
    session = {
      sessionId: event.sessionId,
      learnerId: event.learnerId,
      accountType: resolvedAccountType,
      teacherId: resolvedAccountType === "guest" ? undefined : event.teacherId || "teacher_1",
      lessonId: event.lessonId,
      factorLabel: meta.factorLabel,
      startedAt: event.timestamp,
      lastUpdatedAt: event.timestamp,
      completedAt: null,
      completed: false,
      checkoutPassed: false,
      lastStage: initialStage,
      stageHistory: [{ stage: initialStage, timestamp: event.timestamp }],
      activeDurationSeconds: 0,
      attemptsTracked: true,
      attempts: [],
    };
    store.sessions[event.sessionId] = session;
  }

  if (event.teacherId && session.accountType === "registered") {
    session.teacherId = event.teacherId;
  }

  if (event.timestamp > session.lastUpdatedAt) {
    session.lastUpdatedAt = event.timestamp;
  }

  switch (event.type) {
    case "lesson_start": {
      const stage = event.stage || "strategy_intro";
      if (!session.completed) {
        session.lastStage = stage;
      }
      if (!session.stageHistory.some((sh) => sh.stage === stage)) {
        session.stageHistory.push({ stage, timestamp: event.timestamp });
      }
      break;
    }

    case "stage_change": {
      if (!session.completed) {
        session.lastStage = event.stage;
      }
      const lastRecorded = session.stageHistory[session.stageHistory.length - 1];
      if (!lastRecorded || lastRecorded.stage !== event.stage) {
        session.stageHistory.push({ stage: event.stage, timestamp: event.timestamp });
      }
      if (typeof event.activeDurationSeconds === "number" && event.activeDurationSeconds >= 0) {
        session.activeDurationSeconds = Math.max(
          session.activeDurationSeconds ?? 0,
          Math.round(event.activeDurationSeconds)
        );
      }
      break;
    }

    case "answer_submitted": {
      session.attemptsTracked = true;
      if (!session.completed && event.stage) {
        session.lastStage = event.stage;
      }
      // Deduplicate question attempt by eventId
      if (!session.attempts.some((a) => a.eventId === event.eventId)) {
        const attemptRecord: AnalyticsQuestionAttempt = {
          eventId: event.eventId,
          sessionId: event.sessionId,
          learnerId: event.learnerId,
          lessonId: event.lessonId,
          stage: event.stage,
          questionId: event.questionId,
          attemptNumber: Math.max(1, event.attemptNumber || 1),
          isCorrect: Boolean(event.isCorrect),
          timestamp: event.timestamp,
        };
        session.attempts.push(attemptRecord);
      }
      if (typeof event.activeDurationSeconds === "number" && event.activeDurationSeconds >= 0) {
        session.activeDurationSeconds = Math.max(
          session.activeDurationSeconds ?? 0,
          Math.round(event.activeDurationSeconds)
        );
      }
      break;
    }

    case "active_time_sync": {
      if (!session.completed && event.stage) {
        session.lastStage = event.stage;
      }
      if (typeof event.activeDurationSeconds === "number" && event.activeDurationSeconds >= 0) {
        session.activeDurationSeconds = Math.max(
          session.activeDurationSeconds ?? 0,
          Math.round(event.activeDurationSeconds)
        );
      }
      break;
    }

    case "lesson_complete": {
      // Idempotent completion: duplicate lesson_complete events for the same sessionId
      // update activeDurationSeconds via Math.max and keep completed=true without duplicating
      session.completed = true;
      session.checkoutPassed = session.checkoutPassed || Boolean(event.checkoutPassed);
      session.lastStage = "complete";
      if (!session.completedAt) {
        session.completedAt = event.timestamp;
      }
      if (!session.stageHistory.some((sh) => sh.stage === "complete")) {
        session.stageHistory.push({ stage: "complete", timestamp: event.timestamp });
      }
      if (typeof event.activeDurationSeconds === "number" && event.activeDurationSeconds >= 0) {
        session.activeDurationSeconds = Math.max(
          session.activeDurationSeconds ?? 0,
          Math.round(event.activeDurationSeconds)
        );
      }
      break;
    }
  }

  store.updatedAt = new Date().toISOString();
  return store;
}

/**
 * Reconciles existing StudentProfile records (and optional guest profile) into the analytics store
 * so legacy lessonHistory attempts appear with "Not tracked" (`activeDurationSeconds: null`, `attemptsTracked: false`)
 * when no granular session record exists for that historical attempt.
 */
export function reconcileHistoricalStudentProgress(
  store: AnalyticsStoreData,
  profiles: StudentProfile[]
): AnalyticsStoreData {
  const existingSessions = Object.values(store.sessions);

  for (const student of profiles) {
    if (!student || !student.id) continue;
    const accountType: "registered" | "guest" =
      student.accountType === "guest" || isGuestId(student.id) ? "guest" : "registered";
    const teacherId = accountType === "guest" ? undefined : student.teacherId || "teacher_1";

    if (Array.isArray(student.lessonHistory)) {
      for (const hist of student.lessonHistory) {
        const backfilledId = `hist_${student.id}_${hist.id}`;
        if (store.sessions[backfilledId]) continue;

        // Check if a live tracked session already matches this student + lesson within 2 minutes of hist.timestamp
        const histMs = new Date(hist.timestamp).getTime();
        const hasMatchingTracked = existingSessions.some((s) => {
          if (s.learnerId !== student.id || s.lessonId !== hist.lessonId || s.isHistoricalBackfill) {
            return false;
          }
          const compMs = s.completedAt ? new Date(s.completedAt).getTime() : new Date(s.lastUpdatedAt).getTime();
          return Math.abs(compMs - histMs) < 120_000;
        });

        if (!hasMatchingTracked) {
          const meta = getLessonMeta(hist.lessonId);
          store.sessions[backfilledId] = {
            sessionId: backfilledId,
            learnerId: student.id,
            accountType,
            teacherId,
            lessonId: hist.lessonId,
            factorLabel: meta.factorLabel,
            startedAt: hist.timestamp,
            lastUpdatedAt: hist.timestamp,
            completedAt: hist.timestamp,
            completed: true,
            checkoutPassed: Boolean(hist.checkoutPassed),
            lastStage: "complete",
            stageHistory: [{ stage: "complete", timestamp: hist.timestamp }],
            activeDurationSeconds: null, // Legacy session: active time not tracked
            attemptsTracked: false, // Legacy session: per-question attempt sequence not tracked
            attempts: [],
            isHistoricalBackfill: true,
          };
        }
      }
    }
  }

  return store;
}

function sendEventToServerAsync(event: AnalyticsEventPayload): void {
  if (typeof window === "undefined" || typeof fetch === "undefined") return;
  try {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
      keepalive: true,
    }).catch(() => {
      // Offline / local fallback already saved in localStorage
    });
  } catch {
    // Ignore network errors; local store has the event
  }
}

export function dispatchAnalyticsEvent(event: AnalyticsEventPayload): AnalyticsStoreData {
  const store = loadClientAnalyticsStore();
  applyAnalyticsEvent(store, event);
  saveClientAnalyticsStore(store);
  sendEventToServerAsync(event);
  return store;
}

export function computeMedian(values: number[]): number | null {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function formatActiveDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return "Not tracked";
  }
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) {
    return `${s}s`;
  }
  const mins = Math.floor(s / 60);
  const remSec = s % 60;
  if (mins < 60) {
    return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

/**
 * Builds the complete AppAnalyticsReport for a given date range ("7d" | "30d" | "all"),
 * combining all registered learners and anonymous guests.
 */
export function buildAppAnalyticsReport(
  store: AnalyticsStoreData,
  profiles: StudentProfile[] = [],
  range: AnalyticsDateRange = "all",
  nowDate: Date = new Date()
): AppAnalyticsReport {
  // Reconcile historical student progress first without mutating caller unexpectedly
  const mergedStore: AnalyticsStoreData = {
    sessions: { ...store.sessions },
    processedEventIds: [...store.processedEventIds],
    updatedAt: store.updatedAt,
  };
  reconcileHistoricalStudentProgress(mergedStore, profiles);

  const nowMs = nowDate.getTime();
  const cutoffMs =
    range === "7d"
      ? nowMs - 7 * 24 * 60 * 60 * 1000
      : range === "30d"
      ? nowMs - 30 * 24 * 60 * 60 * 1000
      : 0;

  const allSessions = Object.values(mergedStore.sessions);
  const filteredSessions = allSessions.filter((s) => {
    if (cutoffMs === 0) return true;
    const t = new Date(s.lastUpdatedAt || s.startedAt).getTime();
    return t >= cutoffMs;
  });

  // Group sessions by learnerId
  const sessionsByLearner = new Map<string, AnalyticsSessionRecord[]>();
  for (const s of filteredSessions) {
    const list = sessionsByLearner.get(s.learnerId) || [];
    list.push(s);
    sessionsByLearner.set(s.learnerId, list);
  }

  // Also include registered profiles that were active within the range (or in "all" range)
  const profileMap = new Map<string, StudentProfile>();
  for (const p of profiles) {
    if (p && p.id) {
      profileMap.set(p.id, p);
      if (range === "all" && !sessionsByLearner.has(p.id) && (p.lessonHistory?.length > 0 || p.currentLessonId > 1)) {
        sessionsByLearner.set(p.id, []);
      }
    }
  }

  const activeLearnerIds = Array.from(sessionsByLearner.keys());
  let registeredLearnersCount = 0;
  let guestLearnersCount = 0;

  // Compute session-level KPIs
  const trackedSessionDurations: number[] = [];
  let lessonsStarted = 0;
  let lessonsCompleted = 0;

  const levelMap = new Map<
    number,
    { lessonId: number; lessonNumber: number; title: string; factorLabel: string; startedCount: number; completedCount: number }
  >();
  for (const meta of LESSON_LEVEL_METADATA) {
    levelMap.set(meta.lessonId, {
      lessonId: meta.lessonId,
      lessonNumber: meta.lessonNumber,
      title: meta.shortTitle,
      factorLabel: meta.factorLabel,
      startedCount: 0,
      completedCount: 0,
    });
  }

  // Track where learners most often stop based on the last recorded lesson stage
  const stopStageCounts: Record<AnalyticsStage, number> = {
    strategy_intro: 0,
    model: 0,
    review: 0,
    guided: 0,
    fluency: 0,
    transition_gate: 0,
    checkout: 0,
    complete: 0,
  };
  const incompleteStopCounts: Record<Exclude<AnalyticsStage, "complete">, number> = {
    strategy_intro: 0,
    model: 0,
    review: 0,
    guided: 0,
    fluency: 0,
    transition_gate: 0,
    checkout: 0,
  };

  for (const s of filteredSessions) {
    lessonsStarted += 1;
    if (s.completed) {
      lessonsCompleted += 1;
    }
    if (typeof s.activeDurationSeconds === "number" && !s.isHistoricalBackfill) {
      trackedSessionDurations.push(s.activeDurationSeconds);
    }

    const lvl = levelMap.get(s.lessonId);
    if (lvl) {
      lvl.startedCount += 1;
      if (s.completed) {
        lvl.completedCount += 1;
      }
    }

    const stage = s.lastStage || "strategy_intro";
    stopStageCounts[stage] = (stopStageCounts[stage] || 0) + 1;
    if (!s.completed && stage !== "complete") {
      incompleteStopCounts[stage] = (incompleteStopCounts[stage] || 0) + 1;
    }
  }

  // Determine most common stop stage (prioritizing incomplete drop-offs where learners stop before finishing;
  // falls back to overall last stage if all sessions completed)
  let mostCommonStopStage: AppAnalyticsReport["mostCommonStopStage"] = null;
  const incompleteEntries = (Object.entries(incompleteStopCounts) as [Exclude<AnalyticsStage, "complete">, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (incompleteEntries.length > 0) {
    const [topStage, topCount] = incompleteEntries[0];
    mostCommonStopStage = {
      stage: topStage,
      stageLabel: STAGE_LABELS[topStage],
      count: topCount,
    };
  } else if (filteredSessions.length > 0) {
    const allStageEntries = (Object.entries(stopStageCounts) as [AnalyticsStage, number][])
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    if (allStageEntries.length > 0) {
      const [topStage, topCount] = allStageEntries[0];
      mostCommonStopStage = {
        stage: topStage,
        stageLabel: STAGE_LABELS[topStage],
        count: topCount,
      };
    }
  }

  const totalSessions = filteredSessions.length;
  const dropoffByStage: AppAnalyticsReport["dropoffByStage"] = (
    Object.keys(STAGE_LABELS) as AnalyticsStage[]
  ).map((stage) => {
    const count = stopStageCounts[stage] || 0;
    return {
      stage,
      stageLabel: STAGE_LABELS[stage],
      count,
      percentage: totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0,
    };
  });

  // Build per-learner summaries
  const learners: LearnerAnalyticsSummary[] = [];

  for (const learnerId of activeLearnerIds) {
    const learnerSessions = (sessionsByLearner.get(learnerId) || []).sort(
      (a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
    );
    const profile = profileMap.get(learnerId);
    const accountType: "registered" | "guest" =
      profile?.accountType === "guest" ||
      isGuestId(learnerId) ||
      learnerSessions.some((s) => s.accountType === "guest")
        ? "guest"
        : "registered";

    if (accountType === "guest") {
      guestLearnersCount += 1;
    } else {
      registeredLearnersCount += 1;
    }

    const teacherId =
      accountType === "guest"
        ? undefined
        : profile?.teacherId || learnerSessions.find((s) => s.teacherId)?.teacherId || "teacher_1";

    let totalActiveSeconds: number | null = null;
    let hasUntrackedTime = false;
    let firstAttemptCorrect = 0;
    let firstAttemptTotal = 0;
    let retryCorrect = 0;
    let retryTotal = 0;
    let hasTrackedAttempts = false;

    const completedLessonIdsSet = new Set<number>();

    for (const s of learnerSessions) {
      if (typeof s.activeDurationSeconds === "number") {
        totalActiveSeconds = (totalActiveSeconds ?? 0) + s.activeDurationSeconds;
      } else {
        hasUntrackedTime = true;
      }

      if (s.completed) {
        completedLessonIdsSet.add(s.lessonId);
      }

      if (s.attemptsTracked && Array.isArray(s.attempts)) {
        for (const att of s.attempts) {
          hasTrackedAttempts = true;
          if (att.attemptNumber === 1) {
            firstAttemptTotal += 1;
            if (att.isCorrect) firstAttemptCorrect += 1;
          } else {
            retryTotal += 1;
            if (att.isCorrect) retryCorrect += 1;
          }
        }
      }
    }

    // If profile has mastered/completed lessons in all-time view, also reflect them
    if (range === "all" && profile) {
      const masteredUpTo = Math.min(11, (profile.currentLessonId || 1) - 1);
      for (let l = 1; l <= masteredUpTo; l++) {
        completedLessonIdsSet.add(l);
      }
    }

    // Determine most recently reached level & lesson stage
    // Also check highest opened lesson so we clearly distinguish a learner who opened the 7s (Lesson 10) from one who completed them!
    let latestLevelReached: LearnerAnalyticsSummary["latestLevelReached"] = null;
    if (learnerSessions.length > 0) {
      const mostRecentSession = learnerSessions[0];
      const meta = getLessonMeta(mostRecentSession.lessonId);
      latestLevelReached = {
        lessonId: mostRecentSession.lessonId,
        lessonNumber: meta.lessonNumber,
        factorLabel: meta.factorLabel,
        title: meta.shortTitle,
        stage: mostRecentSession.lastStage,
        timestamp: mostRecentSession.lastUpdatedAt,
      };
    } else if (profile) {
      const curId = Math.min(11, profile.currentLessonId || 1);
      const meta = getLessonMeta(curId);
      latestLevelReached = {
        lessonId: curId,
        lessonNumber: meta.lessonNumber,
        factorLabel: meta.factorLabel,
        title: meta.shortTitle,
        stage: profile.currentLessonId > 11 ? "complete" : "strategy_intro",
        timestamp: profile.lastActive,
      };
    }

    // Build levelProgress for all 11 levels
    const levelProgress: LearnerLevelProgress[] = LESSON_LEVEL_METADATA.map((meta) => {
      const lvlSessions = learnerSessions.filter((s) => s.lessonId === meta.lessonId);
      const completed = completedLessonIdsSet.has(meta.lessonId) || lvlSessions.some((s) => s.completed);
      const opened = lvlSessions.length > 0 || completed || (profile ? profile.currentLessonId === meta.lessonId : false);

      let highestStageReached: AnalyticsStage | null = null;
      let lvlActiveSeconds: number | null = null;
      let lvlFirstCorrect = 0;
      let lvlFirstTotal = 0;
      let lvlHasTrackedAttempts = false;
      let lvlLastActive: string | null = null;

      for (const s of lvlSessions) {
        if (
          !highestStageReached ||
          STAGE_ORDER[s.lastStage] > STAGE_ORDER[highestStageReached]
        ) {
          highestStageReached = s.lastStage;
        }
        if (typeof s.activeDurationSeconds === "number") {
          lvlActiveSeconds = (lvlActiveSeconds ?? 0) + s.activeDurationSeconds;
        }
        if (s.attemptsTracked) {
          for (const a of s.attempts) {
            if (a.attemptNumber === 1) {
              lvlHasTrackedAttempts = true;
              lvlFirstTotal += 1;
              if (a.isCorrect) lvlFirstCorrect += 1;
            }
          }
        }
        if (!lvlLastActive || s.lastUpdatedAt > lvlLastActive) {
          lvlLastActive = s.lastUpdatedAt;
        }
      }

      if (!highestStageReached && completed) {
        highestStageReached = "complete";
      }

      return {
        lessonId: meta.lessonId,
        lessonNumber: meta.lessonNumber,
        title: meta.shortTitle,
        factorLabel: meta.factorLabel,
        opened,
        completed,
        highestStageReached,
        sessionsCount: lvlSessions.length,
        completedCount: lvlSessions.filter((s) => s.completed).length + (lvlSessions.length === 0 && completed ? 1 : 0),
        activeSeconds: lvlActiveSeconds,
        firstAttemptCorrect: lvlHasTrackedAttempts ? lvlFirstCorrect : null,
        firstAttemptTotal: lvlHasTrackedAttempts ? lvlFirstTotal : null,
        lastActiveAt: lvlLastActive,
      };
    });

    const lastActiveAt =
      learnerSessions[0]?.lastUpdatedAt || profile?.lastActive || nowDate.toISOString();

    learners.push({
      learnerId,
      accountType,
      teacherId,
      lastActiveAt,
      sessionCount: learnerSessions.length,
      totalActiveSeconds,
      hasUntrackedTime,
      latestLevelReached,
      completedLessonsCount: completedLessonIdsSet.size,
      completedLessonIds: Array.from(completedLessonIdsSet).sort((a, b) => a - b),
      firstAttemptCorrect,
      firstAttemptTotal,
      retryCorrect,
      retryTotal,
      hasTrackedAttempts,
      recentSessions: learnerSessions.slice(0, 25),
      levelProgress,
    });
  }

  learners.sort(
    (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  );

  return {
    range,
    generatedAt: nowDate.toISOString(),
    uniqueActiveLearners: activeLearnerIds.length,
    registeredLearnersCount,
    guestLearnersCount,
    totalSessions,
    medianActiveSecondsPerSession: computeMedian(trackedSessionDurations),
    lessonsStarted,
    lessonsCompleted,
    completionsByLevel: Array.from(levelMap.values()),
    dropoffByStage,
    mostCommonStopStage,
    learners,
  };
}

/**
 * Verifies on the server (or in server-side guards) whether a request token/PIN belongs to the App Owner.
 * A teacher PIN by itself (e.g., "2468" or "teacher:...") ONLY grants access to that teacher's students
 * and is strictly rejected for App Analytics.
 */
export function verifyOwnerAnalyticsAccess(authHeaderOrToken?: string | null, ownerPinOverride?: string): {
  authorized: boolean;
  status: 200 | 401 | 403;
  error?: string;
} {
  if (!authHeaderOrToken || !authHeaderOrToken.trim()) {
    return {
      authorized: false,
      status: 401,
      error: "Unauthorized: Missing owner authentication token.",
    };
  }

  const raw = authHeaderOrToken.replace(/^Bearer\s+/i, "").trim();

  // Explicitly reject teacher tokens
  if (raw.startsWith("teacher:")) {
    return {
      authorized: false,
      status: 403,
      error: "Forbidden: Teacher PIN only grants access to that teacher's students. Owner access is required for App Analytics.",
    };
  }

  const candidatePin = raw.startsWith("owner:") ? raw.slice("owner:".length).trim() : raw;
  const expectedOwnerPin = ownerPinOverride || (typeof process !== "undefined" && process.env?.CHADMATH_OWNER_PIN) || "1234";

  if (candidatePin === expectedOwnerPin || verifyOwnerPin(candidatePin)) {
    return {
      authorized: true,
      status: 200,
    };
  }

  return {
    authorized: false,
    status: 403,
    error: "Forbidden: Invalid owner credentials. Only the App Owner can access App Analytics.",
  };
}

/**
 * Client helper to fetch App Analytics from the server endpoint with owner credentials enforced.
 */
export async function fetchOwnerAppAnalytics(
  session: PortalAuthSession | null,
  range: AnalyticsDateRange
): Promise<{ ok: boolean; status: number; report?: AppAnalyticsReport; error?: string }> {
  if (!session || session.role !== "owner" || !session.token) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden: Owner access required for App Analytics.",
    };
  }

  const localStore = loadClientAnalyticsStore();
  const registeredProfiles = loadAllStudents();
  const guestProfile = loadGuestProfile();
  const allLocalProfiles = guestProfile
    ? [...registeredProfiles, guestProfile]
    : registeredProfiles;

  try {
    const response = await fetch(`/api/analytics?range=${encodeURIComponent(range)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
        "x-chadmath-role": session.role,
      },
      body: JSON.stringify({
        action: "query_report",
        range,
        clientStore: localStore,
        clientProfiles: allLocalProfiles,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return {
        ok: false,
        status: response.status,
        error: errBody.error || `Server rejected analytics request (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      status: 200,
      report: data.report as AppAnalyticsReport,
    };
  } catch {
    // Fallback if running in an environment without HTTP server, still enforcing verifyOwnerAnalyticsAccess
    const authCheck = verifyOwnerAnalyticsAccess(session.token);
    if (!authCheck.authorized) {
      return {
        ok: false,
        status: authCheck.status,
        error: authCheck.error,
      };
    }
    const report = buildAppAnalyticsReport(localStore, allLocalProfiles, range);
    return {
      ok: true,
      status: 200,
      report,
    };
  }
}

export { getOrCreateGuestLearnerId };

