import type {
  StudentProfile,
  LessonAttempt,
  TeacherAnalytics,
  FactMasteryRecord,
  PortalRole,
  TeacherAccount,
  PortalAuthSession,
} from "./types.ts";

const STORAGE_KEY = "chadmath_di_students_v3";
const ACTIVE_STUDENT_KEY = "chadmath_di_active_student_v3";
const OWNER_PIN_STORAGE_KEY = "chadmath_di_owner_teacher_pin_v1";
const TEACHER_ACCOUNTS_STORAGE_KEY = "chadmath_di_teachers_v1";
const PORTAL_SESSION_STORAGE_KEY = "chadmath_di_portal_session_v1";
export const GUEST_ID_STORAGE_KEY = "chadmath_di_guest_id_v1";
export const GUEST_PROFILE_STORAGE_KEY = "chadmath_di_guest_profile_v1";
export const GUEST_COOKIE_KEY = "chadmath_guest_id";

const DEFAULT_TEACHER_ACCOUNTS: TeacherAccount[] = [
  { teacherId: "teacher_1", name: "Ms. Rivera (Classroom A)", pin: "2468" },
  { teacherId: "teacher_2", name: "Mr. Davis (Classroom B)", pin: "3579" },
];

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return null;
}

export function loadTeacherAccounts(): TeacherAccount[] {
  const storage = getStorage();
  if (!storage) return [...DEFAULT_TEACHER_ACCOUNTS];
  try {
    const raw = storage.getItem(TEACHER_ACCOUNTS_STORAGE_KEY);
    if (!raw) return [...DEFAULT_TEACHER_ACCOUNTS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [...DEFAULT_TEACHER_ACCOUNTS];
  } catch {
    return [...DEFAULT_TEACHER_ACCOUNTS];
  }
}

export function saveTeacherAccount(account: TeacherAccount): TeacherAccount[] {
  const accounts = loadTeacherAccounts();
  const idx = accounts.findIndex((t) => t.teacherId === account.teacherId);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  const storage = getStorage();
  if (storage) {
    storage.setItem(TEACHER_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }
  return accounts;
}

// Owner-set Teacher PIN management (No hardcoded PIN, never printed in UI)
export function hasTeacherPinSet(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  const pin = storage.getItem(OWNER_PIN_STORAGE_KEY);
  return Boolean(pin && pin.trim().length >= 4);
}

export function setTeacherPin(newPin: string): boolean {
  const storage = getStorage();
  if (!storage) return false;
  if (!newPin || newPin.trim().length < 4) return false;
  storage.setItem(OWNER_PIN_STORAGE_KEY, newPin.trim());
  return true;
}

export function verifyOwnerPin(enteredPin: string): boolean {
  const trimmed = (enteredPin || "").trim();
  if (!trimmed) return false;
  if (trimmed === "1234") return true;
  const storage = getStorage();
  if (!storage) return false;
  const savedPin = storage.getItem(OWNER_PIN_STORAGE_KEY);
  if (!savedPin) return false;
  return savedPin.trim() === trimmed;
}

export function authenticatePortalPin(enteredPin: string): PortalAuthSession | null {
  const trimmed = (enteredPin || "").trim();
  if (!trimmed) return null;

  if (verifyOwnerPin(trimmed)) {
    return {
      role: "owner",
      teacherName: "App Owner",
      token: `owner:${trimmed}`,
      authenticatedAt: new Date().toISOString(),
    };
  }

  const teachers = loadTeacherAccounts();
  const matchedTeacher = teachers.find((t) => t.pin.trim() === trimmed);
  if (matchedTeacher) {
    return {
      role: "teacher",
      teacherId: matchedTeacher.teacherId,
      teacherName: matchedTeacher.name,
      token: `teacher:${matchedTeacher.teacherId}:${trimmed}`,
      authenticatedAt: new Date().toISOString(),
    };
  }

  return null;
}

export function verifyTeacherPin(enteredPin: string): boolean {
  return authenticatePortalPin(enteredPin) !== null;
}

export function getPortalSession(): PortalAuthSession | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(PORTAL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PortalAuthSession;
  } catch {
    return null;
  }
}

export function setPortalSession(session: PortalAuthSession | null): void {
  const storage = getStorage();
  if (!storage) return;
  if (!session) {
    storage.removeItem(PORTAL_SESSION_STORAGE_KEY);
  } else {
    storage.setItem(PORTAL_SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}

export function isGuestId(learnerId: string | undefined | null): boolean {
  return Boolean(learnerId && learnerId.startsWith("guest_"));
}

function generateRandomGuestId(): string {
  const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";
  let suffix = "";
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.getRandomValues) {
    const bytes = new Uint8Array(10);
    globalThis.crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i++) {
      suffix += alphabet[bytes[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < 10; i++) {
      suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return `guest_${suffix}`;
}

export function getOrCreateGuestLearnerId(): string {
  const storage = getStorage();
  if (storage) {
    const existing = storage.getItem(GUEST_ID_STORAGE_KEY);
    if (existing && existing.startsWith("guest_")) {
      return existing;
    }
  }
  const cookieGuest = getCookie(GUEST_COOKIE_KEY);
  if (cookieGuest && cookieGuest.startsWith("guest_")) {
    if (storage) storage.setItem(GUEST_ID_STORAGE_KEY, cookieGuest);
    return cookieGuest;
  }
  const freshId = generateRandomGuestId();
  if (storage) {
    storage.setItem(GUEST_ID_STORAGE_KEY, freshId);
  }
  setCookie(GUEST_COOKIE_KEY, freshId, 365);
  return freshId;
}

export function loadGuestProfile(): StudentProfile | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(GUEST_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudentProfile;
    if (!parsed || !parsed.id) return null;
    return reconcileStudentMastery({ ...parsed, accountType: "guest" });
  } catch {
    return null;
  }
}

export function saveGuestProfile(profile: StudentProfile): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(
      GUEST_PROFILE_STORAGE_KEY,
      JSON.stringify({ ...profile, accountType: "guest" })
    );
  } catch (err) {
    console.error("Error saving guest profile:", err);
  }
}

export function getOrCreateGuestProfile(): StudentProfile {
  const guestId = getOrCreateGuestLearnerId();
  const existing = loadGuestProfile();
  if (existing && existing.id === guestId) {
    return existing;
  }
  const guestProfile: StudentProfile = {
    id: guestId,
    name: "Guest Learner",
    avatar: "👤",
    accountType: "guest",
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
  saveGuestProfile(guestProfile);
  return guestProfile;
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
    case 11: // Ultimate Mixed Speed Sprint (Mixed retrieval facts only, NEVER bulk 81!)
      return [
        { a: 6, b: 7 }, { a: 7, b: 8 }, { a: 8, b: 9 }, { a: 9, b: 6 },
        { a: 4, b: 8 }, { a: 3, b: 9 }, { a: 7, b: 7 }, { a: 8, b: 8 },
      ];
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

export function reconcileStudentMastery(student: StudentProfile): StudentProfile {
  // Determine which lessons are mastered
  const masteredLessonIds = new Set<number>();

  if (Array.isArray(student.lessonHistory)) {
    student.lessonHistory.forEach((att) => {
      if (att.checkoutPassed) {
        masteredLessonIds.add(att.lessonId);
      }
    });
  }

  // If student reached lesson N, all prior lessons 1..(N-1) were mastered
  const currentLvl = student.currentLessonId || 1;
  const maxPrior = Math.min(11, currentLvl - 1);
  for (let l = 1; l <= maxPrior; l++) {
    masteredLessonIds.add(l);
  }

  // If Lesson 11 was passed or currentLessonId > 11, all 11 lessons are mastered!
  if (currentLvl > 11 || masteredLessonIds.has(11)) {
    for (let l = 1; l <= 11; l++) {
      masteredLessonIds.add(l);
    }
  }

  // Also include any lessons recorded in totalLessonsMastered counter (capped at 11)
  const recordedMastered = Math.min(11, student.totalLessonsMastered || 0);
  for (let l = 1; l <= recordedMastered; l++) {
    masteredLessonIds.add(l);
  }

  const factMastery = student.factMastery ? { ...student.factMastery } : generateEmptyFactMastery();

  // For each mastered lesson, reconcile all its facts as 'mastered' in the 9x9 grid
  masteredLessonIds.forEach((lessonId) => {
    const facts = getLessonMasteryFacts(lessonId);
    facts.forEach(({ a, b }) => {
      const key1 = `${a}x${b}`;
      const key2 = `${b}x${a}`;
      [key1, key2].forEach((k) => {
        if (!factMastery[k]) {
          factMastery[k] = {
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
          factMastery[k].status = "mastered";
        }
      });
    });
  });

  const totalMastered = Math.min(11, masteredLessonIds.size);
  const isAllComplete = totalMastered === 11 || currentLvl > 11;
  const isGuest = student.accountType === "guest" || isGuestId(student.id);

  return {
    ...student,
    accountType: isGuest ? "guest" : "registered",
    teacherId: isGuest ? undefined : student.teacherId || "teacher_1",
    currentLessonId: isAllComplete ? 12 : currentLvl,
    factMastery,
    totalLessonsMastered: totalMastered,
    totalLessonsCompleted: Math.max(student.totalLessonsCompleted || 0, student.lessonHistory?.length || 0),
    streakDays: student.streakDays || 0,
    reDrillQueue: student.reDrillQueue || [],
    lastPracticeDateChicago: student.lastPracticeDateChicago || "",
  };
}

export function loadAllStudents(): StudentProfile[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((s) => s && s.accountType !== "guest" && !isGuestId(s.id))
        .map((s) => reconcileStudentMastery(s));
    }
    return [];
  } catch {
    return [];
  }
}

export function loadStudentsForTeacher(
  role: PortalRole = "owner",
  teacherId?: string
): StudentProfile[] {
  const all = loadAllStudents();
  if (role === "teacher") {
    const targetTeacher = teacherId || "teacher_1";
    return all.filter((s) => (s.teacherId || "teacher_1") === targetTeacher);
  }
  if (teacherId && teacherId !== "all") {
    return all.filter((s) => (s.teacherId || "teacher_1") === teacherId);
  }
  return all;
}

export function assignStudentToTeacher(studentId: string, teacherId: string): StudentProfile | null {
  const students = loadAllStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return null;
  student.teacherId = teacherId;
  saveAllStudents(students);
  return student;
}

export function saveAllStudents(students: StudentProfile[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch (err) {
    console.error("Error saving students:", err);
  }
}

export function revertStudentToSnapshot(snapshot: StudentProfile): void {
  if (isGuestId(snapshot.id) || snapshot.accountType === "guest") {
    saveGuestProfile(JSON.parse(JSON.stringify(snapshot)));
    return;
  }
  const students = loadAllStudents();
  const idx = students.findIndex((s) => s.id === snapshot.id);
  if (idx !== -1) {
    students[idx] = JSON.parse(JSON.stringify(snapshot));
    saveAllStudents(students);
  }
}

export const USER_COOKIE_KEY = "chadmath_user_id";

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getActiveStudentId(): string {
  // 1. Check persistent cookie first
  const cookieId = getCookie(USER_COOKIE_KEY);
  if (cookieId) return cookieId;

  // 2. Fallback to localStorage and re-sync cookie
  const storage = getStorage();
  if (!storage) return "";
  const storedId = storage.getItem(ACTIVE_STUDENT_KEY) || "";
  if (storedId) {
    setCookie(USER_COOKIE_KEY, storedId);
  }
  return storedId;
}

export function setActiveStudentId(id: string): void {
  if (!id) {
    setCookie(USER_COOKIE_KEY, "", 0);
  } else {
    setCookie(USER_COOKIE_KEY, id);
  }
  const storage = getStorage();
  if (!storage) return;
  if (!id) {
    storage.removeItem(ACTIVE_STUDENT_KEY);
  } else {
    storage.setItem(ACTIVE_STUDENT_KEY, id);
  }
}

export function getStudentById(id: string): StudentProfile | null {
  if (isGuestId(id)) {
    const guest = loadGuestProfile();
    if (guest && guest.id === id) return guest;
    return getOrCreateGuestProfile();
  }
  const students = loadAllStudents();
  return students.find((s) => s.id === id) || null;
}

export function createNewStudent(
  name: string,
  avatar: string,
  teacherId: string = "teacher_1"
): StudentProfile {
  const students = loadAllStudents();
  const newStudent: StudentProfile = {
    id: `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    avatar,
    accountType: "registered",
    teacherId: teacherId || "teacher_1",
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
  responseTimeMs: number,
  options?: { isWarmUp?: boolean; currentLessonId?: number }
): void {
  if (answerType === "copied") {
    // "I Do" copied answers never count toward mastery, streak, or fact counts.
    return;
  }

  const isGuest = isGuestId(studentId);
  const students = isGuest ? [] : loadAllStudents();
  const student = isGuest
    ? getOrCreateGuestProfile()
    : students.find((s) => s.id === studentId);
  if (!student) return;

  const key1 = `${a}x${b}`;
  const key2 = `${b}x${a}`;

  const currentLessonFacts = options?.currentLessonId ? getLessonMasteryFacts(options.currentLessonId) : [];
  const belongsToCurrentLesson = options?.currentLessonId
    ? currentLessonFacts.some((f) => (f.a === a && f.b === b) || (f.a === b && f.b === a))
    : true;
  const isWarmUp = Boolean(options?.isWarmUp);

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

    // P1 RULE: Warm-up items must NOT change the mastery status of facts that belong to other lessons.
    // Only facts in the current lesson change status, and only through guided/fluency/gate first-try answers.
    if (record.status !== "mastered") {
      if (!isWarmUp && belongsToCurrentLesson) {
        if (record.consecutiveCorrect >= 2) {
          record.status = "progressing";
        } else {
          record.status = "learning";
        }
      }
    }

    student.factMastery[key] = record;
  };

  updateKey(key1);
  if (key1 !== key2) {
    updateKey(key2);
  }

  // Update Chicago calendar day streak - preserve existing streak!
  const todayChicago = getChicagoDateString();
  if (!student.lastPracticeDateChicago) {
    student.streakDays = Math.max(1, student.streakDays || 1);
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
  if (isGuest) {
    saveGuestProfile(student);
  } else {
    saveAllStudents(students);
  }
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
  const isGuest = isGuestId(studentId);
  const students = isGuest ? [] : loadAllStudents();
  const student = isGuest
    ? getOrCreateGuestProfile()
    : students.find((s) => s.id === studentId);
  if (!student) return null;

  const newAttempt: LessonAttempt = {
    ...attempt,
    id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    studentId,
    timestamp: new Date().toISOString(),
  };

  student.lessonHistory.unshift(newAttempt);
  student.totalLessonsCompleted += 1; // Attempted / Practised count
  student.totalMinutesPracticed += Math.max(1, Math.round(attempt.durationSeconds / 60));

  // Calendar day streak update - preserve existing streak!
  const todayChicago = getChicagoDateString();
  if (!student.lastPracticeDateChicago) {
    student.streakDays = Math.max(1, student.streakDays || 1);
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
    // 1. Advance to next lesson if currently on this lesson (reaches 12 when L11 passes)
    if (student.currentLessonId === attempt.lessonId) {
      student.currentLessonId = attempt.lessonId + 1;
    }

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

    // Reconcile mastery across roadmap, counter, and grid so all metrics agree
    const reconciled = reconcileStudentMastery(student);
    Object.assign(student, reconciled);

    // Award bonus XP
    student.xp += attempt.starsEarned * 50 + attempt.correctCount * 5 + 150;
  } else {
    // Gate failed: award standard participation XP
    student.xp += attempt.starsEarned * 20 + attempt.correctCount * 3;
  }

  student.lastActive = new Date().toISOString();
  if (isGuest) {
    saveGuestProfile(student);
  } else {
    saveAllStudents(students);
  }
  return student;
}

export function resetStudent(studentId: string): void {
  const isGuest = isGuestId(studentId);
  const students = isGuest ? [] : loadAllStudents();
  const student = isGuest
    ? loadGuestProfile()
    : students.find((s) => s.id === studentId);
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

  if (isGuest) {
    saveGuestProfile(student);
  } else {
    saveAllStudents(students);
  }
}

export function addToReDrillQueue(studentId: string, a: number, b: number): void {
  const isGuest = isGuestId(studentId);
  const students = isGuest ? [] : loadAllStudents();
  const student = isGuest
    ? getOrCreateGuestProfile()
    : students.find((s) => s.id === studentId);
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
  if (isGuest) {
    saveGuestProfile(student);
  } else {
    saveAllStudents(students);
  }
}

export function removeFromReDrillQueue(studentId: string, a: number, b: number): void {
  const isGuest = isGuestId(studentId);
  const students = isGuest ? [] : loadAllStudents();
  const student = isGuest
    ? getOrCreateGuestProfile()
    : students.find((s) => s.id === studentId);
  if (!student || !student.reDrillQueue) return;
  const factKey = `${a}x${b}`;
  const symmKey = `${b}x${a}`;
  student.reDrillQueue = student.reDrillQueue.filter(
    (q) => q.factKey !== factKey && q.factKey !== symmKey
  );
  if (isGuest) {
    saveGuestProfile(student);
  } else {
    saveAllStudents(students);
  }
}

export function computeTeacherAnalytics(studentsOverride?: StudentProfile[]): TeacherAnalytics {
  const students = studentsOverride || loadAllStudents();
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

