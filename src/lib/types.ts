export type DIPhase = "review" | "model" | "guided" | "fluency" | "checkout" | "complete";

export interface StrategyStep {
  label: string;       // e.g. "Double 4"
  expression: string;  // e.g. "4 + 4 = 8"
}

export interface FactStrategy {
  id: string;          // e.g. "double-add-one-group"
  name: string;        // e.g. "Double, Then Add One More Group (×3)"
  stepsFor: (groups: number, perGroup: number) => StrategyStep[];
}

export interface Fact {
  groups: number;
  perGroup: number;
  product: number;
  strategy: FactStrategy;
}

export interface MathFact {
  a: number; // Factor A (1..9)
  b: number; // Factor B (1..9)
  product: number;
  strategy?: FactStrategy;
}

export interface FactMasteryRecord {
  factKey: string; // e.g. "7x8"
  a: number;
  b: number;
  product: number;
  attempts: number;
  correct: number;
  lastResponseTimeMs: number;
  averageResponseTimeMs: number;
  consecutiveCorrect: number;
  status: "unreached" | "learning" | "progressing" | "mastered";
  lastPracticed: string;
  firstTryCorrect?: number;
  correctedCount?: number;
  missedDates?: string[];
}

export interface LessonStep {
  fact: MathFact;
  ruleExplanation?: string;
  modelVoiceScript?: string;
  guidedPrompt?: string;
  tip?: string;
}

export interface DILesson {
  id: number;
  title: string;
  subtitle: string;
  ruleName: string;
  ruleSummary: string;
  targetTables: number[];
  targetFacts: MathFact[];
  reviewFacts: MathFact[];
  icon: string; // emoji or icon name
  badgeColor: string;
}

export interface LessonAttempt {
  id: string;
  studentId: string;
  lessonId: number;
  timestamp: string;
  durationSeconds: number;
  accuracyPercent: number;
  totalQuestions: number;
  correctCount: number;
  errorFacts: string[];
  starsEarned: 1 | 2 | 3;
  checkoutPassed?: boolean;
  checkoutScore?: {
    correct: number;
    total: number;
    averageLatencyMs: number;
  };
}

export interface StudentProfile {
  id: string;
  name: string;
  avatar: string; // Emoji
  pin?: string;
  currentLessonId: number;
  totalMinutesPracticed: number;
  totalLessonsCompleted: number; // Attempted / Practised sessions
  totalLessonsMastered: number;  // Only lessons whose gate passed!
  streakDays: number;
  lastPracticeDateChicago?: string; // YYYY-MM-DD in America/Chicago
  xp: number;
  lastActive: string;
  factMastery: Record<string, FactMasteryRecord>; // "AxB" -> Record
  lessonHistory: LessonAttempt[];
  reDrillQueue: { factKey: string; a: number; b: number; missedAt: string }[];
}

export interface TeacherAnalytics {
  totalStudents: number;
  totalLessonsCompleted: number;
  classAverageMastery: number; // 0..100
  classAverageAccuracy: number; // 0..100
  totalMinutesLogged: number;
  strugglingFacts: { factKey: string; errorCount: number; affectedStudentsCount: number }[];
  accuracyFormula: string;
}

