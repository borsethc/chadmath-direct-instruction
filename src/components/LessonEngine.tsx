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
  ArrowLeft,
  RotateCcw,
  Volume2,
  Star,
  Brain,
  Trophy,
  Target,
  Zap,
} from "lucide-react";
import { DILesson, MathFact, DIPhase, LessonAttempt } from "@/lib/types";
import { Numpad } from "./Numpad";
import { FactVisualizer } from "./FactVisualizer";
import { DynamicRuleCard } from "./DynamicRuleCard";
import { soundEffects } from "@/lib/sounds";

interface LessonEngineProps {
  lesson: DILesson;
  onLessonComplete: (attempt: Omit<LessonAttempt, "id" | "studentId" | "timestamp">) => void;
  onExit: () => void;
}

interface CheckoutItemResult {
  fact: MathFact;
  answerEntered: number;
  isCorrect: boolean;
  latencyMs: number;
}

export function LessonEngine({ lesson, onLessonComplete, onExit }: LessonEngineProps) {
  // 5-Minute Timer: 300 seconds total
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [phase, setPhase] = useState<DIPhase>("review");
  const [phaseStepIndex, setPhaseStepIndex] = useState<number>(0);

  // Math fact currently presented
  const [currentFact, setCurrentFact] = useState<MathFact>(
    lesson.reviewFacts[0] || lesson.targetFacts[0]
  );
  const [typedAnswer, setTypedAnswer] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Direct Instruction Guided Correction States
  const [isErrorCorrecting, setIsErrorCorrecting] = useState<boolean>(false);
  const [correctionStep, setCorrectionStep] = useState<"model" | "lead" | "test">("model");

  // Statistics for the session
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [errorFacts, setErrorFacts] = useState<string[]>([]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [streakToast, setStreakToast] = useState<{
    tier: "hot" | "supercharged" | "unstoppable" | "supernova";
    title: string;
    subtitle: string;
    emoji: string;
  } | null>(null);

  // Pillar 1: Checkout Gate (Exit Ticket) Verification States
  const [checkoutFacts, setCheckoutFacts] = useState<MathFact[]>([]);
  const [checkoutResults, setCheckoutResults] = useState<CheckoutItemResult[]>([]);
  const [checkoutFinalScore, setCheckoutFinalScore] = useState<{
    correct: number;
    total: number;
    averageLatencyMs: number;
    passed: boolean;
  } | null>(null);

  // Response time tracking
  const questionStartTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger Checkout Gate (Exit Ticket)
  const triggerCheckoutGate = useCallback(() => {
    setPhase("checkout");
    setPhaseStepIndex(0);
    // Take exactly 5 facts from target facts (cycle if < 5)
    const targets =
      lesson.targetFacts.length >= 5
        ? [...lesson.targetFacts].slice(0, 5)
        : Array.from(
            { length: 5 },
            (_, i) => lesson.targetFacts[i % lesson.targetFacts.length]
          );
    setCheckoutFacts(targets);
    setCurrentFact(targets[0]);
    setCheckoutResults([]);
    setTypedAnswer("");
    setErrorMessage(null);
    questionStartTimeRef.current = Date.now();
    soundEffects.playModelChime();
  }, [lesson.targetFacts]);

  // 1. Five-minute countdown clock
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // When timer expires, trigger the Checkout Gate rather than awarding an unearned pass!
  useEffect(() => {
    if (secondsRemaining === 0 && phase !== "checkout" && phase !== "complete") {
      triggerCheckoutGate();
    }
  }, [secondsRemaining, phase, triggerCheckoutGate]);

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  // 2. Question Generator based on DI Phase
  const loadNextQuestionInPhase = useCallback(
    (currentPhase: DIPhase, nextStep: number) => {
      setTypedAnswer("");
      setErrorMessage(null);
      setIsErrorCorrecting(false);
      questionStartTimeRef.current = Date.now();

      if (currentPhase === "review") {
        const pool = lesson.reviewFacts.length > 0 ? lesson.reviewFacts : lesson.targetFacts;
        if (nextStep < pool.length) {
          setCurrentFact(pool[nextStep]);
          setPhaseStepIndex(nextStep);
        } else {
          // Transition to Phase 2: Direct Model "I Do"
          setPhase("model");
          setPhaseStepIndex(0);
          setCurrentFact(lesson.targetFacts[0]);
          soundEffects.playModelChime();
        }
      } else if (currentPhase === "model") {
        if (nextStep < Math.min(3, lesson.targetFacts.length)) {
          setCurrentFact(lesson.targetFacts[nextStep]);
          setPhaseStepIndex(nextStep);
          soundEffects.playModelChime();
        } else {
          // Transition to Phase 3: Guided Practice "We Do"
          setPhase("guided");
          setPhaseStepIndex(0);
          setCurrentFact(lesson.targetFacts[0]);
        }
      } else if (currentPhase === "guided") {
        if (nextStep < lesson.targetFacts.length) {
          setCurrentFact(lesson.targetFacts[nextStep]);
          setPhaseStepIndex(nextStep);
        } else {
          // Transition to Phase 4: Independent Fluency Sprint "You Do"
          setPhase("fluency");
          setPhaseStepIndex(0);
          const allPool = [...lesson.targetFacts, ...lesson.reviewFacts];
          setCurrentFact(allPool[Math.floor(Math.random() * allPool.length)]);
        }
      } else if (currentPhase === "fluency") {
        // After 8 questions in fluency sprint, transition to Checkout Gate
        if (nextStep >= 8) {
          triggerCheckoutGate();
          return;
        }
        const allPool = [...lesson.targetFacts, ...lesson.reviewFacts];
        const nextFact = allPool[Math.floor(Math.random() * allPool.length)];
        setCurrentFact(nextFact);
        setPhaseStepIndex(nextStep);
      }
    },
    [lesson, triggerCheckoutGate]
  );

  // 3. Handle Answer Evaluation
  const evaluateAnswer = useCallback(
    (answerNum: number) => {
      const responseTime = Date.now() - questionStartTimeRef.current;
      setTotalAttempts((prev) => prev + 1);

      // PILLAR 2: Phase 2 "I Do" Active Confirmation Gate (Prevents Click-through)
      if (phase === "model") {
        if (answerNum === currentFact.product) {
          soundEffects.playCorrect(1);
          setTypedAnswer("");
          setErrorMessage(null);
          loadNextQuestionInPhase("model", phaseStepIndex + 1);
        } else {
          soundEffects.playIncorrect();
          setErrorMessage(
            `Look at the steps above! ${currentFact.a} × ${currentFact.b} = ${currentFact.product}.`
          );
        }
        return;
      }

      // PILLAR 1: Phase 5 Checkout Gate (Exit Ticket)
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

        if (isCorrect) {
          soundEffects.playCorrect(currentStreak + 1);
          setCurrentStreak((prev) => prev + 1);
          setCorrectCount((prev) => prev + 1);
        } else {
          soundEffects.playIncorrect();
          setCurrentStreak(0);
          const factKey = `${currentFact.a}x${currentFact.b}`;
          setErrorFacts((prev) => (prev.includes(factKey) ? prev : [...prev, factKey]));
        }

        const nextIndex = phaseStepIndex + 1;
        if (nextIndex < checkoutFacts.length) {
          setPhaseStepIndex(nextIndex);
          setCurrentFact(checkoutFacts[nextIndex]);
          setTypedAnswer("");
          setErrorMessage(null);
          questionStartTimeRef.current = Date.now();
        } else {
          // Checkout complete! Evaluate true DI mastery criteria:
          const correctNum = updatedResults.filter((r) => r.isCorrect).length;
          const accuracy = Math.round((correctNum / updatedResults.length) * 100);
          const avgLatency = Math.round(
            updatedResults.reduce((sum, r) => sum + r.latencyMs, 0) / updatedResults.length
          );

          // Mastery standard: At least 80% accuracy (4/5 or 5/5) AND <= 3.5s avg latency
          const isMastered = accuracy >= 80 && avgLatency <= 3500;

          setCheckoutFinalScore({
            correct: correctNum,
            total: updatedResults.length,
            averageLatencyMs: avgLatency,
            passed: isMastered,
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

      // Phases 1, 3, 4: Standard Practice & Error Correction
      if (answerNum === currentFact.product) {
        // CORRECT ANSWER!
        const nextStreak = currentStreak + 1;
        setCurrentStreak(nextStreak);
        soundEffects.playCorrect(nextStreak);
        setCorrectCount((prev) => prev + 1);
        setErrorMessage(null);

        // Milestone Streak Celebrations
        if (nextStreak === 3) {
          setStreakToast({
            tier: "hot",
            title: "3 In A Row!",
            subtitle: "Warming up nicely 🔥",
            emoji: "🔥",
          });
          setTimeout(() => setStreakToast(null), 1800);
        } else if (nextStreak === 5) {
          setStreakToast({
            tier: "supercharged",
            title: "5 Streak: Supercharged!",
            subtitle: "Pitch is rising ⚡",
            emoji: "⚡",
          });
          setTimeout(() => setStreakToast(null), 1800);
        } else if (nextStreak === 8) {
          setStreakToast({
            tier: "unstoppable",
            title: "8 Streak: UNSTOPPABLE!",
            subtitle: "Total flow state 🚀",
            emoji: "🚀",
          });
          setTimeout(() => setStreakToast(null), 1800);
        } else if (nextStreak >= 10 && nextStreak % 5 === 0) {
          setStreakToast({
            tier: "supernova",
            title: `${nextStreak} STREAK: SUPERNOVA!`,
            subtitle: "Mastery automaticity unlocked 🌟",
            emoji: "🌟",
          });
          setTimeout(() => setStreakToast(null), 2200);
        }

        if (isErrorCorrecting) {
          setIsErrorCorrecting(false);
          loadNextQuestionInPhase(phase, phaseStepIndex + 1);
        } else {
          loadNextQuestionInPhase(phase, phaseStepIndex + 1);
        }
      } else {
        // INCORRECT ANSWER: Direct Instruction Immediate Error Correction
        soundEffects.playIncorrect();
        setCurrentStreak(0);
        setStreakToast(null);
        const factKey = `${currentFact.a}x${currentFact.b}`;
        setErrorFacts((prev) => (prev.includes(factKey) ? prev : [...prev, factKey]));

        setIsErrorCorrecting(true);
        setCorrectionStep("model");
        setErrorMessage(
          `Not quite! You entered ${answerNum}. The correct answer is ${currentFact.product}.`
        );
      }
    },
    [
      checkoutFacts,
      checkoutResults,
      currentFact,
      currentStreak,
      isErrorCorrecting,
      loadNextQuestionInPhase,
      phase,
      phaseStepIndex,
    ]
  );

  // 4. Handle input changes (Limit to 2 digits, Auto-advance on correct score)
  const handleAnswerInput = (rawVal: string) => {
    const sanitized = rawVal.replace(/[^0-9]/g, "").slice(0, 2);
    setErrorMessage(null);
    setTypedAnswer(sanitized);

    if (sanitized.length > 0) {
      const num = parseInt(sanitized, 10);
      if (num === currentFact.product) {
        evaluateAnswer(num);
      } else if (phase === "checkout" && sanitized.length === 2) {
        // In checkout, if 2 digits are entered and incorrect, submit as incorrect immediately
        evaluateAnswer(num);
      }
    }
  };

  // Keyboard navigation & numpad shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "complete") return;

      if (/^[0-9]$/.test(e.key)) {
        if (typedAnswer.length < 2) {
          handleAnswerInput(typedAnswer + e.key);
        }
      } else if (e.key === "Backspace") {
        setTypedAnswer((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter") {
        if (typedAnswer.length > 0) {
          evaluateAnswer(parseInt(typedAnswer, 10));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [evaluateAnswer, phase, typedAnswer]);

  // Restart practice if not mastered
  const handleRetryLesson = () => {
    setPhase("guided");
    setPhaseStepIndex(0);
    setCurrentFact(lesson.targetFacts[0]);
    setTypedAnswer("");
    setErrorMessage(null);
    setCheckoutResults([]);
    setCheckoutFinalScore(null);
    setCurrentStreak(0);
    questionStartTimeRef.current = Date.now();
  };

  // Wrap up lesson and save attempt
  const handleFinishLesson = () => {
    const duration = 300 - secondsRemaining;
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100;

    const isMastered = checkoutFinalScore
      ? checkoutFinalScore.passed
      : accuracy >= 80;
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

  // Progress percentage of the 5-minute lesson (0 to 100%)
  const timerPercent = Math.min(100, Math.round(((300 - secondsRemaining) / 300) * 100));

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-between p-2 sm:p-4 md:p-6 select-none relative overflow-hidden pb-safe">
      {/* Dynamic Animated Streak Milestone Banner */}
      <AnimatePresence>
        {streakToast && (
          <motion.div
            initial={{ scale: 0.5, y: -20, opacity: 0 }}
            animate={{ scale: [1, 1.1, 1], y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed top-18 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-full border-2 shadow-2xl flex items-center gap-2.5 backdrop-blur-xl pointer-events-none ${
              streakToast.tier === "supernova"
                ? "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 border-amber-300 text-white shadow-[0_0_35px_rgba(245,158,11,0.8)]"
                : streakToast.tier === "unstoppable"
                ? "bg-purple-950/90 border-purple-400 text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.6)]"
                : streakToast.tier === "supercharged"
                ? "bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.6)]"
                : "bg-amber-950/90 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
            }`}
          >
            <span className="text-xl">{streakToast.emoji}</span>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black uppercase tracking-wider">
                {streakToast.title}
              </span>
              <span className="text-[10px] opacity-80">{streakToast.subtitle}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER: PROGRESS & PHASE INDICATOR */}
      <div className="w-full max-w-4xl flex flex-col gap-2 shrink-0 z-20">
        <div className="flex items-center justify-between px-2">
          {/* Phase Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xl">{lesson.icon}</span>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white">{lesson.title}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    phase === "review"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : phase === "model"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse"
                      : phase === "guided"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : phase === "fluency"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : phase === "checkout"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {phase === "review"
                    ? "Step 1: Review Warm-up"
                    : phase === "model"
                    ? "Step 2: 'I Do' Teacher Model"
                    : phase === "guided"
                    ? "Step 3: 'We Do' Guided Practice"
                    : phase === "fluency"
                    ? "Step 4: 'You Do' Fluency Sprint"
                    : phase === "checkout"
                    ? "Step 5: 🎯 Checkout Gate"
                    : "Lesson Complete"}
                </span>
                <span className="text-[10px] text-white/40 hidden sm:inline">
                  {lesson.ruleName}
                </span>
              </div>
            </div>
          </div>

          {/* 5-Minute Timer & Main Menu Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 font-mono text-xs sm:text-sm font-bold text-cyan-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-sm active:scale-95"
              aria-label="Return to Main Menu"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline">Main Menu</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="w-full max-w-4xl flex-1 flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 my-2 sm:my-4 z-10">
        {/* PHASE 6: LESSON COMPLETE / MASTERY VERIFICATION SCREEN */}
        {phase === "complete" ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/[0.04] border border-white/15 backdrop-blur-3xl shadow-2xl flex flex-col items-center text-center gap-5"
          >
            {checkoutFinalScore?.passed ? (
              /* PASSED VERIFIED MASTERY */
              <>
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/30">
                  🏆
                </div>

                <div className="flex flex-col gap-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase mx-auto">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mastery Verified!</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    {lesson.title} Mastered!
                  </h2>
                  <p className="text-xs sm:text-sm text-white/60">
                    You crushed the unassisted Checkout Gate with rapid recall!
                  </p>
                </div>

                {/* 3 Glowing Stars */}
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((starIdx) => (
                    <Star
                      key={starIdx}
                      className="w-8 h-8 text-amber-400 fill-amber-400 animate-bounce"
                    />
                  ))}
                </div>

                {/* Stats Breakdown */}
                <div className="grid grid-cols-3 gap-2 w-full pt-1">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-xl font-black text-emerald-400">
                      {checkoutFinalScore.correct}/{checkoutFinalScore.total}
                    </span>
                    <span className="text-[10px] text-white/50 font-bold uppercase">
                      Checkout
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-xl font-black text-cyan-400">
                      {(checkoutFinalScore.averageLatencyMs / 1000).toFixed(1)}s
                    </span>
                    <span className="text-[10px] text-white/50 font-bold uppercase">
                      Avg Speed
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-xl font-black text-amber-400">+200</span>
                    <span className="text-[10px] text-white/50 font-bold uppercase">XP Earned</span>
                  </div>
                </div>

                <button
                  onClick={handleFinishLesson}
                  className="w-full h-13 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>Save Progress & Unlock Next Lesson</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              </>
            ) : (
              /* NEEDS FIRMING (Honest Direct Instruction Feedback) */
              <>
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-3xl shadow-lg shadow-rose-500/30">
                  💪
                </div>

                <div className="flex flex-col gap-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase mx-auto">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Needs Firming Up</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Almost There!
                  </h2>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                    {checkoutFinalScore && checkoutFinalScore.correct < 4
                      ? `You scored ${checkoutFinalScore.correct}/5 on the Checkout Gate. To master this rule, aim for at least 4 out of 5 correct on the first attempt!`
                      : `Great accuracy (${checkoutFinalScore?.correct}/5), but speed was ${(
                          (checkoutFinalScore?.averageLatencyMs || 0) / 1000
                        ).toFixed(1)}s. The target is under 3.5s for automatic recall!`}
                  </p>
                </div>

                {/* 1 Effort Star */}
                <div className="flex items-center gap-2">
                  <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
                  <Star className="w-8 h-8 text-white/20" />
                  <Star className="w-8 h-8 text-white/20" />
                </div>

                {/* Diagnostic Metric */}
                <div className="grid grid-cols-2 gap-2 w-full pt-1">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-xl font-black text-amber-400">
                      {checkoutFinalScore?.correct || 0}/5
                    </span>
                    <span className="text-[10px] text-white/50 font-bold uppercase">
                      Score (Goal: 4+)
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-xl font-black text-rose-400">
                      {(
                        (checkoutFinalScore?.averageLatencyMs || 0) / 1000
                      ).toFixed(1)}s
                    </span>
                    <span className="text-[10px] text-white/50 font-bold uppercase">
                      Speed (Goal: &lt;3.5s)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={handleRetryLesson}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 stroke-[3]" />
                    <span>Practice Again to Master (2 Min)</span>
                  </button>

                  <button
                    onClick={handleFinishLesson}
                    className="w-full h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <span>Save Practice & Return to Dashboard</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ) : phase === "model" ? (
          /* PHASE 2: "I DO" DIRECT MODEL WITH ACTIVE STEP CHECKPOINT (Stops Click-Through!) */
          <motion.div
            key={currentFact.product}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-[#131728] to-[#0a0d18] border-2 border-purple-500/40 backdrop-blur-3xl shadow-2xl flex flex-col items-center gap-4 text-center my-auto"
          >
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-wider">
              <Brain className="w-4 h-4" />
              <span>Step 2: "I Do" — Teacher Model ({phaseStepIndex + 1} of 3)</span>
            </div>

            {/* Fact Hero Display */}
            <div className="flex items-center gap-3 text-4xl sm:text-6xl font-black text-white font-mono tracking-tight">
              <span className="text-purple-300">{currentFact.a}</span>
              <span className="text-white/40">×</span>
              <span className="text-cyan-300">{currentFact.b}</span>
              <span className="text-white/40">=</span>
              <span className="text-emerald-400 underline decoration-purple-400 underline-offset-8">
                {currentFact.product}
              </span>
            </div>

            {/* Dynamic Step-by-Step Rule Engine Card */}
            <DynamicRuleCard
              lessonId={lesson.id}
              factorA={currentFact.a}
              factorB={currentFact.b}
              mode="full"
            />

            {/* PILLAR 2: ACTIVE CONFIRMATION CHECKPOINT (Required to advance!) */}
            <div className="w-full p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-1.5 text-xs font-black text-purple-200 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Active Check: Type {currentFact.product} below to confirm:</span>
              </div>

              {/* Confirmation Input Box */}
              <div
                className={`w-18 h-13 rounded-2xl border-2 flex items-center justify-center font-mono font-black text-2xl tracking-tight transition-all ${
                  errorMessage
                    ? "bg-rose-950/70 border-rose-500 text-rose-300 animate-shake"
                    : "bg-black/80 border-purple-400 text-purple-200 ring-4 ring-purple-400/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                }`}
              >
                {typedAnswer || "?"}
              </div>

              {errorMessage && (
                <span className="text-xs text-rose-300 font-bold">{errorMessage}</span>
              )}
            </div>

            {/* Numpad for Model confirmation */}
            <div className="w-full max-w-[280px]">
              <Numpad
                value={typedAnswer}
                onChange={handleAnswerInput}
                onSubmit={() => {
                  if (typedAnswer.length > 0) {
                    evaluateAnswer(parseInt(typedAnswer, 10));
                  }
                }}
              />
            </div>
          </motion.div>
        ) : phase === "checkout" ? (
          /* PILLAR 1: PHASE 5 CHECKOUT GATE (THE EXIT TICKET — NO HINTS, PURE AUTOMATICITY) */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex-1 max-w-lg p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-rose-950/30 via-black/40 to-black/60 border-2 border-rose-500/50 backdrop-blur-2xl shadow-2xl flex flex-col items-center gap-3 sm:gap-4 my-auto"
          >
            {/* High-Stakes Checkout Banner */}
            <div className="w-full px-3.5 py-2 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Checkout Gate ({phaseStepIndex + 1} of {checkoutFacts.length})
                </span>
              </div>
              <span className="text-[10px] text-rose-300 font-bold bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-500/30">
                Unassisted Sprint
              </span>
            </div>

            {/* 5-Question Progress Dots */}
            <div className="flex items-center gap-2">
              {checkoutFacts.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i < phaseStepIndex
                      ? checkoutResults[i]?.isCorrect
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                        : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                      : i === phaseStepIndex
                      ? "bg-white scale-125 animate-pulse"
                      : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            {/* Equation without Scaffolding */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 my-2">
              <span className="text-4xl sm:text-6xl font-black text-white font-mono">
                {currentFact.a}
              </span>
              <span className="text-2xl sm:text-4xl font-black text-white/40">×</span>
              <span className="text-4xl sm:text-6xl font-black text-white font-mono">
                {currentFact.b}
              </span>
              <span className="text-2xl sm:text-4xl font-black text-white/40">=</span>

              {/* Strict Answer Box */}
              <div
                className={`w-18 h-14 sm:w-26 sm:h-22 rounded-2xl border-2 sm:border-3 flex items-center justify-center font-mono font-black text-2xl sm:text-5xl tracking-tight transition-all ${
                  errorMessage
                    ? "bg-rose-950/70 border-rose-500 text-rose-300 animate-shake"
                    : "bg-black/90 border-rose-400 text-rose-200 ring-2 sm:ring-4 ring-rose-400/20 shadow-[0_0_25px_rgba(244,63,94,0.3)]"
                }`}
              >
                {typedAnswer || "?"}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/50 font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Target: Answer accurately in under 3.5 seconds</span>
            </div>

            {/* Tactile Numpad */}
            <div className="shrink-0 w-full md:w-[280px] flex flex-col items-center mt-auto">
              <Numpad
                value={typedAnswer}
                onChange={handleAnswerInput}
                onSubmit={() => {
                  if (typedAnswer.length > 0) {
                    evaluateAnswer(parseInt(typedAnswer, 10));
                  }
                }}
              />
            </div>
          </motion.div>
        ) : (
          /* PHASES 1, 3, 4: INTERACTIVE PRACTICE (Review, Guided "We Do", Speed "You Do") */
          <>
            {/* Visual & Problem Card */}
            <div className="w-full flex-1 max-w-lg p-3 sm:p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col items-center gap-2.5 sm:gap-4 my-auto">
              {/* Dynamic Rule Guided Step Engine */}
              {phase === "guided" && (
                <DynamicRuleCard
                  lessonId={lesson.id}
                  factorA={currentFact.a}
                  factorB={currentFact.b}
                  mode="guided"
                />
              )}

              {/* Big Math Fact Equation (Ergonomic for iPhone 15 portrait) */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 my-0.5">
                <span className="text-3xl sm:text-6xl font-black text-white font-mono">
                  {currentFact.a}
                </span>
                <span className="text-xl sm:text-4xl font-black text-white/40">×</span>
                <span className="text-3xl sm:text-6xl font-black text-white font-mono">
                  {currentFact.b}
                </span>
                <span className="text-xl sm:text-4xl font-black text-white/40">=</span>

                {/* Answer Box (Strictly limited to 2 digits, auto-advances on correct score) */}
                <div
                  className={`w-16 h-13 sm:w-26 sm:h-22 rounded-2xl border-2 sm:border-3 flex items-center justify-center font-mono font-black text-2xl sm:text-5xl tracking-tight transition-all ${
                    errorMessage
                      ? "bg-rose-950/70 border-rose-500 text-rose-300 animate-shake"
                      : "bg-black/80 border-amber-400 text-amber-300 ring-2 sm:ring-4 ring-amber-400/20 shadow-[0_0_25px_rgba(245,158,11,0.3)]"
                  }`}
                >
                  {typedAnswer || "?"}
                </div>
              </div>

              {/* DIRECT INSTRUCTION ERROR CORRECTION DIALOG */}
              {isErrorCorrecting && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex flex-col gap-2"
                >
                  <div className="flex items-center gap-1.5 font-black text-rose-300">
                    <AlertCircle className="w-4 h-4" />
                    <span>Correction (Model & Lead)</span>
                  </div>
                  <p className="leading-relaxed">
                    Watch: <strong>{currentFact.a} × {currentFact.b} = {currentFact.product}</strong>.
                    <br />
                    Rule reminder: {lesson.ruleSummary}
                  </p>
                  <span className="text-amber-300 font-bold">
                    → Now your turn! Type <strong>{currentFact.product}</strong> to confirm:
                  </span>
                </motion.div>
              )}

              {/* Visual Groups Canvas (Visual scaffolding) */}
              <FactVisualizer
                factorA={currentFact.a}
                factorB={currentFact.b}
                showAnswer={false}
              />
            </div>

            {/* Tactile Numpad */}
            <div className="shrink-0 w-full md:w-[280px] flex flex-col items-center">
              <Numpad
                value={typedAnswer}
                onChange={handleAnswerInput}
                onSubmit={() => {
                  if (typedAnswer.length > 0) {
                    evaluateAnswer(parseInt(typedAnswer, 10));
                  }
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Current Streak Indicator */}
      {phase !== "complete" && currentStreak > 0 && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full z-20">
          <Flame className="w-3.5 h-3.5 fill-current" />
          <span>{currentStreak} Fact Streak!</span>
        </div>
      )}
    </div>
  );
}
