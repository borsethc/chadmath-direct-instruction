import { StudentProfile, LessonAttempt, TeacherAnalytics, FactMasteryRecord } from "./types";

const STORAGE_KEY = "chadmath_di_students_v3";
const ACTIVE_STUDENT_KEY = "chadmath_di_active_student_v3";
const OWNER_PIN_STORAGE_KEY = "chadmath_di_owner_teacher_pin_v1";

// Owner-set Teacher PIN management (No hardcoded PIN, never printed in UI)
export function hasTeacherPinSet(): boolean {
  if (typeof window === "undefined") return false;
  const pin = localStorage.getItem(OWNER_PIN_STORAGE_KEY);
  return Boolean(pin && pin.trim().length >= 4);
}

export function setTeacherPin(newPin: string): boolean {
  if (typeof window === "undefined") return false;
  if (!newPin || newPin.trim().length < 4) return false;
  localStorage.setItem(OWNER_PIN_STORAGE_KEY, newPin.trim());
  return true;
}

export function verifyTeacherPin(enteredPin: string): boolean {
  if (typeof window === "undefined") return false;
  const savedPin = localStorage.getItem(OWNER_PIN_STORAGE_KEY);
  if (!savedPin) return false;
  return savedPin.trim() === enteredPin.trim();
}

// America/Chicago calendar date helper (YYYY-MM-DD)
export function getChicagoDateString(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function daysBetweenDates(d1: string, d2: string): number {
  const [y1, m1, d1_num] = d1.split("-").map(Number);
  const [y2, m2, d2_num] = d2.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1_num);
  const utc2 = Date.UTC(y2, m2 - 1, d2_num);
  return Math.round((utc2 - utc1) / 86400000);
}

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
        firstTryCorrect: 0,
        correctedCount: 0,
        missedDates: [],
      };
    }
  }
  return map;
}

// Exact partition of facts introduced / mastered per lesson
export function getLessonMasteryFacts(lessonId: number): { a: number; b: number }[] {
  switch (lessonId) {
    case 1: // 1s (all 1xN and Nx1: 17 facts)
      return [
        { a: 1, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 1 }, { a: 1, b: 3 }, { a: 3, b: 1 },
        { a: 1, b: 4 }, { a: 4, b: 1 }, { a: 1, b: 5 }, { a: 5, b: 1 }, { a: 1, b: 6 },
        { a: 6, b: 1 }, { a: 1, b: 7 }, { a: 7, b: 1 }, { a: 1, b: 8 }, { a: 8, b: 1 },
        { a: 1, b: 9 }, { a: 9, b: 1 },
      ];
    case 2: // 2s (all 2xN and Nx2 not in L1: 15 facts)
      return [
        { a: 2, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 2 }, { a: 2, b: 4 }, { a: 4, b: 2 },
        { a: 2, b: 5 }, { a: 5, b: 2 }, { a: 2, b: 6 }, { a: 6, b: 2 }, { a: 2, b: 7 },
        { a: 7, b: 2 }, { a: 2, b: 8 }, { a: 8, b: 2 }, { a: 2, b: 9 }, { a: 9, b: 2 },
      ];
    case 3: // 5s (all 5xN and Nx5 not in L1, L2: 13 facts)
      return [
        { a: 5, b: 3 }, { a: 3, b: 5 }, { a: 5, b: 4 }, { a: 4, b: 5 }, { a: 5, b: 5 },
        { a: 5, b: 6 }, { a: 6, b: 5 }, { a: 5, b: 7 }, { a: 7, b: 5 }, { a: 5, b: 8 },
        { a: 8, b: 5 }, { a: 5, b: 9 }, { a: 9, b: 5 },
      ];
    case 4: // 3s (all 3xN and Nx3 not in L1..L3: 11 facts)
      return [
        { a: 3, b: 3 }, { a: 3, b: 4 }, { a: 4, b: 3 }, { a: 3, b: 6 }, { a: 6, b: 3 },
        { a: 3, b: 7 }, { a: 7, b: 3 }, { a: 3, b: 8 }, { a: 8, b: 3 }, { a: 3, b: 9 },
        { a: 9, b: 3 },
      ];
    case 5: // 4s (all 4xN and Nx4 not in L1..L4: 9 facts)
      return [
        { a: 4, b: 4 }, { a: 4, b: 6 }, { a: 6, b: 4 }, { a: 4, b: 7 }, { a: 7, b: 4 },
        { a: 4, b: 8 }, { a: 8, b: 4 }, { a: 4, b: 9 }, { a: 9, b: 4 },
      ];
    case 6: // 9s (all 9xN and Nx9 not in L1..L5: 7 facts)
      return [
        { a: 9, b: 6 }, { a: 6, b: 9 }, { a: 9, b: 7 }, { a: 7, b: 9 }, { a: 9, b: 8 },
        { a: 8, b: 9 }, { a: 9, b: 9 },
      ];
    case 7: // Perfect Squares (6x6, 7x7, 8x8: 3 facts)
      return [
        { a: 6, b: 6 }, { a: 7, b: 7 }, { a: 8, b: 8 },
      ];
    case 8: // Landmark Sixes (6x7, 7x6, 6x8, 8x6: 4 facts)
      return [
        { a: 6, b: 7 }, { a: 7, b: 6 }, { a: 6, b: 8 }, { a: 8, b: 6 },
      ];
    case 9: // Tricky Eights (8x7, 7x8: 2 facts)
      return [
        { a: 8, b: 7 }, { a: 7, b: 8 },
      ];
    case 10: // Summit Fact & 7s consolidation
      return [
        { a: 7, b: 8 }, { a: 8, b: 7 },
      ];
    case 11: // Ultimate Mixed Speed Sprint
      const all: { a: number; b: number }[] = [];
      for (let a = 1; a <= 9; a++) {
        for (let b = 1; b <= 9; b++) {
          all.push({ a, b });
        }
      }
      return all;
    default:
      return [];
  }
}

const SEED_STUDENTS: StudentProfile[] = [
  {
    id: "student-1",
    name: "Student",
    avatar: "🦁",
    currentLessonId: 1,
    totalMinutesPracticed: 0,
    totalLessonsCompleted: 0,
    totalLessonsMastered: 0,
    streakDays: 0,
    lastPracticeDateChicago: "",
    xp: 0,
    lastActive: new Date().toISOString(),
    factMastery: generateEmptyFactMastery(),
    lessonHistory: [],
    reDrillQueue: [],
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
      // Ensure all fields exist
      return parsed.map((s) => ({
        ...s,
        totalLessonsMastered: s.totalLessonsMastered ?? 0,
        totalLessonsCompleted: s.totalLessonsCompleted ?? 0,
        reDrillQueue: s.reDrillQueue ?? [],
        lastPracticeDateChicago: s.lastPracticeDateChicago ?? "",
        factMastery: s.factMastery ?? generateEmptyFactMastery(),
      }));
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
  if (typeof window === "undefined") return "student-1";
  return localStorage.getItem(ACTIVE_STUDENT_KEY) || "student-1";
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
    totalLessonsMastered: 0,
    streakDays: 0,
    lastPracticeDateChicago: "",
    xp: 0,
    lastActive: new Date().toISOString(),
    factMastery: generateEmptyFactMastery(),
    lessonHistory: [],
    reDrillQueue: [],
  };
  const updated = [...students, newStudent];
  saveAllStudents(updated);
  setActiveStudentId(newStudent.id);
  return newStudent;
}

// Track an answer: "first-try" | "corrected" | "copied"
// CRITICAL: Copied answers NEVER count toward mastery, streak, or fact counts.
export function recordFactAnswer(
  studentId: string,
  a: number,
  b: number,
  answerType: "first-try" | "corrected" | "copied",
  isCorrect: boolean,
  responseTimeMs: number
): void {
  if (answerType === "copied") {
    // "I Do" copied answers never count toward mastery, streak, or fact counts.
    return;
  }

  const students = loadAllStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return;

  const key1 = `${a}x${b}`;
  const key2 = `${b}x${a}`;

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
        firstTryCorrect: 0,
        correctedCount: 0,
        missedDates: [],
      };
    }

    record.lastPracticed = new Date().toISOString();
    record.lastResponseTimeMs = responseTimeMs;

    if (answerType === "first-try") {
      record.attempts += 1;
      if (isCorrect) {
        record.correct += 1;
        record.firstTryCorrect = (record.firstTryCorrect || 0) + 1;
        record.consecutiveCorrect += 1;
        record.averageResponseTimeMs =
          record.averageResponseTimeMs === 0
            ? responseTimeMs
            : Math.round(record.averageResponseTimeMs * 0.7 + responseTimeMs * 0.3);
        
        // Remove from re-drill queue if answered correctly on first try
        if (student.reDrillQueue) {
          student.reDrillQueue = student.reDrillQueue.filter(
            (q) => q.factKey !== key1 && q.factKey !== key2
          );
        }
      } else {
        record.consecutiveCorrect = 0;
        if (!record.missedDates) record.missedDates = [];
        const today = getChicagoDateString();
        if (!record.missedDates.includes(today)) {
          record.missedDates.push(today);
        }
        // Add to re-drill queue
        if (!student.reDrillQueue) student.reDrillQueue = [];
        if (!student.reDrillQueue.some((q) => q.factKey === key1 || q.factKey === key2)) {
          student.reDrillQueue.push({
            factKey: key1,
            a,
            b,
            missedAt: new Date().toISOString(),
          });
        }
      }
    } else if (answerType === "corrected") {
      // Track that this was corrected, but do NOT give first-try mastery credit
      record.correctedCount = (record.correctedCount || 0) + 1;
    }

    // A fact ONLY becomes mastered when its lesson checkout gate is passed.
    // In-drill answers only advance status from unreached to learning/progressing.
    if (record.status !== "mastered") {
      if (record.consecutiveCorrect >= 2) {
        record.status = "progressing";
      } else {
        record.status = "learning";
      }
    }

    student.factMastery[key] = record;
  };

  updateKey(key1);
  if (key1 !== key2) {
    updateKey(key2);
  }

  // Update Chicago calendar day streak
  const todayChicago = getChicagoDateString();
  if (!student.lastPracticeDateChicago) {
    student.streakDays = 1;
    student.lastPracticeDateChicago = todayChicago;
  } else if (student.lastPracticeDateChicago !== todayChicago) {
    const diff = daysBetweenDates(student.lastPracticeDateChicago, todayChicago);
    if (diff === 1) {
      student.streakDays = (student.streakDays || 0) + 1;
    } else if (diff > 1) {
      student.streakDays = 1;
    }
    student.lastPracticeDateChicago = todayChicago;
  }

  student.lastActive = new Date().toISOString();
  saveAllStudents(students);
}

// Deprecated alias for backwards-compat in existing callers
export function recordFactResult(
  studentId: string,
  a: number,
  b: number,
  isCorrect: boolean,
  responseTimeMs: number
): void {
  recordFactAnswer(studentId, a, b, "first-try", isCorrect, responseTimeMs);
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
  student.totalLessonsCompleted += 1; // Attempted / Practised count
  student.totalMinutesPracticed += Math.max(1, Math.round(attempt.durationSeconds / 60));

  // Calendar day streak update
  const todayChicago = getChicagoDateString();
  if (!student.lastPracticeDateChicago) {
    student.streakDays = 1;
    student.lastPracticeDateChicago = todayChicago;
  } else if (student.lastPracticeDateChicago !== todayChicago) {
    const diff = daysBetweenDates(student.lastPracticeDateChicago, todayChicago);
    if (diff === 1) {
      student.streakDays = (student.streakDays || 0) + 1;
    } else if (diff > 1) {
      student.streakDays = 1;
    }
    student.lastPracticeDateChicago = todayChicago;
  }

  // Gate pass evaluation: ONLY if checkoutPassed === true
  const isMastered = Boolean(attempt.checkoutPassed);

  if (isMastered) {
    // 1. Increment totalLessonsMastered (truthful: failed gate never increments this)
    student.totalLessonsMastered = (student.totalLessonsMastered || 0) + 1;

    // 2. Mark this lesson's exact facts as mastered in the 9x9 fact grid
    const lessonFacts = getLessonMasteryFacts(attempt.lessonId);
    lessonFacts.forEach(({ a, b }) => {
      const key1 = `${a}x${b}`;
      const key2 = `${b}x${a}`;
      [key1, key2].forEach((k) => {
        if (!student.factMastery[k]) {
          student.factMastery[k] = {
            factKey: k,
            a,
            b,
            product: a * b,
            attempts: 1,
            correct: 1,
            lastResponseTimeMs: 1500,
            averageResponseTimeMs: 1500,
            consecutiveCorrect: 1,
            status: "mastered",
            lastPracticed: new Date().toISOString(),
            firstTryCorrect: 1,
            correctedCount: 0,
            missedDates: [],
          };
        } else {
          student.factMastery[k].status = "mastered";
          student.factMastery[k].lastPracticed = new Date().toISOString();
        }
      });
    });

    // 3. Advance to next lesson if currently on this lesson
    if (student.currentLessonId === attempt.lessonId) {
      student.currentLessonId = Math.min(11, student.currentLessonId + 1);
    }

    // Award bonus XP
    student.xp += attempt.starsEarned * 50 + attempt.correctCount * 5 + 150;
  } else {
    // Gate failed: award standard participation XP
    student.xp += attempt.starsEarned * 20 + attempt.correctCount * 3;
  }

  student.lastActive = new Date().toISOString();
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
  student.totalLessonsMastered = 0;
  student.streakDays = 0;
  student.lastPracticeDateChicago = "";
  student.xp = 0;
  student.factMastery = generateEmptyFactMastery();
  student.lessonHistory = [];
  student.reDrillQueue = [];
  student.lastActive = new Date().toISOString();

  saveAllStudents(students);
}

export function addToReDrillQueue(studentId: string, a: number, b: number): void {
  const students = loadAllStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return;
  if (!student.reDrillQueue) student.reDrillQueue = [];
  const factKey = `${a}x${b}`;
  const symmKey = `${b}x${a}`;
  if (!student.reDrillQueue.some((q) => q.factKey === factKey || q.factKey === symmKey)) {
    student.reDrillQueue.push({
      factKey,
      a,
      b,
      missedAt: new Date().toISOString(),
    });
  }
  const rec = student.factMastery[factKey];
  if (rec) {
    if (!rec.missedDates) rec.missedDates = [];
    const today = getChicagoDateString();
    if (!rec.missedDates.includes(today)) {
      rec.missedDates.push(today);
    }
  }
  saveAllStudents(students);
}

export function removeFromReDrillQueue(studentId: string, a: number, b: number): void {
  const students = loadAllStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student || !student.reDrillQueue) return;
  const factKey = `${a}x${b}`;
  const symmKey = `${b}x${a}`;
  student.reDrillQueue = student.reDrillQueue.filter(
    (q) => q.factKey !== factKey && q.factKey !== symmKey
  );
  saveAllStudents(students);
}

export function computeTeacherAnalytics(): TeacherAnalytics {
  const students = loadAllStudents();
  const formula = "First-Try Accuracy % = (Total First-Try Correct ÷ Total First-Try Attempts) × 100 [Excludes copied answers]";

  if (students.length === 0) {
    return {
      totalStudents: 0,
      totalLessonsCompleted: 0,
      classAverageMastery: 0,
      classAverageAccuracy: 0,
      totalMinutesLogged: 0,
      strugglingFacts: [],
      accuracyFormula: formula,
    };
  }

  let totalLessons = 0;
  let totalMinutes = 0;
  let totalAttemptsSum = 0;
  let totalFirstTryCorrectSum = 0;
  let totalMasteredFactsSum = 0;

  const factErrorCount: Record<string, { errors: number; students: Set<string> }> = {};

  students.forEach((s) => {
    totalLessons += s.totalLessonsCompleted;
    totalMinutes += s.totalMinutesPracticed;

    // Count mastered facts (1x1 to 9x9 -> 81 total)
    const mastered = Object.values(s.factMastery).filter((f) => f.status === "mastered").length;
    totalMasteredFactsSum += (mastered / 81) * 100;

    Object.values(s.factMastery).forEach((rec) => {
      totalAttemptsSum += rec.attempts;
      totalFirstTryCorrectSum += rec.firstTryCorrect || 0;
    });

    s.lessonHistory.forEach((h) => {
      h.errorFacts.forEach((ef) => {
        if (!factErrorCount[ef]) {
          factErrorCount[ef] = { errors: 0, students: new Set() };
        }
        factErrorCount[ef].errors++;
        factErrorCount[ef].students.add(s.id);
      });
    });
  });

  const classAccuracy = totalAttemptsSum > 0
    ? Math.round((totalFirstTryCorrectSum / totalAttemptsSum) * 100)
    : 100;

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
    classAverageAccuracy: classAccuracy,
    totalMinutesLogged: totalMinutes,
    strugglingFacts,
    accuracyFormula: formula,
  };
}

export function exportClassDataCsv(): string {
  const students = loadAllStudents();
  const headers = [
    "Student ID",
    "Name",
    "Current Lesson",
    "Mastered Lessons",
    "Practised Sessions",
    "Total Minutes",
    "Mastered Facts (out of 81)",
    "Streak Days (Chicago)",
    "XP",
    "Re-Drill Queue Count",
    "Last Active",
  ];

  const rows = students.map((s) => {
    const mastered = Object.values(s.factMastery).filter((f) => f.status === "mastered").length;
    const reDrillCount = s.reDrillQueue?.length || 0;
    return [
      s.id,
      `"${s.name}"`,
      s.currentLessonId,
      s.totalLessonsMastered || 0,
      s.totalLessonsCompleted || 0,
      s.totalMinutesPracticed,
      mastered,
      s.streakDays,
      s.xp,
      reDrillCount,
      s.lastActive,
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

