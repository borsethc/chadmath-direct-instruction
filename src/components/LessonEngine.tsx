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
import { getDynamicRuleExplanation, DynamicRuleExplanation } from "@/lib/ruleEngine";
import { recordFactAnswer, addToReDrillQueue, revertStudentToSnapshot } from "@/lib/storage";

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

  // P0: Student Snapshot on Mount — ensures "Leave Without Saving" restores exact state
  const initialStudentSnapshotRef = useRef<StudentProfile | null>(null);
  useEffect(() => {
    if (student && !initialStudentSnapshotRef.current) {
      initialStudentSnapshotRef.current = JSON.parse(JSON.stringify(student));
    }
  }, [student]);

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

  // Elapsed Practice Timer (Pausable; counts up continuously and never teleports)
  useEffect(() => {
    if (isPaused || phase === "complete") {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isPaused, phase]);

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
    setPhase("model");
    setPhaseStepIndex(0);
    const firstTarget = lesson.targetFacts[0];
    setCurrentFact(firstTarget);
    setCheckExplanation(getDynamicRuleExplanation(lesson.id, firstTarget.a, firstTarget.b));
    setTypedAnswer("");
    setErrorMessage(null);
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
      const responseTime = Date.now() - questionStartTimeRef.current;
      setTotalAttempts((prev) => prev + 1);

      // Phase: "model" Check-for-Understanding Screen (Scored only as the check!)
      if (phase === "model") {
        const expected = checkExplanation?.checkQuestion.expectedAnswer ?? currentFact.product;
        if (answerNum === expected) {
          soundEffects.playCorrect(1);
          setTypedAnswer("");
          setErrorMessage(null);
          // Advance to Warm-Up Practice
          startWarmUpPhase();
        } else {
          soundEffects.playIncorrect();
          setErrorMessage(
            checkExplanation?.checkQuestion.hint || "Review the rule and try again!"
          );
          setTypedAnswer(""); // Clear wrong entry automatically
        }
        return;
      }

      // Phase: "checkout" Gate
      if (phase === "checkout") {
        const isCorrect = answerNum === currentFact.product;
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

        const nextIndex = phaseStepIndex + 1;
        if (nextIndex < checkoutFacts.length) {
          setPhaseStepIndex(nextIndex);
          setCurrentFact(checkoutFacts[nextIndex]);
          setTypedAnswer("");
          setErrorMessage(null);
          questionStartTimeRef.current = Date.now();
        } else {
          // Checkout complete! Gate pass decided by accuracy first (4+/5 or >=80%)
          const correctNum = updatedResults.filter((r) => r.isCorrect).length;
          const avgLatency = Math.round(
            updatedResults.reduce((sum, r) => sum + r.latencyMs, 0) / updatedResults.length
          );

          const isMastered = correctNum >= 4; // 4/5 or 5/5
          const speedMet = avgLatency <= 3500;
          const stars: 1 | 2 | 3 = isMastered ? 3 : (correctNum / updatedResults.length) >= 0.75 ? 2 : 1;

          setCheckoutFinalScore({
            correct: correctNum,
            total: updatedResults.length,
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
        return;
      }

      // Standard Practice Phases (review, guided, fluency)
      const isCorrect = answerNum === currentFact.product;

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
      checkoutFacts,
      checkoutResults,
      currentFact,
      currentQueue,
      currentStreak,
      hintUsedOnCurrentFact,
      isErrorCorrecting,
      lesson.id,
      phase,
      phaseStepIndex,
      startFluencySprint,
      startGuidedPractice,
      startWarmUpPhase,
      student,
      triggerTransitionScreen,
    ]
  );

  // P0: Handle input changes with 400ms Visible Second-Digit Pause & Double-Tap Buffer
  const handleAnswerInput = useCallback(
    (rawVal: string) => {
      // Ignore any taps/keys arriving during advance pause or cooldown
      if (isAdvancingRef.current) return;

      const sanitized = rawVal.replace(/[^0-9]/g, "").slice(0, 2);
      setErrorMessage(null);
      setTypedAnswer(sanitized);

      if (sanitized.length === 0) return;

      const num = parseInt(sanitized, 10);
      const targetExpected =
        phase === "model"
          ? (checkExplanation?.checkQuestion.expectedAnswer ?? currentFact.product)
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
    [checkExplanation, currentFact.product, evaluateAnswer, phase]
  );

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "complete" || isPaused || showExitConfirm) return;
      if (isAdvancingRef.current) {
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
  }, [evaluateAnswer, handleAnswerInput, isPaused, phase, showExitConfirm, typedAnswer]);

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

  // Current fact explanation for We Do & Re-teaching banners
  const currentFactExpl = getDynamicRuleExplanation(lesson.id, currentFact.a, currentFact.b);

  return (
    <div
      className={`w-full h-[calc(100dvh-56px)] max-h-[818px] flex flex-col justify-between p-2 sm:p-3 select-none relative overflow-hidden pb-safe ${
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

      {/* HEADER: PROGRESS, TIMER & CONTROLS */}
      <div className="w-full max-w-lg mx-auto flex flex-col gap-1 shrink-0 z-20">
        <div className="flex items-center justify-between px-1">
          {/* Phase Title Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base sm:text-lg shrink-0">{lesson.icon}</span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-white truncate">{lesson.title}</span>
              <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
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

          {/* Controls: Read-Aloud, Font Size, Timer, Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                if (phase === "strategy_intro") {
                  speak(checkExplanation?.strategyOverview || lesson.ruleSummary);
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

        {/* P0: PERSISTENT VISIBLE STRATEGY HEADER (Stays on every step of every lesson) */}
        <div className="w-full px-2.5 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-[11px] font-bold text-cyan-200 shadow-sm shrink-0">
          <span className="truncate">
            {phase === "review" ? (
              <>
                <span className="text-amber-400 uppercase font-black tracking-wider text-[10px]">Warm-Up Review: </span>
                {currentFactExpl ? currentFactExpl.ruleName : "Direct Retrieval"}
              </>
            ) : (
              <>
                <span className="text-cyan-400 uppercase font-black tracking-wider text-[10px]">Strategy: </span>
                {lesson.ruleName} — {lesson.ruleSummary}
              </>
            )}
          </span>
        </div>
      </div>

      {/* WORKSPACE CONTENT AREA (Optimized for iPhone 17 402x874 portrait with zero vertical scroll) */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-center min-h-0 py-1">
        {/* PHASE 1: STRATEGY OVERVIEW */}
        {phase === "strategy_intro" && checkExplanation ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl bg-gradient-to-b from-white/[0.06] to-black/70 border border-white/15 p-3.5 flex flex-col gap-2.5 text-left max-h-[500px]"
          >
            {/* Headline Math Fact Banner */}
            <HeadlineMathFactBanner
              a={currentFact.a}
              b={currentFact.b}
              product={currentFact.product}
              label={checkExplanation.ruleName}
              strategyText={checkExplanation.conclusion || checkExplanation.strategyOverview}
              repeatedAddition={checkExplanation.repeatedAddition}
            />

            {/* Context Lead-In */}
            <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200">
              <span className="font-bold text-cyan-300">Context: </span>
              {checkExplanation.contextLeadIn}
            </div>

            {/* Worked Example Steps */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                Worked Example Steps:
              </span>
              {checkExplanation.steps.slice(0, 2).map((st) => (
                <div
                  key={st.stepNumber}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-black/40 border border-white/10 text-xs"
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

            <button
              onClick={handleStartModelCheck}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              <span>Continue to Check</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </motion.div>
        ) : phase === "model" && checkExplanation ? (
          /* PHASE 2: "I DO" CHECK-FOR-UNDERSTANDING (Separate screen & separate scoring from drill) */
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl bg-white/[0.04] border border-white/15 p-3 flex flex-col items-center gap-2 text-center my-auto"
          >
            {/* Headline Fact Banner pairing fact with strategy */}
            <HeadlineMathFactBanner
              a={currentFact.a}
              b={currentFact.b}
              product={currentFact.product}
              label="Check: Strategy Step"
              strategyText={`Strategy: ${checkExplanation.strategyOverview}`}
              repeatedAddition={checkExplanation.repeatedAddition}
            />

            {/* Conceptual Question Prompt (Separate from drill fact) */}
            <div className="px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs sm:text-sm font-bold w-full">
              {checkExplanation.checkQuestion.prompt}
            </div>

            {/* Scaffold Visualizer */}
            <div className="w-full max-h-[120px] overflow-hidden">
              <FactVisualizer
                factorA={checkExplanation.checkQuestionVisual?.a ?? currentFact.a}
                factorB={checkExplanation.checkQuestionVisual?.b ?? currentFact.b}
                showAnswer={false}
                compact={true}
              />
            </div>

            {/* Conceptual Answer Box */}
            <div
              className={`w-18 h-12 rounded-xl border-2 flex items-center justify-center font-mono font-black text-2xl tracking-tight transition-all ${
                errorMessage
                  ? "bg-rose-950/70 border-rose-500 text-rose-300"
                  : "bg-black/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              }`}
            >
              {typedAnswer || "?"}
            </div>

            {errorMessage && (
              <span className="text-xs text-rose-300 font-bold px-2">{errorMessage}</span>
            )}
          </motion.div>
        ) : phase === "transition_gate" ? (
          /* TRANSITION SCREEN BEFORE CHECKOUT GATE */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full rounded-2xl bg-gradient-to-b from-rose-950/40 to-black/60 border-2 border-rose-500/40 p-5 flex flex-col items-center gap-3 text-center my-auto"
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
            className="w-full rounded-2xl bg-white/[0.04] border border-white/15 p-4 flex flex-col items-center text-center gap-3 my-auto"
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

                {/* Facts Mastered Grid Review with Light Blue, Light Purple, Gold Colors */}
                <div className="w-full flex items-center justify-center gap-2 flex-wrap pt-1">
                  {checkoutResults.map((r, i) => (
                    <div
                      key={i}
                      className="px-2 py-1 rounded-lg bg-black/40 border border-white/10 flex items-center gap-1 text-xs"
                    >
                      <FormattedMathFact
                        a={r.fact.a}
                        b={r.fact.b}
                        product={r.fact.product}
                        size="sm"
                      />
                    </div>
                  ))}
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
          <div className="w-full flex flex-col items-center gap-1.5 my-auto">
            {/* In Checkout Gate, show explicit pass rule and label repeats */}
            {phase === "checkout" && (
              <div className="flex items-center justify-between w-full px-2 text-[10px] text-amber-300/90 font-bold">
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

            {/* In "We Do" (guided), pair the fact with strategy in headline banner */}
            {phase === "guided" && (
              <HeadlineMathFactBanner
                a={currentFact.a}
                b={currentFact.b}
                product={currentFact.product}
                label="We Do — Guided"
                strategyText={`Strategy: ${currentFactExpl.strategyOverview}`}
                repeatedAddition={currentFactExpl.repeatedAddition}
              />
            )}

            {/* In "Fluency" with hint requested, show hint banner */}
            {phase === "fluency" && (
              <div className="flex items-center gap-2 text-[11px] text-white/60">
                <span className="font-bold text-amber-300">{lesson.ruleName}</span>
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

            {phase === "fluency" && showHintScaffold && (
              <HeadlineMathFactBanner
                a={currentFact.a}
                b={currentFact.b}
                product={currentFact.product}
                label="Fluency Strategy Hint"
                strategyText={`Strategy: ${currentFactExpl.strategyOverview}`}
                repeatedAddition={currentFactExpl.repeatedAddition}
              />
            )}

            {/* Error Re-Teaching Banner: Headlines the fact with light blue, light purple, gold */}
            {isErrorCorrecting && correctionExplanation && (
              <HeadlineMathFactBanner
                a={currentFact.a}
                b={currentFact.b}
                product={currentFact.product}
                label="Re-Teaching Fact"
                strategyText={`Strategy: ${correctionExplanation.strategyOverview}`}
                repeatedAddition={correctionExplanation.repeatedAddition}
              />
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

            {/* Scaffold Visualizer: Faded according to Direct Instruction rules
                - Review (Warmup): full dots + repeated addition
                - Guided: full groups
                - Fluency: dots hidden (unless user requests hint)
                - Checkout: bare problems (no groups)
            */}
            {phase !== "checkout" && (phase !== "fluency" || showHintScaffold) && (
              <div className="w-full max-h-[125px] overflow-hidden">
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

      {/* NUMPAD: Pinned at bottom with 44pt tap targets & disabled state during 400ms pause */}
      {phase !== "complete" && phase !== "strategy_intro" && phase !== "transition_gate" && (
        <div className="w-full max-w-sm mx-auto shrink-0 pb-1">
          <Numpad
            value={typedAnswer}
            onChange={handleAnswerInput}
            disabled={isAdvancing}
            onSubmit={() => {
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
            }}
          />
        </div>
      )}

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
