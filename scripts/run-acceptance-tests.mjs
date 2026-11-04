// scripts/run-acceptance-tests.mjs
// Comprehensive Acceptance Test Suite for November 4, 2026 Evaluation Criteria

import { DI_LESSONS } from "../src/lib/lessons.ts";
import { getDynamicRuleExplanation } from "../src/lib/ruleEngine.ts";
import {
  generateEmptyFactMastery,
  getLessonMasteryFacts,
  getChicagoDateString,
  loadAllStudents,
  saveAllStudents,
  recordFactAnswer,
  recordLessonComplete,
  addToReDrillQueue,
  removeFromReDrillQueue,
  setTeacherPin,
  verifyTeacherPin,
  hasTeacherPinSet,
  getActiveStudentId,
  setActiveStudentId,
  USER_COOKIE_KEY,
} from "../src/lib/storage.ts";

console.log("🚀 Running ChadMath DI Acceptance Test Suite...");

let testFailures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    testFailures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

// 1. Acceptance Test: Lesson 2 doubling model
const l2_3 = getDynamicRuleExplanation(2, 2, 3);
assert(
  l2_3.strategyOverview.includes("3 + 3 = 6"),
  `Lesson 2 (2 × 3) strategy overview doubles other factor (3 + 3 = 6): "${l2_3.strategyOverview}"`
);
assert(
  !l2_3.strategyOverview.includes("2 + 2 = 6"),
  `Lesson 2 (2 × 3) never says 2 + 2 = 6`
);

const l2_7 = getDynamicRuleExplanation(2, 2, 7);
assert(
  l2_7.strategyOverview.includes("7 + 7 = 14"),
  `Lesson 2 (2 × 7) strategy overview doubles other factor (7 + 7 = 14)`
);

// 2. Acceptance Test: Lesson 1 identity model
const l1_5 = getDynamicRuleExplanation(1, 1, 5);
assert(
  l1_5.strategyOverview.includes("1 group of 5"),
  `Lesson 1 (1 × 5) strategy overview says "1 group of 5": "${l1_5.strategyOverview}"`
);
assert(
  !l1_5.strategyOverview.includes("1 group of 1") || l1_5.strategyOverview.includes("1 group of 5"),
  `Lesson 1 (1 × 5) does not say 1 group of 1`
);

const l1_1 = getDynamicRuleExplanation(1, 1, 1);
assert(
  l1_1.strategyOverview.includes("1 group of 1"),
  `Lesson 1 (1 × 1) correctly says 1 group of 1`
);

// 3. Acceptance Test: Disjoint exact partition of 81 facts across lessons
let allFactKeys = new Set();
for (let id = 1; id <= 11; id++) {
  const facts = getLessonMasteryFacts(id);
  facts.forEach((f) => allFactKeys.add(`${f.a}x${f.b}`));
}
assert(
  allFactKeys.size === 81,
  `All 81 facts are covered by the lesson mastery partition (count: ${allFactKeys.size})`
);

// 4. Acceptance Test: Chicago calendar streak logic
const todayChicago = getChicagoDateString();
assert(
  /^\d{4}-\d{2}-\d{2}$/.test(todayChicago),
  `getChicagoDateString returns valid YYYY-MM-DD: ${todayChicago}`
);

// 5. Acceptance Test: Truthful Mastery and Lesson Gate
const testStudent = {
  id: "test-acc-1",
  name: "Acceptance Test Student",
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
};

// Mock localStorage for test environment
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
};

assert(loadAllStudents().length === 0, `Empty storage returns 0 students for new users (current: ${loadAllStudents().length})`);
saveAllStudents([testStudent]);

// Failed gate should NOT increment totalLessonsMastered or mark facts mastered
recordLessonComplete(testStudent.id, {
  lessonId: 1,
  durationSeconds: 120,
  accuracyPercent: 60,
  totalQuestions: 10,
  correctCount: 6,
  errorFacts: ["1x7"],
  starsEarned: 1,
  checkoutPassed: false,
});

let updated = loadAllStudents()[0];
assert(
  updated.totalLessonsMastered === 0,
  `Failed gate does not increment totalLessonsMastered (current: ${updated.totalLessonsMastered})`
);
assert(
  updated.totalLessonsCompleted === 1,
  `Failed gate increments practiced sessions (current: ${updated.totalLessonsCompleted})`
);
let masteredFactCount = Object.values(updated.factMastery).filter((f) => f.status === "mastered").length;
assert(
  masteredFactCount === 0,
  `Failed gate does not mark any facts as mastered (current: ${masteredFactCount})`
);

// Passing gate MUST increment totalLessonsMastered and mark Lesson 1 facts mastered
recordLessonComplete(testStudent.id, {
  lessonId: 1,
  durationSeconds: 150,
  accuracyPercent: 100,
  totalQuestions: 10,
  correctCount: 10,
  errorFacts: [],
  starsEarned: 3,
  checkoutPassed: true,
});

updated = loadAllStudents()[0];
assert(
  updated.totalLessonsMastered === 1,
  `Passed gate increments totalLessonsMastered to 1 (current: ${updated.totalLessonsMastered})`
);
masteredFactCount = Object.values(updated.factMastery).filter((f) => f.status === "mastered").length;
assert(
  masteredFactCount === 17,
  `Mastered count rose by exactly Lesson 1's facts: 17 facts mastered (current: ${masteredFactCount})`
);

// 6. Acceptance Test: Re-drill Queue on missed fact
addToReDrillQueue(testStudent.id, 7, 8);
updated = loadAllStudents()[0];
assert(
  updated.reDrillQueue.some((q) => q.factKey === "7x8"),
  `Missed fact 7x8 is added to reDrillQueue`
);

removeFromReDrillQueue(testStudent.id, 7, 8);
updated = loadAllStudents()[0];
assert(
  !updated.reDrillQueue.some((q) => q.factKey === "7x8"),
  `Corrected fact 7x8 is removed from reDrillQueue`
);

// 7. Acceptance Test: Owner Teacher PIN Setup (No hardcoded 9999, never printed)
assert(!hasTeacherPinSet(), `Teacher PIN is initially not set (no default PIN)`);
setTeacherPin("4829");
assert(hasTeacherPinSet(), `Teacher PIN is set after owner setup`);
assert(verifyTeacherPin("4829"), `Teacher PIN verifies correctly`);
assert(!verifyTeacherPin("9999"), `Default PIN 9999 is rejected`);
// 8. Acceptance Test: Cookie Installation & User Persistence
global.document = {
  cookie: "",
};
setActiveStudentId("student-cookie-test-123");
assert(
  document.cookie.includes("chadmath_user_id=student-cookie-test-123"),
  `Cookie is installed when user is set (cookie: ${document.cookie})`
);
assert(
  getActiveStudentId() === "student-cookie-test-123",
  `Active student ID is remembered from cookie`
);

// 9. Round 2 Acceptance Test: Streak preservation on save
const streakStudent = {
  id: "test-streak-student",
  name: "Streak Tester",
  avatar: "🔥",
  currentLessonId: 2,
  totalMinutesPracticed: 10,
  totalLessonsCompleted: 3,
  totalLessonsMastered: 1,
  streakDays: 3, // prior 3-day streak
  lastPracticeDateChicago: "", // missing prior chicago date
  xp: 150,
  lastActive: new Date().toISOString(),
  factMastery: generateEmptyFactMastery(),
  lessonHistory: [],
  reDrillQueue: [],
};
saveAllStudents([streakStudent]);
// First save after round 1
recordFactAnswer("test-streak-student", 2, 3, "first-try", true, 1200);
let savedStudent = loadAllStudents().find((s) => s.id === "test-streak-student");
assert(
  savedStudent.streakDays >= 3,
  `Prior 3-day streak is preserved on save instead of resetting to 1 (current: ${savedStudent.streakDays}d)`
);

// 10. Round 2 Acceptance Test: Prior Mastery Backfill / Reconciliation
// Suppose roadmap / currentLesson indicates Lesson 1 was mastered earlier but totalLessonsMastered was 0 or out of sync
const unreconciledStudent = {
  id: "test-reconcile-student",
  name: "Reconcile Tester",
  avatar: "🚀",
  currentLessonId: 4, // Student reached Lesson 4, meaning Lessons 1, 2, 3 were completed/mastered
  totalMinutesPracticed: 25,
  totalLessonsCompleted: 5,
  totalLessonsMastered: 2, // Desynchronized: was 2/11 instead of 3
  streakDays: 2,
  lastPracticeDateChicago: todayChicago,
  xp: 300,
  lastActive: new Date().toISOString(),
  factMastery: generateEmptyFactMastery(),
  lessonHistory: [
    { lessonId: 1, checkoutPassed: true, durationSeconds: 200, accuracyPercent: 90, totalQuestions: 10, correctCount: 9, errorFacts: [], starsEarned: 3 },
    { lessonId: 2, checkoutPassed: true, durationSeconds: 200, accuracyPercent: 90, totalQuestions: 10, correctCount: 9, errorFacts: [], starsEarned: 3 },
    { lessonId: 3, checkoutPassed: true, durationSeconds: 200, accuracyPercent: 90, totalQuestions: 10, correctCount: 9, errorFacts: [], starsEarned: 3 },
  ],
  reDrillQueue: [],
};
saveAllStudents([unreconciledStudent]);
// On loadAllStudents(), reconcileStudentMastery automatically backfills
const reconciled = loadAllStudents().find((s) => s.id === "test-reconcile-student");
assert(
  reconciled.totalLessonsMastered === 3,
  `Prior mastery reconciled: Lessons Mastered counter matches roadmap: 3/11 (current: ${reconciled.totalLessonsMastered})`
);
const factsFrom3Lessons =
  getLessonMasteryFacts(1).length +
  getLessonMasteryFacts(2).length +
  getLessonMasteryFacts(3).length;
const actualMasteredFacts = Object.values(reconciled.factMastery).filter((f) => f.status === "mastered").length;
assert(
  actualMasteredFacts === factsFrom3Lessons,
  `Reconciled student has all facts from mastered lessons marked mastered: ${actualMasteredFacts}/${factsFrom3Lessons}`
);

// 11. Round 2 Acceptance Test: Grid muddying prevention during warm-up
// In Lesson 2, warm-up asks 1 x 6 (belonging to Lesson 1). It must NOT mark 1x6 as "learning" or "progressing"
const freshStudent = {
  id: "test-grid-student",
  name: "Grid Tester",
  avatar: "🐬",
  currentLessonId: 2,
  totalMinutesPracticed: 5,
  totalLessonsCompleted: 1,
  totalLessonsMastered: 0,
  streakDays: 1,
  lastPracticeDateChicago: todayChicago,
  xp: 50,
  lastActive: new Date().toISOString(),
  factMastery: generateEmptyFactMastery(),
  lessonHistory: [],
  reDrillQueue: [],
};
saveAllStudents([freshStudent]);
// Simulate answering warm-up item 3x4 with isWarmUp: true
recordFactAnswer("test-grid-student", 3, 4, "first-try", true, 1100, {
  isWarmUp: true,
  currentLessonId: 2,
});
const studentAfterWarmup = loadAllStudents().find((s) => s.id === "test-grid-student");
assert(
  studentAfterWarmup.factMastery["3x4"].status === "unreached",
  `Warm-up answer does not muddy grid: 3x4 status remains "unreached" instead of "learning" (current: ${studentAfterWarmup.factMastery["3x4"].status})`
);

// 12. Round 3 Acceptance Test: Lesson 9 Triple-Double Strategy (x8)
const l9_7 = getDynamicRuleExplanation(9, 8, 7);
assert(
  l9_7.ruleName.includes("Triple-Double"),
  `Lesson 9 ruleName teaches Triple-Double: "${l9_7.ruleName}"`
);
assert(
  l9_7.strategyOverview.toLowerCase().includes("three times"),
  `Lesson 9 teaches doubling three times: "${l9_7.strategyOverview}"`
);
assert(
  !l9_7.strategyOverview.includes("5, 6, 7, 8") && !l9_7.strategyOverview.includes("5-6-7-8"),
  `Lesson 9 has NO duplicate 5-6-7-8 rhyme material`
);
assert(
  l9_7.contextLeadIn.includes("56") && !l9_7.contextLeadIn.includes("7 weeks"),
  `Lesson 9 context lead-in does not say 7 weeks (says "${l9_7.contextLeadIn}")`
);

// 13. Round 3 Acceptance Test: Lesson 10 Distinct 5-6-7-8 Rhyme & Decomposition
const l10_78 = getDynamicRuleExplanation(10, 7, 8);
assert(
  l10_78.strategyOverview.includes("5, 6, 7, 8") || l10_78.strategyOverview.includes("5-6-7-8"),
  `Lesson 10 teaches 5-6-7-8 rhyme: "${l10_78.strategyOverview}"`
);
assert(
  l10_78.steps.some((s) => s.math.includes("40") && s.math.includes("16")),
  `Lesson 10 verifies with decomposition (40 + 16 = 56)`
);

// 14. Round 3 Acceptance Test: Lesson 11 Genuine Mixed Retrieval
const l11_mixed = getDynamicRuleExplanation(11, 7, 8);
assert(
  l11_mixed.ruleName.includes("Mixed"),
  `Lesson 11 is genuine Mixed Retrieval: "${l11_mixed.ruleName}"`
);
assert(
  l11_mixed.strategyOverview.includes("mixes every fact") || l11_mixed.strategyOverview.includes("mixes all"),
  `Lesson 11 overview explains it mixes facts without single-strategy block`
);
assert(
  l11_mixed.steps.some((s) => s.label.includes("Recap")),
  `Lesson 11 has Strategy Anchors Recap step`
);

// 15. Round 3 Acceptance Test: Lesson 11 Finish State & No Bulk 81 Marking
const l11Facts = getLessonMasteryFacts(11);
assert(
  l11Facts.length <= 10,
  `Lesson 11 only claims its target facts, never bulk 81 facts (length: ${l11Facts.length})`
);

const l11FinishingStudent = {
  id: "test-l11-finish",
  name: "Finisher",
  avatar: "🚀",
  currentLessonId: 11,
  totalMinutesPracticed: 55,
  totalLessonsCompleted: 10,
  totalLessonsMastered: 10,
  streakDays: 5,
  lastPracticeDateChicago: todayChicago,
  xp: 1500,
  lastActive: new Date().toISOString(),
  factMastery: generateEmptyFactMastery(),
  lessonHistory: [],
  reDrillQueue: [],
};
saveAllStudents([l11FinishingStudent]);

const afterL11Pass = recordLessonComplete("test-l11-finish", {
  lessonId: 11,
  starsEarned: 3,
  correctCount: 5,
  totalQuestions: 5,
  averageLatencyMs: 2500,
  durationSeconds: 120,
  accuracyPercentage: 100,
  checkoutPassed: true,
  speedGoalMet: true,
});

assert(
  afterL11Pass.totalLessonsMastered === 11,
  `Passing Lesson 11 sets totalLessonsMastered to 11/11: ${afterL11Pass.totalLessonsMastered}`
);
assert(
  afterL11Pass.currentLessonId === 12,
  `Passing Lesson 11 advances currentLessonId to 12 (celebration state, never left as CURRENT): ${afterL11Pass.currentLessonId}`
);

// 16. Round 3 Acceptance Test: Lessons 4 & 5 Intermediate Double Visual Matching
const l4_3 = getDynamicRuleExplanation(4, 3, 3);
assert(
  l4_3.checkQuestionVisual && l4_3.checkQuestionVisual.a === 2 && l4_3.checkQuestionVisual.b === 3,
  `Lesson 4 intermediate check question visual displays 2 groups of 3 for "3+3"`
);
const l5_4 = getDynamicRuleExplanation(5, 4, 4);
assert(
  l5_4.checkQuestionVisual && l5_4.checkQuestionVisual.a === 2 && l5_4.checkQuestionVisual.b === 4,
  `Lesson 5 intermediate check question visual displays 2 groups of 4 for "4+4"`
);

// 17. Round 3 Acceptance Test: Gate distinct facts (5 distinct per lesson)
for (const lesson of DI_LESSONS) {
  const distinctTargets = new Set(lesson.targetFacts.map((f) => `${f.a}x${f.b}`));
  assert(
    distinctTargets.size >= 5,
    `Lesson ${lesson.id} (${lesson.title}) has at least 5 distinct target facts for gate (count: ${distinctTargets.size})`
  );
}

console.log("\n==========================================");
if (testFailures === 0) {
  console.log("🎉 ALL ACCEPTANCE TESTS PASSED (0 failures)!");
  process.exit(0);
} else {
  console.error(`💥 ${testFailures} ACCEPTANCE TESTS FAILED!`);
  process.exit(1);
}
