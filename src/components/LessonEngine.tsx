"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Volume2,
  Target,
  Play,
  Pause,
  Type,
  HelpCircle,
} from "lucide-react";
import { DILesson, MathFact, LessonAttempt, StudentProfile } from "@/lib/types";
import { Numpad } from "./Numpad";
import { FactVisualizer } from "./FactVisualizer";
import {
  FormattedMathFact,
  FormattedEquation,
  HighlightedStrategyText,
  HeadlineMathFactBanner,
} from "./FormattedMath";
import { soundEffects } from "@/lib/sounds";
import {
  getDynamicRuleExplanation,
  DynamicRuleExplanation,
  renderFact,
  RenderedFactView,
} from "@/lib/ruleEngine";
import {
  recordFactAnswer,
  addToReDrillQueue,
  revertStudentToSnapshot,
  getOrCreateGuestLearnerId,
  isGuestId,
} from "@/lib/storage";
import {
  ActiveLearningTimer,
  dispatchAnalyticsEvent,
  PERIODIC_SAVE_INTERVAL_MS,
} from "@/lib/analytics";

interface LessonEngineProps {
  lesson: DILesson;
  student?: StudentProfile | null;
  onLessonComplete: (attempt: Omit<LessonAttempt, "id" | "studentId" | "timestamp">) => void;
  onExit: () => void;
}

interface CheckoutItemResult {
  fact: MathFact;
  answerEntered: number;
  isCorrect: boolean;
  latencyMs: number;
}

type ExtendedPhase =
  | "strategy_intro"
  | "model"
  | "review"
  | "guided"
  | "fluency"
  | "transition_gate"
  | "checkout"
  | "complete";

export function LessonEngine({
  lesson,
  student,
  onLessonComplete,
  onExit,
}: LessonEngineProps) {
  // Lesson state
  const [phase, setPhase] = useState<ExtendedPhase>("strategy_intro");
  const [phaseStepIndex, setPhaseStepIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Math fact currently presented
  const [currentFact, setCurrentFact] = useState<MathFact>(
    lesson.targetFacts[0] || { a: 2, b: 3, product: 6 }
  );
  const [typedAnswer, setTypedAnswer] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active check-for-understanding question state for Phase 2 "I Do"
  const [checkExplanation, setCheckExplanation] = useState<DynamicRuleExplanation | null>(null);
  const [checkStepIndex, setCheckStepIndex] = useState<number>(0);
  const [checkFeedback, setCheckFeedback] = useState<string | null>(null);

  // Post-submission Gate feedback (restates fact + strategy split after bare gate submission)
  const [gateFeedback, setGateFeedback] = useState<{
    rendered: RenderedFactView;
    isCorrect: boolean;
  } | null>(null);

  // Scaffold visibility controls (fading)
  const [showHintScaffold, setShowHintScaffold] = useState<boolean>(false);
  const [hintUsedOnCurrentFact, setHintUsedOnCurrentFact] = useState<boolean>(false);

  // Accessibility & UI controls
  const [fontSize, setFontSize] = useState<"normal" | "large">("normal");
  const [isReadingAloud, setIsReadingAloud] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Direct Instruction Guided Correction States
  const [isErrorCorrecting, setIsErrorCorrecting] = useState<boolean>(false);
  const [correctionExplanation, setCorrectionExplanation] = useState<DynamicRuleExplanation | null>(null);

  // Dynamic question queue for current phase (allows re-inserting missed facts)
  const [currentQueue, setCurrentQueue] = useState<MathFact[]>([]);

  // Statistics for the session
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState<number>(0);
  const [errorFacts, setErrorFacts] = useState<string[]>([]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [streakToast, setStreakToast] = useState<{
    tier: "hot" | "supercharged";
    title: string;
    emoji: string;
  } | null>(null);

  // Checkout Gate Verification States
  const [checkoutFacts, setCheckoutFacts] = useState<MathFact[]>([]);
  const [checkoutResults, setCheckoutResults] = useState<CheckoutItemResult[]>([]);
  const [checkoutFinalScore, setCheckoutFinalScore] = useState<{
    correct: number;
    total: number;
    averageLatencyMs: number;
    passed: boolean;
    speedGoalMet: boolean;
    starsEarned: 1 | 2 | 3;
  } | null>(null);

  // P0: 400ms Second-Digit Pause & Double-Tap Pollution Cooldown Controls
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const isAdvancingRef = useRef<boolean>(false);
  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Lesson 2 (×2), Lesson 3 (×5), & Lesson 4 (×3) Strategy Overview Sequential Demonstration State
  // Lesson 2 Stages: 0..4 (800ms intervals)
  // Lesson 3 Stages: 0 ("5 × 3") -> 1 (group 1 & running total 5) -> 2 (group 2 & running total 10) -> 3 (group 3 & running total 15) -> 4 ("5 + 5 + 5 = 15" & conclusion) -> 5 ("= 15" in main equation) (900ms intervals)
  // Lesson 4 Stages: 0 ("3 × 4" + "Three groups of 4.") -> 1 (reveal two groups of 4 purple dots) -> 2 ("Double 4" & "4 + 4 = 8", then pause on 8) -> 3 (reveal third group of 4 dots + "Add one more group of 4" & "8 + 4 = 12") -> 4 (complete top equation "3 × 4 = 12")
  const [doubleIntroStage, setDoubleIntroStage] = useState<number>(0);
  const [fivesIntroStage, setFivesIntroStage] = useState<number>(0);
  const [threesIntroStage, setThreesIntroStage] = useState<number>(0);
  const doubleIntroTimersRef = useRef<NodeJS.Timeout[]>([]);

  const clearDoubleIntroTimers = useCallback(() => {
    doubleIntroTimersRef.current.forEach((t) => clearTimeout(t));
    doubleIntroTimersRef.current = [];
  }, []);

  const startDoubleIntroAnimation = useCallback(() => {
    clearDoubleIntroTimers();
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setDoubleIntroStage(4);
      return;
    }

    setDoubleIntroStage(0);
    const stageIntervalMs = 800;
    const timers: NodeJS.Timeout[] = [
      setTimeout(() => setDoubleIntroStage(1), stageIntervalMs * 1),
      setTimeout(() => setDoubleIntroStage(2), stageIntervalMs * 2),
      setTimeout(() => setDoubleIntroStage(3), stageIntervalMs * 3),
      setTimeout(() => setDoubleIntroStage(4), stageIntervalMs * 4),
    ];
    doubleIntroTimersRef.current = timers;
  }, [clearDoubleIntroTimers]);

  const startFivesIntroAnimation = useCallback(() => {
    clearDoubleIntroTimers();
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setFivesIntroStage(5);
      return;
    }

    setFivesIntroStage(0);
    const stageIntervalMs = 900;
    const timers: NodeJS.Timeout[] = [
      setTimeout(() => setFivesIntroStage(1), stageIntervalMs * 1),
      setTimeout(() => setFivesIntroStage(2), stageIntervalMs * 2),
      setTimeout(() => setFivesIntroStage(3), stageIntervalMs * 3),
      setTimeout(() => setFivesIntroStage(4), stageIntervalMs * 4),
      setTimeout(() => setFivesIntroStage(5), stageIntervalMs * 5),
    ];
    doubleIntroTimersRef.current = timers;
  }, [clearDoubleIntroTimers]);

  const startThreesIntroAnimation = useCallback(() => {
    clearDoubleIntroTimers();
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setThreesIntroStage(4);
      return;
    }

    setThreesIntroStage(0);
    // Stage 1 at 800ms (2 groups of 4 dots)
    // Stage 2 at 1600ms ("Double 4" and "4 + 4 = 8")
    // Pause 1600ms on 8 so students clearly see the first two groups make 8 -> Stage 3 at 3200ms (3rd group + "Add one more group of 4" & "8 + 4 = 12")
    // Stage 4 at 4100ms ("= 12" in top equation)
    const timers: NodeJS.Timeout[] = [
      setTimeout(() => setThreesIntroStage(1), 800),
      setTimeout(() => setThreesIntroStage(2), 1600),
      setTimeout(() => setThreesIntroStage(3), 3200),
      setTimeout(() => setThreesIntroStage(4), 4100),
    ];
    doubleIntroTimersRef.current = timers;
  }, [clearDoubleIntroTimers]);

  useEffect(() => {
    if (phase === "strategy_intro" && (lesson.id === 2 || lesson.id === 3 || lesson.id === 4)) {
      if (lesson.id === 2) {
        startDoubleIntroAnimation();
      } else if (lesson.id === 3) {
        startFivesIntroAnimation();
      } else {
        startThreesIntroAnimation();
      }

      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const handleMotionChange = (e: MediaQueryListEvent) => {
          if (e.matches) {
            clearDoubleIntroTimers();
            setDoubleIntroStage(4);
            setFivesIntroStage(5);
            setThreesIntroStage(4);
          }
        };
        mediaQuery.addEventListener?.("change", handleMotionChange);
        return () => {
          mediaQuery.removeEventListener?.("change", handleMotionChange);
          clearDoubleIntroTimers();
        };
      }
    }
    return () => {
      clearDoubleIntroTimers();
    };
  }, [
    clearDoubleIntroTimers,
    lesson.id,
    phase,
    startDoubleIntroAnimation,
    startFivesIntroAnimation,
    startThreesIntroAnimation,
  ]);

  // P0: Student Snapshot on Mount — ensures "Leave Without Saving" restores exact state
  const initialStudentSnapshotRef = useRef<StudentProfile | null>(null);
  useEffect(() => {
    if (student && !initialStudentSnapshotRef.current) {
      initialStudentSnapshotRef.current = JSON.parse(JSON.stringify(student));
    }
  }, [student]);

  // Analytics Session & Active Learning Time Tracking
  const sessionIdRef = useRef<string>(
    `sess_L${lesson.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
  const activeTimerRef = useRef<ActiveLearningTimer>(new ActiveLearningTimer(Date.now()));
  const lastSavedActiveSecondsRef = useRef<number>(-1);
  const questionAttemptCountRef = useRef<Map<string, number>>(new Map());
  const eventSeqRef = useRef<number>(0);

  const resolveLearnerIdentity = useCallback(() => {
    const learnerId = student?.id || getOrCreateGuestLearnerId();
    const accountType: "registered" | "guest" =
      student?.accountType === "guest" || isGuestId(learnerId) ? "guest" : "registered";
    const teacherId = accountType === "guest" ? undefined : student?.teacherId || "teacher_1";
    return { learnerId, accountType, teacherId };
  }, [student]);

  const nextEventId = useCallback((prefix: string) => {
    eventSeqRef.current += 1;
    return `${sessionIdRef.current}_${prefix}_${eventSeqRef.current}`;
  }, []);

  // Record lesson_start on mount & sync visibility / interaction / periodic active time
  useEffect(() => {
    const { learnerId, accountType, teacherId } = resolveLearnerIdentity();
    const timer = activeTimerRef.current;

    dispatchAnalyticsEvent({
      type: "lesson_start",
      eventId: `${sessionIdRef.current}_start`,
      sessionId: sessionIdRef.current,
      learnerId,
      accountType,
      teacherId,
      lessonId: lesson.id,
      stage: "strategy_intro",
      timestamp: new Date().toISOString(),
    });

    const handleUserInteraction = () => {
      timer.recordInteraction(Date.now());
    };

    const flushActiveTime = () => {
      const activeSecs = timer.getActiveSeconds(Date.now());
      if (activeSecs !== lastSavedActiveSecondsRef.current) {
        lastSavedActiveSecondsRef.current = activeSecs;
        dispatchAnalyticsEvent({
          type: "active_time_sync",
          eventId: nextEventId("sync"),
          sessionId: sessionIdRef.current,
          learnerId,
          accountType,
          teacherId,
          lessonId: lesson.id,
          activeDurationSeconds: activeSecs,
          timestamp: new Date().toISOString(),
        });
      }
    };

    const handleVisibilityChange = () => {
      const visible = typeof document !== "undefined" ? document.visibilityState === "visible" : true;
      timer.setPageVisible(visible, Date.now());
      if (!visible) {
        flushActiveTime();
      }
    };

    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction, { passive: true });
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flushActiveTime);

    const periodicSync = setInterval(() => {
      flushActiveTime();
    }, PERIODIC_SAVE_INTERVAL_MS);

    return () => {
      clearInterval(periodicSync);
      flushActiveTime();
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flushActiveTime);
    };
  }, [lesson.id, nextEventId, resolveLearnerIdentity]);

  // Keep active timer aware of intro animations & pause state
  useEffect(() => {
    const isAnimPlaying =
      phase === "strategy_intro" &&
      ((lesson.id === 2 && doubleIntroStage < 4) ||
        (lesson.id === 3 && fivesIntroStage < 5) ||
        (lesson.id === 4 && threesIntroStage < 4));
    activeTimerRef.current.setWatchingAnimation(isAnimPlaying, Date.now());
  }, [doubleIntroStage, fivesIntroStage, lesson.id, phase, threesIntroStage]);

  useEffect(() => {
    activeTimerRef.current.setPaused(isPaused, Date.now());
  }, [isPaused]);

  // Record stage changes
  useEffect(() => {
    const { learnerId, accountType, teacherId } = resolveLearnerIdentity();
    const activeSecs = activeTimerRef.current.getActiveSeconds(Date.now());
    lastSavedActiveSecondsRef.current = activeSecs;

    if (phase === "complete") {
      activeTimerRef.current.markCompleted(Date.now());
      dispatchAnalyticsEvent({
        type: "lesson_complete",
        eventId: `${sessionIdRef.current}_complete`,
        sessionId: sessionIdRef.current,
        learnerId,
        accountType,
        teacherId,
        lessonId: lesson.id,
        checkoutPassed: Boolean(checkoutFinalScore?.passed),
        activeDurationSeconds: activeSecs,
        timestamp: new Date().toISOString(),
      });
    } else {
      dispatchAnalyticsEvent({
        type: "stage_change",
        eventId: nextEventId(`stage_${phase}`),
        sessionId: sessionIdRef.current,
        learnerId,
        accountType,
        teacherId,
        lessonId: lesson.id,
        stage: phase,
        activeDurationSeconds: activeSecs,
        timestamp: new Date().toISOString(),
      });
    }
  }, [checkoutFinalScore?.passed, lesson.id, nextEventId, phase, resolveLearnerIdentity]);

  const handleConfirmDiscardAndExit = () => {
    if (initialStudentSnapshotRef.current) {
      revertStudentToSnapshot(initialStudentSnapshotRef.current);
    }
    onExit();
  };

  // Initialize explanation on lesson load
  useEffect(() => {
    const expl = getDynamicRuleExplanation(lesson.id, lesson.targetFacts[0].a, lesson.targetFacts[0].b);
    setCheckExplanation(expl);
  }, [lesson]);

  // Elapsed Practice Timer (Pausable; pauses during Checkout Gate feedback; never teleports)
  useEffect(() => {
    if (isPaused || phase === "complete" || Boolean(gateFeedback)) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gateFeedback, isPaused, phase]);

  const formatElapsed = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  // Text-to-Speech Read Aloud
  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsReadingAloud(true);
      utterance.onend = () => setIsReadingAloud(false);
      utterance.onerror = () => setIsReadingAloud(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsReadingAloud(false);
    }
  };

  // Start Step 2 "I Do" Check-for-Understanding Screen (Strictly Separate from Drill)
  const handleStartModelCheck = () => {
    clearDoubleIntroTimers();
    setPhase("model");
    setPhaseStepIndex(0);
    setCheckStepIndex(0);
    const firstTarget = lesson.targetFacts[0];
    setCurrentFact(firstTarget);
    setCheckExplanation(getDynamicRuleExplanation(lesson.id, firstTarget.a, firstTarget.b));
    setTypedAnswer("");
    setErrorMessage(null);
    setCheckFeedback(null);
    questionStartTimeRef.current = Date.now();
  };

  // Transition to Warm-Up (Phase 3)
  const startWarmUpPhase = useCallback(() => {
    setPhase("review");
    setPhaseStepIndex(0);
    const pool = lesson.reviewFacts.length > 0 ? lesson.reviewFacts : lesson.targetFacts;
    setCurrentQueue([...pool]);
    setCurrentFact(pool[0]);
    setTypedAnswer("");
    setErrorMessage(null);
    setCheckFeedback(null);
    setShowHintScaffold(false);
    setHintUsedOnCurrentFact(false);
    questionStartTimeRef.current = Date.now();
  }, [lesson]);

  // Transition to Guided Practice "We Do" (Phase 4)
  const startGuidedPractice = useCallback(() => {
    setPhase("guided");
    setPhaseStepIndex(0);
    const pool = [...lesson.targetFacts];
    setCurrentQueue(pool);
    setCurrentFact(pool[0]);
    setTypedAnswer("");
    setErrorMessage(null);
    setShowHintScaffold(false);
    setHintUsedOnCurrentFact(false);
    questionStartTimeRef.current = Date.now();
  }, [lesson]);

  // Transition to Fluency Sprint "You Do" (Phase 5)
  const startFluencySprint = useCallback(() => {
    setPhase("fluency");
    setPhaseStepIndex(0);
    const allPool = [...lesson.targetFacts, ...lesson.reviewFacts];
    const sprintItems: MathFact[] = [];
    for (let i = 0; i < 6; i++) {
      sprintItems.push(allPool[i % allPool.length]);
    }
    setCurrentQueue(sprintItems);
    setCurrentFact(sprintItems[0]);
    setTypedAnswer("");
    setErrorMessage(null);
    setShowHintScaffold(false);
    setHintUsedOnCurrentFact(false);
    questionStartTimeRef.current = Date.now();
  }, [lesson]);

  // Trigger Checkout Gate Transition Screen
  const triggerTransitionScreen = useCallback(() => {
    setPhase("transition_gate");
    setTypedAnswer("");
    setErrorMessage(null);
  }, []);

  // Actually start Checkout Gate (Phase 6)
  const startCheckoutGate = useCallback(() => {
    setPhase("checkout");
    setPhaseStepIndex(0);
    // Shuffle targetFacts for random gate order on each attempt
    const shuffled = [...lesson.targetFacts].sort(() => Math.random() - 0.5);
    const targets =
      shuffled.length >= 5
        ? shuffled.slice(0, 5)
        : Array.from(
            { length: 5 },
            (_, i) => shuffled[i % shuffled.length]
          );
    setCheckoutFacts(targets);
    setCurrentFact(targets[0]);
    setCheckoutResults([]);
    setTypedAnswer("");
    setErrorMessage(null);
    questionStartTimeRef.current = Date.now();
    soundEffects.playModelChime();
  }, [lesson.targetFacts]);

  // Retry Practice
  const handleRetryLesson = () => {
    startGuidedPractice();
    setCheckoutResults([]);
    setCheckoutFinalScore(null);
    setCurrentStreak(0);
    setCorrectCount(0);
    setTotalAttempts(0);
  };

  // Evaluate Answer Submission
  const evaluateAnswer = useCallback(
    (answerNum: number) => {
      const nowMs = Date.now();
      activeTimerRef.current.recordInteraction(nowMs);
      const activeSecs = activeTimerRef.current.getActiveSeconds(nowMs);
      const { learnerId, accountType, teacherId } = resolveLearnerIdentity();
      const responseTime = nowMs - questionStartTimeRef.current;
      setTotalAttempts((prev) => prev + 1);

      // Phase: "model" Check-for-Understanding Screen (Staged one step at a time!)
      if (phase === "model") {
        const checkSteps = checkExplanation?.checkSteps || [];
        const activeStep = checkSteps[checkStepIndex] || {
          prompt: checkExplanation?.checkQuestion.prompt || "",
          expectedAnswer: checkExplanation?.checkQuestion.expectedAnswer ?? currentFact.product,
          hint: checkExplanation?.checkQuestion.hint || "Correct!",
          visual: checkExplanation?.checkQuestionVisual || { a: currentFact.a, b: currentFact.b },
        };

        const questionId = `L${lesson.id}-model-step-${checkStepIndex + 1}`;
        const attemptNum = (questionAttemptCountRef.current.get(questionId) || 0) + 1;
        questionAttemptCountRef.current.set(questionId, attemptNum);
        const isStepCorrect = answerNum === activeStep.expectedAnswer;

        dispatchAnalyticsEvent({
          type: "answer_submitted",
          eventId: nextEventId("ans"),
          sessionId: sessionIdRef.current,
          learnerId,
          accountType,
          teacherId,
          lessonId: lesson.id,
          stage: "model",
          questionId,
          attemptNumber: attemptNum,
          isCorrect: isStepCorrect,
          activeDurationSeconds: activeSecs,
          timestamp: new Date(nowMs).toISOString(),
        });

        if (isStepCorrect) {
          soundEffects.playCorrect(1);
          setErrorMessage(null);
          setCheckFeedback(activeStep.hint || "Correct!");
          const nextStepIdx = checkStepIndex + 1;
          setTimeout(() => {
            setTypedAnswer("");
            setCheckFeedback(null);
            if (nextStepIdx < checkSteps.length) {
              setCheckStepIndex(nextStepIdx);
              questionStartTimeRef.current = Date.now();
            } else {
              startWarmUpPhase();
            }
          }, 1200);
        } else {
          soundEffects.playIncorrect();
          setCheckFeedback(null);
          setErrorMessage("Not quite — try again!");
          setTypedAnswer(""); // Clear wrong entry automatically
        }
        return;
      }

      // Phase: "checkout" Gate
      if (phase === "checkout") {
        const isCorrect = answerNum === currentFact.product;
        const questionId = `L${lesson.id}-checkout-${phaseStepIndex + 1}-${currentFact.a}x${currentFact.b}`;
        const attemptNum = (questionAttemptCountRef.current.get(questionId) || 0) + 1;
        questionAttemptCountRef.current.set(questionId, attemptNum);

        dispatchAnalyticsEvent({
          type: "answer_submitted",
          eventId: nextEventId("ans"),
          sessionId: sessionIdRef.current,
          learnerId,
          accountType,
          teacherId,
          lessonId: lesson.id,
          stage: "checkout",
          questionId,
          attemptNumber: attemptNum,
          isCorrect,
          activeDurationSeconds: activeSecs,
          timestamp: new Date(nowMs).toISOString(),
        });

        const newResult: CheckoutItemResult = {
          fact: currentFact,
          answerEntered: answerNum,
          isCorrect,
          latencyMs: responseTime,
        };
        const updatedResults = [...checkoutResults, newResult];
        setCheckoutResults(updatedResults);

        if (student) {
          // Gate facts belong to current lesson
          recordFactAnswer(
            student.id,
            currentFact.a,
            currentFact.b,
            "first-try",
            isCorrect,
            responseTime,
            { isWarmUp: false, currentLessonId: lesson.id }
          );
        }

        if (isCorrect) {
          soundEffects.playCorrect(currentStreak + 1);
          setCurrentStreak((prev) => prev + 1);
          setCorrectCount((prev) => prev + 1);
          setFirstTryCorrectCount((prev) => prev + 1);
        } else {
          soundEffects.playIncorrect();
          setCurrentStreak(0);
          const factKey = `${currentFact.a}x${currentFact.b}`;
          setErrorFacts((prev) => (prev.includes(factKey) ? prev : [...prev, factKey]));
          if (student) {
            addToReDrillQueue(student.id, currentFact.a, currentFact.b);
          }
        }

        // After submission in Gate, restate fact + strategy split (never product alone)
        // Keep feedback visible until the student taps Continue!
        const renderedGateFact = renderFact(currentFact, lesson.id);
        setGateFeedback({ rendered: renderedGateFact, isCorrect });
        return;
      }

      // Standard Practice Phases (review, guided, fluency)
      const isCorrect = answerNum === currentFact.product;
      const questionId = `L${lesson.id}-${phase}-${phaseStepIndex + 1}-${currentFact.a}x${currentFact.b}`;
      const rawAttempt = (questionAttemptCountRef.current.get(questionId) || 0) + 1;
      const attemptNum = isErrorCorrecting ? Math.max(2, rawAttempt) : rawAttempt;
      questionAttemptCountRef.current.set(questionId, attemptNum);

      dispatchAnalyticsEvent({
        type: "answer_submitted",
        eventId: nextEventId("ans"),
        sessionId: sessionIdRef.current,
        learnerId,
        accountType,
        teacherId,
        lessonId: lesson.id,
        stage: phase,
        questionId,
        attemptNumber: attemptNum,
        isCorrect,
        activeDurationSeconds: activeSecs,
        timestamp: new Date(nowMs).toISOString(),
      });

      if (isCorrect) {
        const nextStreak = currentStreak + 1;
        setCurrentStreak(nextStreak);
        soundEffects.playCorrect(nextStreak);
        setCorrectCount((prev) => prev + 1);
        if (!isErrorCorrecting && !hintUsedOnCurrentFact) {
          setFirstTryCorrectCount((prev) => prev + 1);
        }
        setErrorMessage(null);

        // Record in student storage with warm-up check to avoid muddying earlier lesson facts
        if (student) {
          const answerType = isErrorCorrecting ? "corrected" : "first-try";
          recordFactAnswer(
            student.id,
            currentFact.a,
            currentFact.b,
            answerType,
            true,
            responseTime,
            { isWarmUp: phase === "review", currentLessonId: lesson.id }
          );
        }

        if (nextStreak === 3) {
          setStreakToast({ tier: "hot", title: "3 In A Row!", emoji: "🔥" });
          setTimeout(() => setStreakToast(null), 1400);
        } else if (nextStreak === 5) {
          setStreakToast({ tier: "supercharged", title: "5 Streak!", emoji: "⚡" });
          setTimeout(() => setStreakToast(null), 1400);
        }

        setIsErrorCorrecting(false);
        setCorrectionExplanation(null);
        setShowHintScaffold(false);
        setHintUsedOnCurrentFact(false);

        // Advance in current queue
        const nextStep = phaseStepIndex + 1;
        if (nextStep < currentQueue.length) {
          setPhaseStepIndex(nextStep);
          setCurrentFact(currentQueue[nextStep]);
          setTypedAnswer("");
          questionStartTimeRef.current = Date.now();
        } else {
          // Completed current phase queue -> advance to next phase!
          if (phase === "review") {
            startGuidedPractice();
          } else if (phase === "guided") {
            startFluencySprint();
          } else if (phase === "fluency") {
            triggerTransitionScreen();
          }
        }
      } else {
        // INCORRECT ANSWER: Direct Instruction Immediate Specific Re-Teaching
        soundEffects.playIncorrect();
        setCurrentStreak(0);
        setStreakToast(null);

        const factKey = `${currentFact.a}x${currentFact.b}`;
        setErrorFacts((prev) => (prev.includes(factKey) ? prev : [...prev, factKey]));

        // Record missed fact in student storage & re-drill queue
        if (student) {
          recordFactAnswer(
            student.id,
            currentFact.a,
            currentFact.b,
            "first-try",
            false,
            responseTime,
            { isWarmUp: phase === "review", currentLessonId: lesson.id }
          );
          addToReDrillQueue(student.id, currentFact.a, currentFact.b);
        }

        // Re-teach THIS exact fact with its own authentic reasoning
        const factExpl = getDynamicRuleExplanation(lesson.id, currentFact.a, currentFact.b);
        setCorrectionExplanation(factExpl);
        setIsErrorCorrecting(true);

        // Re-present this fact later in current queue
        setCurrentQueue((prev) => [...prev, currentFact]);

        // Auto-clear wrong entry
        setTypedAnswer("");
        setErrorMessage(
          `Review the rule: ${currentFact.a} × ${currentFact.b} = ${currentFact.product}.`
        );
      }
    },
    [
      checkExplanation,
      checkStepIndex,
      checkoutFacts,
      checkoutResults,
      currentFact,
      currentQueue,
      currentStreak,
      hintUsedOnCurrentFact,
      isErrorCorrecting,
      lesson.id,
      nextEventId,
      phase,
      phaseStepIndex,
      resolveLearnerIdentity,
      startFluencySprint,
      startGuidedPractice,
      startWarmUpPhase,
      student,
      triggerTransitionScreen,
    ]
  );

  // Advance from Checkout Gate feedback when student taps Continue
  const handleContinueFromGateFeedback = useCallback(() => {
    if (!gateFeedback) return;
    setGateFeedback(null);
    const nextIndex = phaseStepIndex + 1;
    if (nextIndex < checkoutFacts.length) {
      setPhaseStepIndex(nextIndex);
      setCurrentFact(checkoutFacts[nextIndex]);
      setTypedAnswer("");
      setErrorMessage(null);
      questionStartTimeRef.current = Date.now();
    } else {
      // Checkout complete! Gate pass decided by accuracy first (4+/5 or >=80%)
      const totalItems = Math.max(1, checkoutResults.length);
      const correctNum = checkoutResults.filter((r) => r.isCorrect).length;
      const avgLatency = Math.round(
        checkoutResults.reduce((sum, r) => sum + r.latencyMs, 0) / totalItems
      );

      const isMastered = correctNum >= 4; // 4/5 or 5/5
      const speedMet = avgLatency <= 3500;
      const stars: 1 | 2 | 3 = isMastered ? 3 : correctNum / totalItems >= 0.75 ? 2 : 1;

      setCheckoutFinalScore({
        correct: correctNum,
        total: checkoutResults.length,
        averageLatencyMs: avgLatency,
        passed: isMastered,
        speedGoalMet: speedMet,
        starsEarned: stars,
      });

      if (isMastered) {
        soundEffects.playFanfare();
      } else {
        soundEffects.playIncorrect();
      }

      setPhase("complete");
    }
  }, [checkoutFacts, checkoutResults, gateFeedback, phaseStepIndex]);

  // P0: Handle input changes with 400ms Visible Second-Digit Pause & Double-Tap Buffer
  const handleAnswerInput = useCallback(
    (rawVal: string) => {
      // Ignore any taps/keys arriving during advance pause, cooldown, or Checkout Gate feedback
      if (isAdvancingRef.current || Boolean(gateFeedback)) return;

      const sanitized = rawVal.replace(/[^0-9]/g, "").slice(0, 2);
      setErrorMessage(null);
      setTypedAnswer(sanitized);

      if (sanitized.length === 0) return;

      const num = parseInt(sanitized, 10);
      const targetExpected =
        phase === "model"
          ? (checkExplanation?.checkSteps?.[checkStepIndex]?.expectedAnswer ??
            checkExplanation?.checkQuestion.expectedAnswer ??
            currentFact.product)
          : currentFact.product;

      const isTargetSingleDigit = targetExpected < 10;

      // Completion check:
      // Single-digit target: completes if 1 digit matches, OR if 2 digits entered
      // Two-digit target: STRICTLY requires 2 digits. Never evaluates on first digit!
      const isCompleteAnswer =
        (isTargetSingleDigit && sanitized.length === 1 && num === targetExpected) ||
        sanitized.length === 2;

      if (isCompleteAnswer) {
        // Freeze input immediately to ignore further taps and prevent double-tap pollution
        isAdvancingRef.current = true;
        setIsAdvancing(true);

        // Clear any existing timer
        if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
        if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);

        // 400ms visible pause: both digits stay together on screen
        advanceTimeoutRef.current = setTimeout(() => {
          evaluateAnswer(num);

          // 150ms cooldown post-evaluation: absorbs trailing taps before next problem is mounted
          cooldownTimeoutRef.current = setTimeout(() => {
            isAdvancingRef.current = false;
            setIsAdvancing(false);
          }, 150);
        }, 400);
      }
    },
    [checkExplanation, checkStepIndex, currentFact.product, evaluateAnswer, gateFeedback, phase]
  );

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "complete" || isPaused || showExitConfirm) return;
      if (isAdvancingRef.current || Boolean(gateFeedback)) {
        e.preventDefault();
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        if (typedAnswer.length < 2) {
          handleAnswerInput(typedAnswer + e.key);
        }
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setTypedAnswer((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (typedAnswer.length > 0 && !isAdvancingRef.current) {
          const num = parseInt(typedAnswer, 10);
          isAdvancingRef.current = true;
          setIsAdvancing(true);
          setTimeout(() => {
            evaluateAnswer(num);
            setTimeout(() => {
              isAdvancingRef.current = false;
              setIsAdvancing(false);
            }, 150);
          }, 400);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [evaluateAnswer, gateFeedback, handleAnswerInput, isPaused, phase, showExitConfirm, typedAnswer]);

  // Wrap up lesson and save attempt
  const handleFinishLesson = () => {
    const duration = elapsedSeconds;
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100;
    const isMastered = checkoutFinalScore ? checkoutFinalScore.passed : accuracy >= 80;
    const stars: 1 | 2 | 3 = isMastered ? 3 : accuracy >= 75 ? 2 : 1;

    onLessonComplete({
      lessonId: lesson.id,
      durationSeconds: duration,
      accuracyPercent: accuracy,
      totalQuestions: totalAttempts,
      correctCount,
      errorFacts,
      starsEarned: stars,
      checkoutPassed: isMastered,
      checkoutScore: checkoutFinalScore
        ? {
            correct: checkoutFinalScore.correct,
            total: checkoutFinalScore.total,
            averageLatencyMs: checkoutFinalScore.averageLatencyMs,
          }
        : undefined,
    });
  };

  const handleRequestExit = () => {
    if (phase === "complete") {
      onExit();
    } else {
      setShowExitConfirm(true);
    }
  };

  // Current fact explanation & strategy-follows-fact view
  // Review facts always resolve their own lesson's strategy (never borrowing the current lesson's banner)
  const effectiveLessonForFact = phase === "review" ? undefined : lesson.id;
  const currentFactExpl = getDynamicRuleExplanation(
    effectiveLessonForFact ?? currentFact.a,
    currentFact.a,
    currentFact.b
  );
  const currentRenderedFact = renderFact(currentFact, effectiveLessonForFact);
  const activeCheckStep = checkExplanation?.checkSteps?.[checkStepIndex] || {
    prompt: checkExplanation?.checkQuestion.prompt || "",
    expectedAnswer: checkExplanation?.checkQuestion.expectedAnswer ?? currentFact.product,
    hint: checkExplanation?.checkQuestion.hint || "",
    visual: checkExplanation?.checkQuestionVisual || { a: currentFact.a, b: currentFact.b },
  };

  const hasKeypad =
    phase !== "complete" && phase !== "strategy_intro" && phase !== "transition_gate";

  return (
    <div
      className={`w-full min-h-[calc(100dvh-56px)] flex flex-col justify-start gap-2.5 p-2 sm:p-3 px-safe select-none relative overflow-y-auto overflow-x-hidden pb-safe ${
        fontSize === "large" ? "text-lg" : "text-base"
      }`}
    >
      {/* Streak Toast */}
      <AnimatePresence>
        {streakToast && (
          <motion.div
            initial={{ scale: 0.5, y: -20, opacity: 0 }}
            animate={{ scale: [1, 1.1, 1], y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full border border-amber-400 bg-amber-950/95 text-amber-200 text-xs font-black shadow-2xl flex items-center gap-1.5 backdrop-blur-xl pointer-events-none"
          >
            <span>{streakToast.emoji}</span>
            <span>{streakToast.title}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER: PROGRESS, TIMER & CONTROLS (Normal vertical flow; full-width title row on narrow screens, wrapping controls row below) */}
      <div className="w-full max-w-lg landscape:max-w-4xl md:max-w-4xl mx-auto flex flex-col gap-2 shrink-0 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
          {/* Row 1 on narrow screens: Full-width Lesson Title and Stage Label */}
          <div className="w-full sm:w-auto flex items-start sm:items-center gap-2 min-w-0">
            <span className="text-base sm:text-lg shrink-0 leading-none mt-0.5 sm:mt-0">{lesson.icon}</span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-black text-white leading-snug break-words whitespace-normal">
                {lesson.id === 4 ? "Lesson 4 · Multiply by 3" : lesson.title}
              </span>
              <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider leading-tight">
                {phase === "strategy_intro"
                  ? "Strategy Overview"
                  : phase === "model"
                  ? "Check: Strategy Step"
                  : phase === "review"
                  ? "Practice: Warm-Up"
                  : phase === "guided"
                  ? "Practice: We Do"
                  : phase === "fluency"
                  ? "Practice: Sprint"
                  : phase === "transition_gate"
                  ? "Gate Transition"
                  : phase === "checkout"
                  ? "Checkout Gate"
                  : (checkoutFinalScore?.passed ? "Complete" : "Needs More Practice")}
              </span>
            </div>
          </div>

          {/* Row 2 on narrow screens: Audio, Text, Timer, and Menu in a separate wrapping row */}
          <div className="w-full sm:w-auto flex flex-wrap items-center justify-start sm:justify-end gap-1.5 shrink-0">
            <button
              onClick={() => {
                if (phase === "strategy_intro") {
                  if (lesson.id === 2) {
                    speak(
                      "Multiply by 2: Double the Other Number. 2 times 3 equals 6. Two groups of 3. Double 3: 3 plus 3 equals 6. Two 3-point baskets score 6 points."
                    );
                  } else if (lesson.id === 3) {
                    speak(
                      "Multiply by 5: Count by 5s. 5 times 3 equals 15. Count by 5s three times. 5 times 3 equals 3 times 5. We can use three groups of 5. 5, 10, 15. 5 plus 5 plus 5 equals 15. Three counts of 5 make 15."
                    );
                  } else if (lesson.id === 4) {
                    speak(
                      "Double, then add one more group. 3 times 4. Three groups of 4. Double 4: 4 plus 4 equals 8. Add one more group of 4: 8 plus 4 equals 12. 3 times 4 equals 12."
                    );
                  } else {
                    speak(checkExplanation?.strategyOverview || lesson.ruleSummary);
                  }
                } else if (isErrorCorrecting && correctionExplanation) {
                  speak(correctionExplanation.strategyOverview);
                } else {
                  speak(`What is ${currentFact.a} times ${currentFact.b}?`);
                }
              }}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Read aloud"
            >
              <Volume2 className={`w-4 h-4 ${isReadingAloud ? "text-cyan-400 animate-pulse" : ""}`} />
            </button>

            <button
              onClick={() => setFontSize((prev) => (prev === "normal" ? "large" : "normal"))}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer font-bold text-xs"
              title="Toggle font size"
            >
              <Type className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPaused((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs font-bold text-cyan-300 cursor-pointer"
              title={isPaused ? "Resume lesson" : "Pause lesson"}
            >
              {isPaused ? <Play className="w-3 h-3 text-amber-400" /> : <Pause className="w-3 h-3 text-cyan-400" />}
              <span>{formatElapsed(elapsedSeconds)}</span>
            </button>

            <button
              onClick={handleRequestExit}
              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold cursor-pointer"
            >
              Menu
            </button>
          </div>
        </div>

        {/* Phase Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-300"
            style={{
              width:
                phase === "strategy_intro"
                  ? "10%"
                  : phase === "model"
                  ? "25%"
                  : phase === "review"
                  ? "45%"
                  : phase === "guided"
                  ? "65%"
                  : phase === "fluency"
                  ? "85%"
                  : phase === "checkout"
                  ? "95%"
                  : "100%",
            }}
          />
        </div>

        {/* PERSISTENT VISIBLE STRATEGY HEADER (Hidden during Strategy Intro, Check, Transition, Complete, and bare Gate while answering to prevent duplicate banners) */}
        {phase !== "strategy_intro" &&
          phase !== "model" &&
          phase !== "transition_gate" &&
          phase !== "complete" &&
          (phase !== "checkout" || Boolean(gateFeedback)) && (
          <div className="w-full px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-[11px] font-bold text-cyan-200 shadow-sm shrink-0">
            <span className="leading-snug break-words whitespace-normal">
              {phase === "review" ? (
                <>
                  <span className="text-amber-400 uppercase font-black tracking-wider text-[10px]">Warm-Up Review: </span>
                  {currentRenderedFact.strategyName} ({currentRenderedFact.steps.map((s) => s.label).join(" → ")})
                </>
              ) : (
                <>
                  <span className="text-cyan-400 uppercase font-black tracking-wider text-[10px]">Strategy: </span>
                  {currentRenderedFact.strategyName} — {currentRenderedFact.steps.map((s) => `${s.label} (${s.expression})`).join(", then ")}
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* MAIN BODY: Normal vertical flow in portrait; side-by-side 2-column layout in landscape/tablet when keypad is active */}
      <div
        className={`w-full ${
          hasKeypad
            ? "max-w-lg landscape:max-w-4xl md:max-w-4xl flex flex-col landscape:flex-row md:flex-row items-stretch landscape:items-start md:items-start justify-center gap-3 sm:gap-4"
            : "max-w-lg landscape:max-w-2xl md:max-w-2xl flex flex-col justify-start gap-2.5"
        } mx-auto pt-0.5`}
      >
      {/* WORKSPACE CONTENT AREA */}
      <div className="w-full flex-1 min-w-0 flex flex-col justify-start gap-2.5">
        {/* PHASE 1: STRATEGY OVERVIEW */}
        {phase === "strategy_intro" && checkExplanation ? (
          lesson.id === 2 ? (
            /* LESSON 2 (×2) STRATEGY OVERVIEW: Mature, Clear, Uncluttered Sequential Demonstration */
            <div className="w-full rounded-2xl bg-gradient-to-b from-white/[0.06] to-black/75 border-2 border-cyan-500/40 p-4 sm:p-5 flex flex-col items-center gap-3 text-center shadow-2xl">
              {/* 1. Single Main Heading */}
              <h1 className="text-base sm:text-lg font-black text-cyan-300 tracking-tight">
                Multiply by 2: Double the Other Number
              </h1>

              {/* 2. Large Equation: 2 × 3 = 6 (space reserved for "= 6") */}
              <div
                className="inline-flex items-center justify-center font-mono font-black text-4xl sm:text-5xl tracking-tight py-0.5"
                aria-label="2 times 3 equals 6"
              >
                <span className="text-sky-300">2</span>
                <span className="text-slate-300 mx-2.5 text-3xl sm:text-4xl font-bold">×</span>
                <span className="text-purple-300">3</span>
                <span
                  className={`inline-flex items-center transition-opacity duration-300 ${
                    doubleIntroStage >= 4 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="text-slate-300 mx-2.5 text-3xl sm:text-4xl font-bold">=</span>
                  <span className="text-amber-300">6</span>
                </span>
              </div>

              {/* 3. Two Distinct Groups of Three Dots (HTML/CSS circles, subtle cyan outline, purple dots & labels) */}
              <div
                role="img"
                aria-label="Two groups with three dots in each group, making six dots altogether."
                className="grid grid-cols-2 gap-3 w-full max-w-xs mx-auto"
              >
                {/* Group 1 */}
                <div
                  aria-hidden="true"
                  className={`rounded-xl border border-cyan-400/40 bg-cyan-950/20 px-4 py-3 flex flex-col items-center justify-center gap-2 transition-opacity duration-300 ${
                    doubleIntroStage >= 1 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="flex flex-row items-center justify-center gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-purple-400 shadow-sm" />
                    <span className="w-4 h-4 rounded-full bg-purple-400 shadow-sm" />
                    <span className="w-4 h-4 rounded-full bg-purple-400 shadow-sm" />
                  </div>
                  <span className="text-purple-300 font-mono font-black text-sm leading-none">
                    3
                  </span>
                </div>

                {/* Group 2 */}
                <div
                  aria-hidden="true"
                  className={`rounded-xl border border-cyan-400/40 bg-cyan-950/20 px-4 py-3 flex flex-col items-center justify-center gap-2 transition-opacity duration-300 ${
                    doubleIntroStage >= 2 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="flex flex-row items-center justify-center gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-purple-400 shadow-sm" />
                    <span className="w-4 h-4 rounded-full bg-purple-400 shadow-sm" />
                    <span className="w-4 h-4 rounded-full bg-purple-400 shadow-sm" />
                  </div>
                  <span className="text-purple-300 font-mono font-black text-sm leading-none">
                    3
                  </span>
                </div>
              </div>

              {/* 4. Below the groups: "Two groups of 3.", "Double 3:", and "3 + 3 = 6" */}
              <div className="flex flex-col items-center gap-1.5 w-full">
                <p
                  className={`text-sm sm:text-base font-bold text-slate-200 transition-opacity duration-300 ${
                    doubleIntroStage >= 2 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="text-sky-300 font-black">Two</span> groups of{" "}
                  <span className="text-purple-300 font-mono font-black">3</span>.
                </p>

                <div
                  className={`flex flex-col items-center gap-0.5 transition-opacity duration-300 ${
                    doubleIntroStage >= 3 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-300">
                    Double <span className="text-purple-300 font-mono font-black">3</span>:
                  </span>
                  <div
                    className="inline-flex items-center justify-center font-mono font-black text-2xl sm:text-3xl tracking-tight"
                    aria-label="3 plus 3 equals 6"
                  >
                    <span className="text-purple-300">3</span>
                    <span className="text-slate-300 mx-2 font-bold">+</span>
                    <span className="text-purple-300">3</span>
                    <span
                      className={`inline-flex items-center transition-opacity duration-300 ${
                        doubleIntroStage >= 4 ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <span className="text-slate-300 mx-2 font-bold">=</span>
                      <span className="text-amber-300">6</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Short Context Sentence */}
              <p
                className={`text-xs sm:text-sm text-slate-300 font-medium px-3 py-1.5 rounded-xl bg-cyan-950/30 border border-cyan-500/25 w-full transition-opacity duration-300 ${
                  doubleIntroStage >= 4 ? "opacity-100" : "opacity-0"
                }`}
              >
                Two 3-point baskets score 6 points.
              </p>

              {/* 6. Replay & Try One Controls (>= 44x44px touch targets) */}
              <div className="flex items-center gap-2.5 w-full pt-1">
                <button
                  type="button"
                  onClick={startDoubleIntroAnimation}
                  className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
                >
                  <RotateCcw className="w-4 h-4 text-cyan-300" />
                  <span>Replay</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartModelCheck}
                  className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  <span>Try One</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>
          ) : lesson.id === 3 ? (
            /* LESSON 3 (×5) STRATEGY OVERVIEW: Simplified Sequential Demonstration with 5-on-a-Die Dot Groups & Running Totals */
            <div className="w-full rounded-2xl bg-gradient-to-b from-white/[0.06] to-black/75 border-2 border-cyan-500/40 p-3.5 sm:p-5 flex flex-col items-center gap-2.5 text-center shadow-2xl">
              {/* 1. Single Main Heading */}
              <h1 className="text-base sm:text-lg font-black text-cyan-300 tracking-tight">
                Multiply by 5: Count by 5s
              </h1>

              {/* 2. Main Equation: 5 × 3 = 15 (space reserved for "= 15" until stage 5) */}
              <div
                className="inline-flex items-center justify-center font-mono font-black text-4xl sm:text-5xl tracking-tight"
                aria-label="5 times 3 equals 15"
              >
                <span className="text-sky-300">5</span>
                <span className="text-slate-300 mx-2.5 text-3xl sm:text-4xl font-bold">×</span>
                <span className="text-purple-300">3</span>
                <span
                  className={`inline-flex items-center transition-opacity duration-300 ${
                    fivesIntroStage >= 5 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="text-slate-300 mx-2.5 text-3xl sm:text-4xl font-bold">=</span>
                  <span className="text-amber-300">15</span>
                </span>
              </div>

              {/* 3. Brief Explanation & Mathematical Consistency Bridge */}
              <div className="flex flex-col items-center gap-0.5">
                <p className="text-sm sm:text-base font-bold text-slate-100">
                  Count by <span className="text-sky-300 font-mono font-black">5</span>s{" "}
                  <span className="text-purple-300 font-black">three</span> times.
                </p>
                <p className="text-xs text-slate-300 font-medium">
                  <span className="text-sky-300 font-mono font-bold">5</span>
                  <span className="text-slate-300 mx-1">×</span>
                  <span className="text-purple-300 font-mono font-bold">3</span>
                  <span className="text-slate-300 mx-1">=</span>
                  <span className="text-purple-300 font-mono font-bold">3</span>
                  <span className="text-slate-300 mx-1">×</span>
                  <span className="text-sky-300 font-mono font-bold">5</span>. We can use{" "}
                  <span className="text-purple-300 font-bold">three groups</span> of{" "}
                  <span className="text-sky-300 font-mono font-bold">5</span>.
                </p>
              </div>

              {/* 4. Three Groups of Five Dots (5-on-a-die layout) + Running Total Row */}
              <div
                role="img"
                aria-label="Three groups of five dots. Counting by fives gives five, ten, fifteen."
                className="w-full max-w-xs mx-auto flex flex-col items-center gap-1.5"
              >
                {/* "3 groups" label in purple above diagram */}
                <span
                  aria-hidden="true"
                  className="text-xs font-black uppercase tracking-wider text-purple-300"
                >
                  3 groups
                </span>

                {/* Three side-by-side 5-dot die groups */}
                <div aria-hidden="true" className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
                  {[1, 2, 3].map((groupIndex) => (
                    <div
                      key={groupIndex}
                      className={`rounded-xl border border-cyan-400/40 bg-cyan-950/20 py-2.5 px-2 flex flex-col items-center justify-center transition-opacity duration-300 ${
                        fivesIntroStage >= groupIndex ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {/* 5-on-a-die HTML/CSS dot arrangement */}
                      <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-11 h-11 p-0.5 items-center justify-items-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm col-start-1 row-start-1" />
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm col-start-3 row-start-1" />
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm col-start-2 row-start-2" />
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm col-start-1 row-start-3" />
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm col-start-3 row-start-3" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Running Total Row */}
                <div aria-hidden="true" className="w-full flex flex-col items-center gap-0.5 pt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Running total
                  </span>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full text-center font-mono font-black text-lg sm:text-xl">
                    <span
                      className={`text-white transition-opacity duration-300 ${
                        fivesIntroStage >= 1 ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      5
                    </span>
                    <span
                      className={`text-white transition-opacity duration-300 ${
                        fivesIntroStage >= 2 ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      10
                    </span>
                    <span
                      className={`text-amber-300 transition-opacity duration-300 ${
                        fivesIntroStage >= 3 ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      15
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Repeated Addition & Conclusion ("5 + 5 + 5 = 15" and "Three counts of 5 make 15.") */}
              <div
                className={`flex flex-col items-center gap-1 transition-opacity duration-300 ${
                  fivesIntroStage >= 4 ? "opacity-100" : "opacity-0"
                }`}
              >
                <div
                  className="inline-flex items-center justify-center font-mono font-black text-xl sm:text-2xl tracking-tight"
                  aria-label="5 plus 5 plus 5 equals 15"
                >
                  <span className="text-sky-300">5</span>
                  <span className="text-slate-300 mx-1.5 font-bold">+</span>
                  <span className="text-sky-300">5</span>
                  <span className="text-slate-300 mx-1.5 font-bold">+</span>
                  <span className="text-sky-300">5</span>
                  <span className="text-slate-300 mx-1.5 font-bold">=</span>
                  <span className="text-amber-300">15</span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-slate-200">
                  <span className="text-purple-300 font-black">Three</span> counts of{" "}
                  <span className="text-sky-300 font-mono font-black">5</span> make{" "}
                  <span className="text-amber-300 font-mono font-black">15</span>.
                </p>
              </div>

              {/* 6. Replay & Try One Controls (>= 44x44px touch targets) */}
              <div className="flex items-center gap-2.5 w-full pt-0.5">
                <button
                  type="button"
                  onClick={startFivesIntroAnimation}
                  className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
                >
                  <RotateCcw className="w-4 h-4 text-cyan-300" />
                  <span>Replay</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartModelCheck}
                  className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  <span>Try One</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>
          ) : lesson.id === 4 ? (
            /* LESSON 4 (×3) STRATEGY OVERVIEW: "Double, then add one more group" with Staged Animation & Pause on 8 */
            <div className="w-full rounded-2xl bg-gradient-to-b from-white/[0.06] to-black/75 border-2 border-cyan-500/40 p-3.5 sm:p-5 flex flex-col items-center gap-2.5 text-center shadow-2xl">
              {/* 1. Teaching Card Title */}
              <h1 className="text-base sm:text-lg font-black text-cyan-300 tracking-tight">
                Double, then add one more group
              </h1>

              {/* 2. Main Equation "3 × 4" above "Three groups of 4." (space reserved for "= 12" until Stage 4) */}
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className="inline-flex items-center justify-center font-mono font-black text-4xl sm:text-5xl tracking-tight"
                  aria-label="3 times 4 equals 12"
                >
                  <span className="text-sky-300">3</span>
                  <span className="text-slate-300 mx-2.5 text-3xl sm:text-4xl font-bold">×</span>
                  <span className="text-purple-300">4</span>
                  <span
                    className={`inline-flex items-center transition-opacity duration-300 ${
                      threesIntroStage >= 4 ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <span className="text-slate-300 mx-2.5 text-3xl sm:text-4xl font-bold">=</span>
                    <span className="text-amber-300">12</span>
                  </span>
                </div>

                <p className="text-sm sm:text-base font-bold text-slate-200">
                  <span className="text-sky-300 font-black">Three</span> groups of{" "}
                  <span className="text-purple-300 font-mono font-black">4</span>.
                </p>
              </div>

              {/* 3. Three Groups of Four Purple Dots (First 2 groups revealed at Stage 1, 3rd group reserved & revealed at Stage 3) */}
              <div
                role="img"
                aria-label="Three groups of four purple dots. Two groups make 8, and one more group of 4 makes 12."
                className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-xs mx-auto"
              >
                {[1, 2, 3].map((groupIdx) => {
                  const isVisible =
                    groupIdx <= 2 ? threesIntroStage >= 1 : threesIntroStage >= 3;
                  return (
                    <div
                      key={groupIdx}
                      aria-hidden="true"
                      className={`rounded-xl border border-cyan-400/40 bg-cyan-950/20 py-2.5 px-2 flex flex-col items-center justify-center gap-1.5 transition-opacity duration-300 ${
                        isVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-2 p-0.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-purple-400 shadow-sm" />
                        <span className="w-3.5 h-3.5 rounded-full bg-purple-400 shadow-sm" />
                        <span className="w-3.5 h-3.5 rounded-full bg-purple-400 shadow-sm" />
                        <span className="w-3.5 h-3.5 rounded-full bg-purple-400 shadow-sm" />
                      </div>
                      <span className="text-purple-300 font-mono font-black text-xs leading-none">
                        4
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 4. Worked Example Steps (Space reserved so layout stays completely still) */}
              <div className="w-full max-w-xs mx-auto flex flex-col gap-2">
                {/* Step 1: Show "Double 4" and "4 + 4 = 8" at Stage 2, then pause so students see the first two groups make 8 */}
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-xl bg-black/50 border border-white/10 transition-opacity duration-300 ${
                    threesIntroStage >= 2 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-200">
                    Double <span className="text-purple-300 font-mono font-black">4</span>
                  </span>
                  <span className="inline-flex items-center font-mono font-black text-base sm:text-lg">
                    <span className="text-purple-300">4</span>
                    <span className="text-slate-300 mx-1.5 font-bold">+</span>
                    <span className="text-purple-300">4</span>
                    <span className="text-slate-300 mx-1.5 font-bold">=</span>
                    <span className="text-white">8</span>
                  </span>
                </div>

                {/* Step 2: Show "Add one more group of 4" and "8 + 4 = 12" at Stage 3 */}
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-xl bg-black/50 border border-white/10 transition-opacity duration-300 ${
                    threesIntroStage >= 3 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-200 text-left">
                    Add one more group of{" "}
                    <span className="text-purple-300 font-mono font-black">4</span>
                  </span>
                  <span className="inline-flex items-center font-mono font-black text-base sm:text-lg shrink-0">
                    <span className="text-white">8</span>
                    <span className="text-slate-300 mx-1.5 font-bold">+</span>
                    <span className="text-purple-300">4</span>
                    <span className="text-slate-300 mx-1.5 font-bold">=</span>
                    <span className="text-amber-300">12</span>
                  </span>
                </div>
              </div>

              {/* 5. Replay & Try One Controls (>= 44x44px touch targets) */}
              <div className="flex items-center gap-2.5 w-full pt-0.5">
                <button
                  type="button"
                  onClick={startThreesIntroAnimation}
                  className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
                >
                  <RotateCcw className="w-4 h-4 text-cyan-300" />
                  <span>Replay</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartModelCheck}
                  className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  <span>Try One</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-2xl bg-gradient-to-b from-white/[0.06] to-black/70 border border-white/15 p-3.5 flex flex-col gap-2.5 text-left"
            >
              {/* Headline Math Fact Banner */}
              <HeadlineMathFactBanner
                a={currentFact.a}
                b={currentFact.b}
                product={currentFact.product}
                label={checkExplanation.ruleName}
                strategyName={lesson.id === 3 || lesson.id === 4 ? undefined : checkExplanation.ruleName}
                strategyText={checkExplanation.strategyOverview}
                repeatedAddition={
                  lesson.id === 3 || lesson.id === 4 ? undefined : checkExplanation.repeatedAddition
                }
              />

              {/* Context Lead-In (Only rendered when non-empty; omitted in Lesson 3 ×5 & Lesson 4 ×3) */}
              {checkExplanation.contextLeadIn && (
                <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200">
                  <span className="font-bold text-cyan-300">Context: </span>
                  {checkExplanation.contextLeadIn}
                </div>
              )}

              {/* Worked Example Steps (Omitted in Lesson 3 ×5 & Lesson 4 ×3 where the full worked sequence is in the main explanation) */}
              {lesson.id !== 3 && lesson.id !== 4 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                    Worked Example Steps:
                  </span>
                  {checkExplanation.steps.slice(0, 2).map((st) => (
                    <div
                      key={st.stepNumber}
                      className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-lg bg-black/40 border border-white/10 text-xs"
                    >
                      <span className="font-bold text-white/80 text-[11px]">
                        Step {st.stepNumber}: {st.label}
                      </span>
                      <FormattedEquation
                        mathString={st.math}
                        factorA={currentFact.a}
                        factorB={currentFact.b}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleStartModelCheck}
                className="w-full min-h-[44px] h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <span>Continue to Check</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </motion.div>
          )
        ) : phase === "model" && checkExplanation ? (
          /* PHASE 2: "I DO" CHECK-FOR-UNDERSTANDING (Grows naturally with content; separate blocks for prompt, group diagram, and answer field) */
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl bg-white/[0.04] border border-white/15 p-3.5 sm:p-4 flex flex-col items-center gap-3 text-center"
          >
            {/* 1. Fact Badge (above) & Question (below) as separate elements */}
            <div
              key={`check-prompt-${lesson.id}-${currentFact.a}x${currentFact.b}-${checkStepIndex}`}
              className="px-3.5 py-3 rounded-2xl bg-purple-950/50 border-2 border-purple-500/45 text-purple-100 text-xs sm:text-sm font-bold w-full leading-relaxed shadow-inner"
            >
              <HighlightedStrategyText
                text={activeCheckStep.prompt}
                factorA={currentFact.a}
                factorB={currentFact.b}
                product={currentFact.product}
              />
            </div>

            {/* 2. Groups Visual Block (Grows with content; no clipping at larger text sizes) */}
            <div
              key={`check-visual-${lesson.id}-${activeCheckStep.visual.a}x${activeCheckStep.visual.b}-${checkStepIndex}`}
              className="w-full"
            >
              <FactVisualizer
                factorA={activeCheckStep.visual.a}
                factorB={activeCheckStep.visual.b}
                showAnswer={false}
                compact={true}
                hideAdditionBar={true}
                blinkGroupsOnce={activeCheckStep.visual.a === 2}
              />
            </div>

            {/* 3. Answer Field & Feedback Block */}
            <div
              key={`check-answer-${lesson.id}-${checkStepIndex}`}
              className="animate-answer-box w-full flex flex-col items-center gap-2 pt-0.5"
            >
              <div
                className={`min-w-[4.5rem] h-12 px-4 rounded-xl border-2 flex items-center justify-center font-mono font-black text-2xl tracking-tight transition-all ${
                  errorMessage
                    ? "bg-rose-950/70 border-rose-500 text-rose-300"
                    : checkFeedback
                    ? "bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    : "bg-black/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                }`}
              >
                {typedAnswer || "?"}
              </div>

              {/* Post-submission feedback (shown ONLY after learner submits an answer) */}
              {checkFeedback && (
                <span className="text-xs sm:text-sm text-emerald-300 font-bold px-2 leading-snug">
                  {checkFeedback}
                </span>
              )}
              {errorMessage && (
                <span className="text-xs sm:text-sm text-rose-300 font-bold px-2 leading-snug">
                  {errorMessage}
                </span>
              )}
            </div>
          </motion.div>
        ) : phase === "transition_gate" ? (
          /* TRANSITION SCREEN BEFORE CHECKOUT GATE */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full rounded-2xl bg-gradient-to-b from-rose-950/40 to-black/60 border-2 border-rose-500/40 p-5 flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Target className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-black text-white">Next: Checkout Gate</h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-sm">
                Next: no groups shown. You are on your own for 5 problems.
              </p>
              <span className="text-[11px] text-amber-300 font-bold pt-1">
                Accuracy Goal: 4+ out of 5 (80%+) to pass • Speed Target: under 3.5s per fact (badge/label, not blocker)
              </span>
            </div>

            <button
              onClick={startCheckoutGate}
              className="w-full max-w-xs h-11 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              <span>Start Checkout Gate</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </motion.div>
        ) : phase === "complete" ? (
          /* LESSON COMPLETE / MASTERY SCREEN */
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full rounded-2xl bg-white/[0.04] border border-white/15 p-4 flex flex-col items-center text-center gap-3"
          >
            {checkoutFinalScore?.passed ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30">
                  🏆
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase mx-auto">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Lesson Mastered!</span>
                  </div>
                  <h2 className="text-xl font-black text-white">{lesson.title}</h2>
                  <span className="text-xs text-white/60">Passed accuracy requirement with flying colors!</span>
                </div>

                {/* Score, Speed & XP Badges */}
                <div className="grid grid-cols-3 gap-2 w-full pt-1">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-lg font-black text-emerald-400">
                      {checkoutFinalScore.correct}/{checkoutFinalScore.total}
                    </span>
                    <span className="text-[10px] text-white/50 font-bold uppercase">Accuracy</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-lg font-black text-cyan-400">
                      {(checkoutFinalScore.averageLatencyMs / 1000).toFixed(1)}s
                    </span>
                    <span className="text-[10px] text-white/50 font-bold uppercase">
                      {checkoutFinalScore.speedGoalMet ? "⚡ Speed Target" : "Developing"}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col">
                    <span className="text-lg font-black text-purple-300">
                      +{checkoutFinalScore.starsEarned * 50 + checkoutFinalScore.correct * 5 + 150}
                    </span>
                    <span className="text-[10px] text-white/50 font-bold uppercase">XP Earned</span>
                  </div>
                </div>

                {/* Gate Review: Restates each fact + strategy split (never product alone) */}
                <div className="w-full flex flex-col gap-1.5 pt-1 max-h-[160px] overflow-y-auto">
                  {checkoutResults.map((r, i) => {
                    const rf = renderFact(r.fact, lesson.id);
                    return (
                      <div
                        key={i}
                        className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <FormattedMathFact
                          a={r.fact.a}
                          b={r.fact.b}
                          product={r.fact.product}
                          size="sm"
                        />
                        <span className="text-[10px] text-cyan-300 font-bold truncate">
                          {rf.strategyName}: {rf.steps.map((s) => s.expression).join(" → ")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleFinishLesson}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <span>Save & Return to Dashboard</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-2xl shadow-lg shadow-rose-500/30">
                  💪
                </div>
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-lg font-black text-white">Needs More Practice</h2>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Score: {checkoutFinalScore?.correct || 0}/5. Direct instruction requires 4+ out of 5 to master this lesson.
                  </p>
                  <span className="text-xs font-bold text-purple-300 pt-1">
                    +{(checkoutFinalScore?.starsEarned || 1) * 20 + (checkoutFinalScore?.correct || 0) * 3} XP Earned
                  </span>
                </div>

                <div className="flex flex-col gap-2 w-full pt-1">
                  <button
                    onClick={handleRetryLesson}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Practice Again</span>
                  </button>
                  <button
                    onClick={handleFinishLesson}
                    className="w-full h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold cursor-pointer"
                  >
                    Save Practice & Return
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          /* STANDARD LESSON DRILL: REVIEW (WARM-UP), GUIDED (WE DO), FLUENCY, OR CHECKOUT */
          <div className="w-full flex flex-col items-center gap-2.5">
            {/* In Checkout Gate, show explicit pass rule and label repeats */}
            {phase === "checkout" && (
              <div className="flex flex-wrap items-center justify-between gap-1.5 w-full px-2 text-[10px] text-amber-300/90 font-bold">
                <span>Pass Rule: 4+ of 5 correct (80%+)</span>
                {checkoutFacts
                  .slice(0, phaseStepIndex)
                  .some((f) => f.a === currentFact.a && f.b === currentFact.b) && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px]">
                    Repeat: {currentFact.a} × {currentFact.b} again
                  </span>
                )}
                <span className="text-white/40">Target: &lt; 3.5s (badge)</span>
              </div>
            )}

            {/* In "Warm-Up Review" (review), show the review fact's OWN strategy (never borrowing the current lesson's banner) */}
            {phase === "review" && !isErrorCorrecting && (
              <HeadlineMathFactBanner
                a={currentFact.a}
                b={currentFact.b}
                label="Warm-Up Review"
                strategyName={currentRenderedFact.strategyName}
                steps={currentRenderedFact.steps}
              />
            )}

            {/* In "We Do" (guided), pair the fact with ITS strategy name and steps */}
            {phase === "guided" && !isErrorCorrecting && (
              <HeadlineMathFactBanner
                a={currentFact.a}
                b={currentFact.b}
                product={currentFact.product}
                label="We Do — Guided"
                strategyName={currentRenderedFact.strategyName}
                steps={currentRenderedFact.steps}
              />
            )}

            {/* In "Fluency", show THAT fact's strategy name and toggleable Strategy Hint */}
            {phase === "fluency" && (
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-white/60">
                <span className="font-bold text-amber-300">{currentRenderedFact.strategyName}</span>
                <button
                  onClick={() => {
                    setShowHintScaffold((prev) => !prev);
                    setHintUsedOnCurrentFact(true);
                  }}
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/15 text-white/80 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3 text-cyan-400" />
                  <span>{showHintScaffold ? "Hide Strategy Hint" : "Show Strategy Hint"}</span>
                </button>
              </div>
            )}

            {phase === "fluency" && showHintScaffold && !isErrorCorrecting && (
              <HeadlineMathFactBanner
                a={currentFact.a}
                b={currentFact.b}
                product={currentFact.product}
                label="Fluency Strategy Hint"
                strategyName={currentRenderedFact.strategyName}
                steps={currentRenderedFact.steps}
              />
            )}

            {/* Error Re-Teaching Banner: Re-teaches THIS fact with ITS strategy split */}
            {isErrorCorrecting && correctionExplanation && (
              <HeadlineMathFactBanner
                a={currentFact.a}
                b={currentFact.b}
                product={currentFact.product}
                label="Re-Teaching Fact"
                strategyName={currentRenderedFact.strategyName}
                steps={currentRenderedFact.steps}
              />
            )}

            {/* Gate Post-Submission Feedback Banner: Restates fact + strategy split AFTER submission and stays visible until Continue */}
            {phase === "checkout" && gateFeedback && (
              <div className="w-full flex flex-col items-center gap-2.5">
                <HeadlineMathFactBanner
                  a={gateFeedback.rendered.groups}
                  b={gateFeedback.rendered.perGroup}
                  product={gateFeedback.rendered.product}
                  label={gateFeedback.isCorrect ? "Gate Feedback — Correct!" : "Gate Feedback — Strategy Review"}
                  strategyName={gateFeedback.rendered.strategyName}
                  steps={gateFeedback.rendered.steps}
                />
                <button
                  type="button"
                  onClick={handleContinueFromGateFeedback}
                  className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            )}

            {/* Math Problem Numerals with High-Contrast Factor Color Reinforcement */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 my-0.5">
              <span
                className={`font-black text-sky-300 font-mono ${
                  fontSize === "large" ? "text-5xl sm:text-6xl" : "text-4xl sm:text-5xl"
                }`}
                title="First factor (light blue)"
              >
                {currentFact.a}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white/40">×</span>
              <span
                className={`font-black text-purple-300 font-mono ${
                  fontSize === "large" ? "text-5xl sm:text-6xl" : "text-4xl sm:text-5xl"
                }`}
                title="Second factor (light purple)"
              >
                {currentFact.b}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white/40">=</span>

              {/* Strict 2-digit Answer Display Box */}
              <div
                className={`w-16 h-12 sm:w-20 sm:h-14 rounded-2xl border-2 flex items-center justify-center font-mono font-black text-2xl sm:text-3xl tracking-tight transition-all ${
                  errorMessage
                    ? "bg-rose-950/70 border-rose-500 text-rose-300 animate-shake"
                    : isAdvancing
                    ? "bg-cyan-950/90 border-cyan-300 text-amber-300 ring-4 ring-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-105"
                    : "bg-black/90 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                }`}
              >
                {typedAnswer || "?"}
              </div>
            </div>

            {/* Scaffold Visualizer: Grows naturally without clipping */}
            {phase !== "checkout" && (phase !== "fluency" || showHintScaffold) && (
              <div className="w-full">
                <FactVisualizer
                  factorA={currentFact.a}
                  factorB={currentFact.b}
                  showAnswer={false}
                  compact={true}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* NUMPAD: Separate block; side-by-side right column in landscape/tablet, bottom bar in portrait mobile */}
      {hasKeypad && (
        <div className="w-full max-w-sm landscape:w-64 md:w-72 mx-auto landscape:mx-0 md:mx-0 shrink-0 pb-1">
          <Numpad
            value={typedAnswer}
            onChange={handleAnswerInput}
            disabled={isAdvancing || Boolean(gateFeedback)}
            onSubmit={() => {
              if (typedAnswer.length > 0 && !isAdvancingRef.current && !gateFeedback) {
                const num = parseInt(typedAnswer, 10);
                isAdvancingRef.current = true;
                setIsAdvancing(true);
                setTimeout(() => {
                  evaluateAnswer(num);
                  setTimeout(() => {
                    isAdvancingRef.current = false;
                    setIsAdvancing(false);
                  }, 150);
                }, 400);
              }
            }}
          />
        </div>
      )}
      </div>

      {/* PAUSE MODAL */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xs rounded-3xl bg-[#0f121d] border border-white/15 p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
            <h3 className="text-lg font-black text-white">Lesson Paused</h3>
            <p className="text-xs text-white/60">Take a breath! Your progress is safe.</p>
            <div className="flex flex-col gap-2 w-full pt-2">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                Resume Lesson
              </button>
              <button
                onClick={handleFinishLesson}
                className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold cursor-pointer"
              >
                Save & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MID-LESSON EXIT CONFIRMATION MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm rounded-3xl bg-[#0f121d] border border-white/15 p-6 shadow-2xl flex flex-col gap-4 text-left">
            <h3 className="text-base font-black text-white">Leave Lesson?</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              You are currently in the middle of this lesson. You can save your practice now or discard this session.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleFinishLesson}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                Save Progress & Leave
              </button>
              <button
                onClick={handleConfirmDiscardAndExit}
                className="w-full h-10 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer"
              >
                Leave Without Saving
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold cursor-pointer"
              >
                Keep Learning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
