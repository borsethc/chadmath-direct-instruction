export type DIPhase = "review" | "model" | "guided" | "fluency" | "complete";

export interface MathFact {
  a: number; // Factor A (1..9)
  b: number; // Factor B (1..9)
  product: number;
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
}

export interface StudentProfile {
  id: string;
  name: string;
  avatar: string; // Emoji
  pin?: string;
  currentLessonId: number;
  totalMinutesPracticed: number;
  totalLessonsCompleted: number;
  streakDays: number;
  xp: number;
  lastActive: string;
  factMastery: Record<string, FactMasteryRecord>; // "AxB" -> Record
  lessonHistory: LessonAttempt[];
}

export interface TeacherAnalytics {
  totalStudents: number;
  totalLessonsCompleted: number;
  classAverageMastery: number; // 0..100
  classAverageAccuracy: number; // 0..100
  totalMinutesLogged: number;
  strugglingFacts: { factKey: string; errorCount: number; affectedStudentsCount: number }[];
}
