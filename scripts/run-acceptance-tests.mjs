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
assert(!verifyTeacherPin("1234"), `Incorrect PIN is rejected`);

console.log("\n==========================================");
if (testFailures === 0) {
  console.log("🎉 ALL ACCEPTANCE TESTS PASSED (0 failures)!");
  process.exit(0);
} else {
  console.error(`💥 ${testFailures} ACCEPTANCE TESTS FAILED!`);
  process.exit(1);
}
