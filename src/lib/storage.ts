import { StudentProfile, LessonAttempt, TeacherAnalytics, FactMasteryRecord } from "./types";

const STORAGE_KEY = "chadmath_di_students_v3";
const ACTIVE_STUDENT_KEY = "chadmath_di_active_student_v3";
export const TEACHER_PIN = "9999";

// Generate an empty 1x1 to 9x9 fact mastery map
export function generateEmptyFactMastery(): Record<string, FactMasteryRecord> {
  const map: Record<string, FactMasteryRecord> = {};
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      const key = `${a}x${b}`;
      map[key] = {
        factKey: key,
        a,
        b,
        product: a * b,
        attempts: 0,
        correct: 0,
        lastResponseTimeMs: 0,
        averageResponseTimeMs: 0,
        consecutiveCorrect: 0,
        status: "unreached",
        lastPracticed: "",
      };
    }
  }
  return map;
}

// Generate realistic seeded mastery for demo students
function createSeededStudent(
  id: string,
  name: string,
  avatar: string,
  currentLessonId: number,
  masteredTables: number[],
  learningTables: number[],
  streakDays: number,
  xp: number
): StudentProfile {
  const factMastery = generateEmptyFactMastery();
  let masteredCount = 0;

  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      const key = `${a}x${b}`;
      if (masteredTables.includes(a) || masteredTables.includes(b)) {
        factMastery[key] = {
          factKey: key,
          a,
          b,
          product: a * b,
          attempts: 12,
          correct: 12,
          lastResponseTimeMs: 1400,
          averageResponseTimeMs: 1600,
          consecutiveCorrect: 5,
          status: "mastered",
          lastPracticed: new Date(Date.now() - 3600000 * 2).toISOString(),
        };
        masteredCount++;
      } else if (learningTables.includes(a) || learningTables.includes(b)) {
        const isProg = Math.random() > 0.4;
        factMastery[key] = {
          factKey: key,
          a,
          b,
          product: a * b,
          attempts: 8,
          correct: isProg ? 6 : 4,
          lastResponseTimeMs: 2800,
          averageResponseTimeMs: 3100,
          consecutiveCorrect: isProg ? 2 : 0,
          status: isProg ? "progressing" : "learning",
          lastPracticed: new Date(Date.now() - 3600000 * 8).toISOString(),
        };
      }
    }
  }

  const sampleHistory: LessonAttempt[] = [
    {
      id: `att-${id}-1`,
      studentId: id,
      lessonId: Math.max(1, currentLessonId - 1),
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      durationSeconds: 300,
      accuracyPercent: 92,
      totalQuestions: 24,
      correctCount: 22,
      errorFacts: ["6x7", "8x7"],
      starsEarned: 3,
    },
    {
      id: `att-${id}-2`,
      studentId: id,
      lessonId: currentLessonId,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      durationSeconds: 295,
      accuracyPercent: 88,
      totalQuestions: 26,
      correctCount: 23,
      errorFacts: ["7x8"],
      starsEarned: 2,
    },
  ];

  return {
    id,
    name,
    avatar,
    currentLessonId,
    totalMinutesPracticed: (currentLessonId * 5) + 10,
    totalLessonsCompleted: currentLessonId,
    streakDays,
    xp,
    lastActive: new Date(Date.now() - 3600000 * 4).toISOString(),
    factMastery,
    lessonHistory: sampleHistory,
  };
}

const SEED_STUDENTS: StudentProfile[] = [
  {
    id: "student-1",
    name: "Student",
    avatar: "🦁",
    currentLessonId: 1,
    totalMinutesPracticed: 0,
    totalLessonsCompleted: 0,
    streakDays: 0,
    xp: 0,
    lastActive: new Date().toISOString(),
    factMastery: generateEmptyFactMastery(),
    lessonHistory: [],
  },
];

export function loadAllStudents(): StudentProfile[] {
  if (typeof window === "undefined") return SEED_STUDENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_STUDENTS));
      return SEED_STUDENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return SEED_STUDENTS;
  } catch {
    return SEED_STUDENTS;
  }
}

export function saveAllStudents(students: StudentProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch (err) {
    console.error("Error saving students:", err);
  }
}

export function getActiveStudentId(): string {
  if (typeof window === "undefined") return "s1";
  return localStorage.getItem(ACTIVE_STUDENT_KEY) || "s1";
}

export function setActiveStudentId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_STUDENT_KEY, id);
}

export function getStudentById(id: string): StudentProfile | null {
  const students = loadAllStudents();
  return students.find((s) => s.id === id) || null;
}

export function createNewStudent(name: string, avatar: string): StudentProfile {
  const students = loadAllStudents();
  const newStudent: StudentProfile = {
    id: `student-${Date.now()}`,
    name,
    avatar,
    currentLessonId: 1,
    totalMinutesPracticed: 0,
    totalLessonsCompleted: 0,
    streakDays: 1,
    xp: 0,
    lastActive: new Date().toISOString(),
    factMastery: generateEmptyFactMastery(),
    lessonHistory: [],
  };
  const updated = [...students, newStudent];
  saveAllStudents(updated);
  setActiveStudentId(newStudent.id);
  return newStudent;
}

export function recordFactResult(
  studentId: string,
  a: number,
  b: number,
  isCorrect: boolean,
  responseTimeMs: number
): void {
  const students = loadAllStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return;

  const key1 = `${a}x${b}`;
  const key2 = `${b}x${a}`; // Symmetrical fact tracking

  const updateKey = (key: string) => {
    let record = student.factMastery[key];
    if (!record) {
      record = {
        factKey: key,
        a,
        b,
        product: a * b,
        attempts: 0,
        correct: 0,
        lastResponseTimeMs: 0,
        averageResponseTimeMs: 0,
        consecutiveCorrect: 0,
        status: "unreached",
        lastPracticed: new Date().toISOString(),
      };
    }

    record.attempts += 1;
    record.lastPracticed = new Date().toISOString();
    record.lastResponseTimeMs = responseTimeMs;

    if (isCorrect) {
      record.correct += 1;
      record.consecutiveCorrect += 1;
      record.averageResponseTimeMs =
        record.averageResponseTimeMs === 0
          ? responseTimeMs
          : Math.round((record.averageResponseTimeMs * 0.7) + (responseTimeMs * 0.3));

      // Direct Instruction Mastery Criterion:
      // Mastered if 3+ consecutive correct AND average response time < 2500ms
      if (record.consecutiveCorrect >= 3 && record.averageResponseTimeMs <= 2500) {
        record.status = "mastered";
      } else if (record.consecutiveCorrect >= 2) {
        record.status = "progressing";
      } else {
        record.status = "learning";
      }
    } else {
      record.consecutiveCorrect = 0;
      record.status = "learning";
    }

    student.factMastery[key] = record;
  };

  updateKey(key1);
  if (key1 !== key2) {
    updateKey(key2);
  }

  student.lastActive = new Date().toISOString();
  saveAllStudents(students);
}

export function recordLessonComplete(
  studentId: string,
  attempt: Omit<LessonAttempt, "id" | "studentId" | "timestamp">
): StudentProfile | null {
  const students = loadAllStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return null;

  const newAttempt: LessonAttempt = {
    ...attempt,
    id: `att-${Date.now()}`,
    studentId,
    timestamp: new Date().toISOString(),
  };

  student.lessonHistory.unshift(newAttempt);
  student.totalLessonsCompleted += 1;
  student.totalMinutesPracticed += Math.max(1, Math.round(attempt.durationSeconds / 60));
  
  // Award XP (bonus 150 XP if checkout was verified)
  const masteryBonus = attempt.checkoutPassed ? 150 : 0;
  student.xp += attempt.starsEarned * 50 + attempt.correctCount * 5 + masteryBonus;
  student.streakDays = (student.streakDays || 0) + 1;
  student.lastActive = new Date().toISOString();

  // Direct Instruction Rule: Only advance lesson if Checkout Gate was actually passed!
  const isMastered = attempt.checkoutPassed ?? (attempt.accuracyPercent >= 80);
  if (isMastered && student.currentLessonId === attempt.lessonId) {
    student.currentLessonId = Math.min(11, student.currentLessonId + 1);
  }

  saveAllStudents(students);
  return student;
}

export function resetStudent(studentId: string): void {
  const students = loadAllStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return;

  student.currentLessonId = 1;
  student.totalMinutesPracticed = 0;
  student.totalLessonsCompleted = 0;
  student.streakDays = 1;
  student.xp = 0;
  student.factMastery = generateEmptyFactMastery();
  student.lessonHistory = [];
  student.lastActive = new Date().toISOString();

  saveAllStudents(students);
}

export function computeTeacherAnalytics(): TeacherAnalytics {
  const students = loadAllStudents();
  if (students.length === 0) {
    return {
      totalStudents: 0,
      totalLessonsCompleted: 0,
      classAverageMastery: 0,
      classAverageAccuracy: 0,
      totalMinutesLogged: 0,
      strugglingFacts: [],
    };
  }

  let totalLessons = 0;
  let totalMinutes = 0;
  let totalAccuracySum = 0;
  let accuracyCount = 0;
  let totalMasteredFactsSum = 0;

  // Track error frequency per fact across whole class
  const factErrorCount: Record<string, { errors: number; students: Set<string> }> = {};

  students.forEach((s) => {
    totalLessons += s.totalLessonsCompleted;
    totalMinutes += s.totalMinutesPracticed;

    // Count mastered facts (1x1 to 9x9 -> 81 total)
    const mastered = Object.values(s.factMastery).filter((f) => f.status === "mastered").length;
    totalMasteredFactsSum += (mastered / 81) * 100;

    // Accuracy from history
    s.lessonHistory.forEach((h) => {
      totalAccuracySum += h.accuracyPercent;
      accuracyCount++;
      h.errorFacts.forEach((ef) => {
        if (!factErrorCount[ef]) {
          factErrorCount[ef] = { errors: 0, students: new Set() };
        }
        factErrorCount[ef].errors++;
        factErrorCount[ef].students.add(s.id);
      });
    });
  });

  const strugglingFacts = Object.entries(factErrorCount)
    .map(([factKey, data]) => ({
      factKey,
      errorCount: data.errors,
      affectedStudentsCount: data.students.size,
    }))
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 6);

  return {
    totalStudents: students.length,
    totalLessonsCompleted: totalLessons,
    classAverageMastery: Math.round(totalMasteredFactsSum / students.length),
    classAverageAccuracy: accuracyCount > 0 ? Math.round(totalAccuracySum / accuracyCount) : 88,
    totalMinutesLogged: totalMinutes,
    strugglingFacts,
  };
}

export function exportClassDataCsv(): string {
  const students = loadAllStudents();
  const headers = [
    "Student ID",
    "Name",
    "Current Lesson",
    "Total Lessons Completed",
    "Total Minutes",
    "Mastered Facts (out of 81)",
    "Streak Days",
    "XP",
    "Last Active",
  ];

  const rows = students.map((s) => {
    const mastered = Object.values(s.factMastery).filter((f) => f.status === "mastered").length;
    return [
      s.id,
      `"${s.name}"`,
      s.currentLessonId,
      s.totalLessonsCompleted,
      s.totalMinutesPracticed,
      mastered,
      s.streakDays,
      s.xp,
      s.lastActive,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
