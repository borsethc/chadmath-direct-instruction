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
  X,
  Star,
  Brain,
  HelpCircle,
} from "lucide-react";
import { DILesson, MathFact, DIPhase, LessonAttempt } from "@/lib/types";
import { Numpad } from "./Numpad";
import { FactVisualizer } from "./FactVisualizer";
import { soundEffects } from "@/lib/sounds";

interface LessonEngineProps {
  lesson: DILesson;
  onLessonComplete: (attempt: Omit<LessonAttempt, "id" | "studentId" | "timestamp">) => void;
  onExit: () => void;
}

export function LessonEngine({ lesson, onLessonComplete, onExit }: LessonEngineProps) {
  // 5-Minute Timer: 300 seconds total
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [phase, setPhase] = useState<DIPhase>("review");
  const [phaseStepIndex, setPhaseStepIndex] = useState<number>(0);

  // Math fact currently presented
  const [currentFact, setCurrentFact] = useState<MathFact>(lesson.reviewFacts[0] || lesson.targetFacts[0]);
  const [typedAnswer, setTypedAnswer] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Direct Instruction Guided Correction States
  const [isErrorCorrecting, setIsErrorCorrecting] = useState<boolean>(false);
  const [correctionStep, setCorrectionStep] = useState<"model" | "lead" | "test">("model");

  // Statistics for the 5-minute session
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

  // Response time tracking
  const questionStartTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Five-minute countdown clock
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          setPhase("complete");
          soundEffects.playFanfare();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

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
          // Pick randomized mixture of target + review facts
          const allPool = [...lesson.targetFacts, ...lesson.reviewFacts];
          setCurrentFact(allPool[Math.floor(Math.random() * allPool.length)]);
        }
      } else if (currentPhase === "fluency") {
        const allPool = [...lesson.targetFacts, ...lesson.reviewFacts];
        const nextFact = allPool[Math.floor(Math.random() * allPool.length)];
        setCurrentFact(nextFact);
        setPhaseStepIndex(nextStep);
      }
    },
    [lesson]
  );

  // 3. Handle Answer Evaluation
  const evaluateAnswer = useCallback(
    (answerNum: number) => {
      const responseTime = Date.now() - questionStartTimeRef.current;
      setTotalAttempts((prev) => prev + 1);

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
          // Passed the correction test! Move to next question
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

        // Direct Instruction Model-Lead-Test procedure
        setIsErrorCorrecting(true);
        setCorrectionStep("model");
        setErrorMessage(
          `Not quite! You entered ${answerNum}. The correct answer is ${currentFact.product}.`
        );
      }
    },
    [currentFact, currentStreak, isErrorCorrecting, loadNextQuestionInPhase, phase, phaseStepIndex]
  );

  // 4. Handle input changes (Limit to 2 digits, Auto-advance on correct answer)
  const handleAnswerInput = (rawVal: string) => {
    const sanitized = rawVal.replace(/[^0-9]/g, "").slice(0, 2);
    setErrorMessage(null);
    setTypedAnswer(sanitized);

    if (sanitized.length > 0) {
      const num = parseInt(sanitized, 10);
      if (num === currentFact.product) {
        evaluateAnswer(num);
      }
    }
  };

  // Keyboard navigation & numpad shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "complete" || phase === "model") return;

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

  // Wrap up lesson and save attempt
  const handleFinishLesson = () => {
    const duration = 300 - secondsRemaining;
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100;
    const stars: 1 | 2 | 3 = accuracy >= 90 ? 3 : accuracy >= 75 ? 2 : 1;

    onLessonComplete({
      lessonId: lesson.id,
      durationSeconds: duration,
      accuracyPercent: accuracy,
      totalQuestions: totalAttempts,
      correctCount,
      errorFacts,
      starsEarned: stars,
    });
  };

  // Progress percentage of the 5-minute lesson (0 to 100%)
  const timerPercent = Math.min(100, Math.round(((300 - secondsRemaining) / 300) * 100));

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-between p-2 sm:p-4 md:p-6 select-none relative overflow-hidden">
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
              <span className="text-xs font-black uppercase tracking-wider">{streakToast.title}</span>
              <span className="text-[10px] opacity-80">{streakToast.subtitle}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5-MINUTE LESSON PROGRESS & COUNTDOWN HEADER */}
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
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {phase === "review" && "Phase 1: Warmup Review"}
                  {phase === "model" && "Phase 2: Model (I Do)"}
                  {phase === "guided" && "Phase 3: Guided Practice (We Do)"}
                  {phase === "fluency" && "Phase 4: Speed Sprint (You Do)"}
                  {phase === "complete" && "Phase 5: Lesson Complete"}
                </span>
              </div>
            </div>
          </div>

          {/* 5-Min Timer Display & Main Menu Return Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/50 border border-white/15 text-white shadow-inner font-mono font-bold text-xs sm:text-sm">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            <button
              onClick={onExit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all shadow-sm group cursor-pointer"
              title="Return to Main Menu"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Main Menu</span>
            </button>
          </div>
        </div>

        {/* Dynamic 5-Minute Phase Progress Bar */}
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* MAIN LESSON WORKSPACE */}
      <div className="w-full max-w-4xl flex-1 flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 my-2 sm:my-4 z-10">
        {/* PHASE: LESSON COMPLETE CELEBRATION */}
        {phase === "complete" ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/[0.04] border border-white/15 backdrop-blur-3xl shadow-2xl flex flex-col items-center text-center gap-5"
          >
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/30">
              🏆
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white">5-Minute Lesson Done!</h2>
              <p className="text-xs sm:text-sm text-white/60">
                You completed {lesson.title} using Direct Instruction!
              </p>
            </div>

            {/* Stars Earned */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((starIdx) => {
                const acc = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 100;
                const earned = starIdx === 1 || (starIdx === 2 && acc >= 75) || (starIdx === 3 && acc >= 90);
                return (
                  <Star
                    key={starIdx}
                    className={`w-8 h-8 ${
                      earned ? "text-amber-400 fill-amber-400 animate-bounce" : "text-white/20"
                    }`}
                  />
                );
              })}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-2 w-full pt-2">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                <span className="text-xl font-black text-emerald-400">{correctCount}</span>
                <span className="text-[10px] text-white/50 font-bold uppercase">Solved</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                <span className="text-xl font-black text-cyan-400">
                  {totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100}%
                </span>
                <span className="text-[10px] text-white/50 font-bold uppercase">Accuracy</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                <span className="text-xl font-black text-amber-400">5:00</span>
                <span className="text-[10px] text-white/50 font-bold uppercase">Practice</span>
              </div>
            </div>

            <button
              onClick={handleFinishLesson}
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Save Progress & View Dashboard</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </motion.div>
        ) : phase === "model" ? (
          /* PHASE 2: "I DO" DIRECT MODEL (Explicit Instruction by App) */
          <motion.div
            key={currentFact.product}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#131728] to-[#0a0d18] border-2 border-purple-500/40 backdrop-blur-3xl shadow-2xl flex flex-col items-center gap-5 text-center"
          >
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-wider">
              <Brain className="w-4 h-4" />
              <span>Step 2: "I Do" — Teacher Model</span>
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

            {/* Explicit Rule Callout */}
            <div className="w-full p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-col gap-1.5 text-left">
              <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                Rule: {lesson.ruleName}
              </span>
              <p className="text-xs sm:text-sm text-purple-100 font-medium leading-relaxed">
                {lesson.ruleSummary}
              </p>
            </div>

            {/* Visual Representation (Equal Groups) */}
            <FactVisualizer
              factorA={currentFact.a}
              factorB={currentFact.b}
              showAnswer={true}
            />

            <button
              onClick={() => loadNextQuestionInPhase("model", phaseStepIndex + 1)}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>I Understand — Next Fact</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </motion.div>
        ) : (
          /* PHASES 1, 3, 4: INTERACTIVE PRACTICE (Review, Guided "We Do", Speed "You Do") */
          <>
            {/* Visual & Problem Card */}
            <div className="w-full flex-1 max-w-lg p-3 sm:p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col items-center gap-2.5 sm:gap-4 my-auto">
              {/* Rule Hint / Guided Prompt */}
              {phase === "guided" && (
                <div className="w-full px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] sm:text-xs font-bold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Rule: {lesson.ruleName}</span>
                  </div>
                  <span className="text-[10px] text-amber-200/70 hidden xs:inline">
                    Guided
                  </span>
                </div>
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
                    <span>Direct Instruction Corrective Feedback:</span>
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
