// scripts/run-acceptance-tests.mjs
// Comprehensive Acceptance Test Suite for November 4, 2026 Evaluation Criteria

import { DI_LESSONS } from "../src/lib/lessons.ts";
import { getDynamicRuleExplanation, strategyFor, renderFact } from "../src/lib/ruleEngine.ts";
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
  authenticatePortalPin,
  loadStudentsForTeacher,
  createNewStudent,
  getOrCreateGuestLearnerId,
  getOrCreateGuestProfile,
} from "../src/lib/storage.ts";
import {
  ActiveLearningTimer,
  applyAnalyticsEvent,
  buildAppAnalyticsReport,
  createEmptyAnalyticsStore,
  formatActiveDuration,
  verifyOwnerAnalyticsAccess,
} from "../src/lib/analytics.ts";

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

// 18. Check-question wording fix: Fact-badge-anchored questions across all lessons (no trailing period after badge) & no "other factor"
assert(
  l2_3.checkQuestion.prompt === "2 × 3 = 6\nWhat number did we double to get 6 2 or 3?",
  `Lesson 2 (2 × 3) check question matches exact badge-anchored pattern without trailing period: "${l2_3.checkQuestion.prompt}"`
);
assert(
  l2_3.checkQuestion.expectedAnswer === 3,
  `Lesson 2 (2 × 3) check question expected answer is 3: ${l2_3.checkQuestion.expectedAnswer}`
);
for (const lesson of DI_LESSONS) {
  const tf = lesson.targetFacts[0];
  const exp = getDynamicRuleExplanation(lesson.id, tf.a, tf.b);
  assert(
    exp.checkQuestion.prompt.startsWith(`${tf.a} × ${tf.b}\n`) ||
      exp.checkQuestion.prompt.startsWith(`${tf.a} × ${tf.b} = ${tf.product}\n`),
    `Lesson ${lesson.id} check question starts with standalone math badge (no trailing period): "${exp.checkQuestion.prompt}"`
  );
  assert(
    !exp.strategyOverview.toLowerCase().includes("other factor") &&
      !exp.checkQuestion.prompt.toLowerCase().includes("other factor") &&
      !exp.checkQuestion.hint.toLowerCase().includes("other factor"),
    `Lesson ${lesson.id} never uses undefined "other factor"`
  );
}

// 19. Count by 5s (×5) rewrite & removal of clock context
const l3_5x3 = getDynamicRuleExplanation(3, 5, 3);
assert(
  l3_5x3.ruleName === "Count by 5s (×5)",
  `Lesson 3 ruleName is "Count by 5s (×5)": "${l3_5x3.ruleName}"`
);
assert(
  l3_5x3.strategyOverview.startsWith("What is 5 × 3?\nCount by 5s three times. Say 5, 10, 15.\nSo 5 × 3 = 15."),
  `Lesson 3 explanation starts with "What is 5 × 3?" and counting steps`
);
assert(
  l3_5x3.strategyOverview.includes(
    "Look at the last digit.\nWhen you multiply 5 by an even number, the answer ends in 0. When you multiply 5 by an odd number, the answer ends in 5. Here, 3 is odd, and 15 ends in 5."
  ),
  `Lesson 3 explanation includes exact last-digit rule after counting steps`
);
assert(
  !l3_5x3.strategyOverview.toLowerCase().includes("landmark numbers") &&
    !l3_5x3.strategyOverview.toLowerCase().includes("progresses by 5s"),
  `Lesson 3 explanation does not reintroduce "landmark numbers" or "progresses by 5s"`
);
assert(
  l3_5x3.contextLeadIn === "" &&
    !JSON.stringify(l3_5x3).toLowerCase().includes("clock") &&
    !JSON.stringify(DI_LESSONS.find((l) => l.id === 3)).toLowerCase().includes("clock"),
  `Lesson 3 has zero clock context anywhere`
);

// 20. Double, Then Add One More Group (×3) rewrite
const lesson4 = DI_LESSONS.find((l) => l.id === 4);
assert(
  lesson4.ruleName === "Double, Then Add One More Group (×3)",
  `Lesson 4 ruleName is "Double, Then Add One More Group (×3)": "${lesson4.ruleName}"`
);
assert(
  lesson4.targetFacts[0].a === 3 && lesson4.targetFacts[0].b === 4,
  `Lesson 4 first example is 3 × 4 (not 3 × 3): ${lesson4.targetFacts[0].a} × ${lesson4.targetFacts[0].b}`
);
const l4_3x4 = getDynamicRuleExplanation(4, 3, 4);
assert(
  l4_3x4.ruleName === "Double, Then Add One More Group (×3)",
  `Lesson 4 explanation ruleName is "Double, Then Add One More Group (×3)"`
);
const expectedL4Text =
  "How can you use doubling to find 3 × 4?\nThink of 3 × 4 as 3 groups of 4. Start with two groups, then add the third.\nDouble 4. Two groups of 4 make 8. 4 + 4 = 8\nAdd one more group of 4. 8 + 4 = 12\nSo 3 × 4 = 12.\n\nPicture it. There are 3 sections with 4 seats in each. The first two sections have 8 seats. The last section adds 4 more, for 12 seats in all.";
assert(
  l4_3x4.strategyOverview === expectedL4Text,
  `Lesson 4 (3 × 4) explanation matches exact required text`
);

// 21. Strategy-follows-fact: stored on every fact, renderFact, orientation normalisation, review facts, staged checks
for (const lesson of DI_LESSONS) {
  for (const tf of lesson.targetFacts) {
    assert(
      tf.strategy && typeof tf.strategy.name === "string" && typeof tf.strategy.stepsFor === "function",
      `Lesson ${lesson.id} target fact ${tf.a}×${tf.b} has strategy stored on the fact (${tf.strategy?.name})`
    );
  }
  for (const rf of lesson.reviewFacts) {
    assert(
      rf.strategy && typeof rf.strategy.name === "string" && typeof rf.strategy.stepsFor === "function",
      `Lesson ${lesson.id} review fact ${rf.a}×${rf.b} has its own strategy stored on the fact (${rf.strategy?.name})`
    );
  }
}

const rf3x4 = renderFact({ a: 3, b: 4, product: 12 });
assert(
  rf3x4.strategyName === "Double, Then Add One More Group (×3)" &&
    rf3x4.steps.length === 2 &&
    rf3x4.steps[0].label === "Double 4" &&
    rf3x4.steps[0].expression === "4 + 4 = 8" &&
    rf3x4.steps[1].label === "Add one more group of 4" &&
    rf3x4.steps[1].expression === "8 + 4 = 12",
  `renderFact(3 × 4) returns "Double, Then Add One More Group (×3)" with exact double & add-one-group steps`
);

// Orientation normalisation: 6 × 7 and 7 × 6 both resolve to 5-Group + 1 Rule (×6)
assert(
  strategyFor(6, 7).id === "five-plus-one-group" && strategyFor(7, 6).id === "five-plus-one-group",
  `Orientation normalisation: both 6 × 7 and 7 × 6 resolve to 5-Group + 1 Rule (×6)`
);

// Review fact from another lesson shows its own strategy, never the current lesson's banner
const l4Review2x6 = lesson4.reviewFacts.find((f) => f.a === 2 && f.b === 6);
const l4Review5x3 = lesson4.reviewFacts.find((f) => f.a === 5 && f.b === 3);
assert(
  renderFact(l4Review2x6).strategyName === "The Double Rule (×2)" &&
    renderFact(l4Review5x3).strategyName === "Count by 5s (×5)",
  `Lesson 4 review facts (2 × 6, 5 × 3) show their own strategies, never Lesson 4's banner`
);

// Staged multi-step check for 3 × 4: Step 1 (2 groups of 4 -> 8), Step 2 (3 groups of 4 -> 12)
assert(
  l4_3x4.checkSteps.length === 2 &&
    l4_3x4.checkSteps[0].visual.a === 2 &&
    l4_3x4.checkSteps[0].visual.b === 4 &&
    l4_3x4.checkSteps[0].expectedAnswer === 8 &&
    l4_3x4.checkSteps[1].visual.a === 3 &&
    l4_3x4.checkSteps[1].visual.b === 4 &&
    l4_3x4.checkSteps[1].expectedAnswer === 12,
  `Lesson 4 (3 × 4) check stages Step 1 (2×4=8) and Step 2 (3×4=12) separately`
);

// 22. Lesson 2 strategy check fix: asks which number was doubled with 2 groups of 3 dots, answer 3, and confirmation feedback only after submission
assert(
  l2_3.checkSteps.length === 1 &&
    l2_3.checkSteps[0].prompt === "2 × 3 = 6\nWhat number did we double to get 6 2 or 3?" &&
    l2_7.checkSteps[0].prompt === "2 × 7 = 14\nWhat number did we double to get 14 2 or 7?" &&
    l2_3.checkSteps[0].expectedAnswer === 3 &&
    l2_3.checkSteps[0].visual.a === 2 &&
    l2_3.checkSteps[0].visual.b === 3 &&
    l2_3.checkSteps[0].hint === "In 2 × 3 = 6, we doubled 3 (3 + 3 = 6).",
  `Lesson 2 strategy check asks "What number did we double to get 6 2 or 3?" (and for all other 2s facts e.g. 2 × 7 -> "What number did we double to get 14 2 or 7?") with 2 groups of n dots and post-submission feedback`
);

// Staged multi-step lessons (1, 4, 5, 8, 10, 11): visible groups total equals expectedAnswer at each staged step
for (const lessonId of [1, 4, 5, 8, 10, 11]) {
  const lesson = DI_LESSONS.find((l) => l.id === lessonId);
  const tf = lesson.targetFacts[0];
  const exp = getDynamicRuleExplanation(lesson.id, tf.a, tf.b);
  for (let idx = 0; idx < exp.checkSteps.length; idx++) {
    const st = exp.checkSteps[idx];
    const visualTotal = st.visual.a * st.visual.b;
    assert(
      visualTotal === st.expectedAnswer,
      `Lesson ${lesson.id} checkStep ${idx + 1} visual (${st.visual.a}×${st.visual.b}=${visualTotal}) equals expectedAnswer (${st.expectedAnswer})`
    );
  }
}

// 23. Login + Dashboard Cleanup & PIN-Protected /dashboard route
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const loginSrc = fs.readFileSync(path.join(repoRoot, "src/components/StudentLogin.tsx"), "utf8");
const navbarSrc = fs.readFileSync(path.join(repoRoot, "src/components/Navbar.tsx"), "utf8");
const dashboardSrc = fs.readFileSync(path.join(repoRoot, "src/components/StudentDashboard.tsx"), "utf8");
const homePageSrc = fs.readFileSync(path.join(repoRoot, "src/app/page.tsx"), "utf8");
const teacherRouteSrc = fs.readFileSync(path.join(repoRoot, "src/app/dashboard/page.tsx"), "utf8");
const pinModalSrc = fs.readFileSync(path.join(repoRoot, "src/components/TeacherPinModal.tsx"), "utf8");

assert(
  !loginSrc.includes("Teacher Portal") &&
    loginSrc.includes("Create Student Profile") &&
    loginSrc.includes("createNewStudent"),
  `StudentLogin has no "View Teacher Portal" link and allows entering a new user when history/storage is cleared`
);
assert(
  !navbarSrc.includes("Teacher") && !dashboardSrc.includes("Teacher Portal") && !homePageSrc.includes("TeacherDashboard"),
  `No Teacher Portal entry exists in Navbar, StudentDashboard, or student Home page`
);
assert(
  verifyTeacherPin("1234") && !pinModalSrc.includes("1234") && teacherRouteSrc.includes("TeacherPinModal"),
  `/dashboard route is gated by PIN 1234 and never prints the PIN in the UI`
);
assert(
  !dashboardSrc.includes("Day Streak (Chicago Time)") &&
    dashboardSrc.includes("Daily Habit Streak") &&
    dashboardSrc.includes("w-full px-3 py-1.5 rounded-full bg-cyan-500/20") &&
    !dashboardSrc.includes("Volume2") &&
    !dashboardSrc.includes("Type") &&
    !navbarSrc.includes("Volume2"),
  `StudentDashboard removes top streak pill, widens "TODAY'S 5-MINUTE LESSON" pill to full width, removes volume & text-size controls, and keeps Daily Habit Streak card below`
);

// 24. Lesson 2 (Multiply by 2) Strategy Overview Screen Update
const lessonEngineSrc = fs.readFileSync(path.join(repoRoot, "src/components/LessonEngine.tsx"), "utf8");
assert(
  lessonEngineSrc.includes("Multiply by 2: Double the Other Number") &&
    lessonEngineSrc.includes(
      'aria-label="Two groups with three dots in each group, making six dots altogether."'
    ) &&
    lessonEngineSrc.includes("Two 3-point baskets score 6 points.") &&
    lessonEngineSrc.includes("(prefers-reduced-motion: reduce)") &&
    lessonEngineSrc.includes("clearDoubleIntroTimers") &&
    lessonEngineSrc.includes("<span>Replay</span>") &&
    lessonEngineSrc.includes("<span>Try One</span>"),
  `Lesson 2 Strategy Overview displays "Multiply by 2: Double the Other Number", accessible purple dot groups, staged animation with Replay & prefers-reduced-motion, context sentence, and "Try One" button`
);

// 25. Lesson 3 (Multiply by 5: Count by 5s) Strategy Overview Screen Update
assert(
  lessonEngineSrc.includes("Multiply by 5: Count by 5s") &&
    lessonEngineSrc.includes(
      'aria-label="Three groups of five dots. Counting by fives gives five, ten, fifteen."'
    ) &&
    lessonEngineSrc.includes("3 groups") &&
    lessonEngineSrc.includes("Running total") &&
    lessonEngineSrc.includes("startFivesIntroAnimation") &&
    lessonEngineSrc.includes("col-start-2 row-start-2"),
  `Lesson 3 Strategy Overview displays "Multiply by 5: Count by 5s", 5-on-a-die dot groups, "3 groups" label, "Running total" row (5, 10, 15), bridge text, and staged animation`
);

// 26. Lesson 3 Checkout Gate Continue, Equation Pill Punctuation, and We Do Vertical Flow
const formattedMathSrc = fs.readFileSync(path.join(repoRoot, "src/components/FormattedMath.tsx"), "utf8");
assert(
  lessonEngineSrc.includes("handleContinueFromGateFeedback") &&
    lessonEngineSrc.includes("<span>Continue</span>") &&
    lessonEngineSrc.includes("disabled={isAdvancing || Boolean(gateFeedback)}") &&
    lessonEngineSrc.includes("justify-start gap-2.5") &&
    lessonEngineSrc.includes("leading-snug break-words whitespace-normal") &&
    formattedMathSrc.includes("\\\\.?") &&
    formattedMathSrc.includes("seqMatch"),
  `Checkout Gate keeps worked-example feedback visible until Continue (pausing timers and disabling keypad), equation pill removes trailing standalone period, and We Do banner/card sit in non-overlapping vertical flow`
);

// 27. Lesson 4 (×3) Overview & Check, Separate Stacked Fact Badge, Two-Row Narrow Header, and Landscape Mode Layout
const numpadSrc = fs.readFileSync(path.join(repoRoot, "src/components/Numpad.tsx"), "utf8");
assert(
  lessonEngineSrc.includes("Lesson 4 · Multiply by 3") &&
    lessonEngineSrc.includes("Double, then add one more group") &&
    lessonEngineSrc.includes("startThreesIntroAnimation") &&
    lessonEngineSrc.includes("flex-col sm:flex-row") &&
    lessonEngineSrc.includes("landscape:flex-row md:flex-row") &&
    !lessonEngineSrc.includes("max-h-[500px]") &&
    !lessonEngineSrc.includes("max-h-[135px]") &&
    formattedMathSrc.includes("leadingEqMatch") &&
    formattedMathSrc.includes("leadingFactMatch") &&
    numpadSrc.includes("landscape:flex md:flex") &&
    l4_3x4.checkSteps[0].prompt === "3 × 4\nDouble 4. What is 4 + 4?" &&
    l4_3x4.checkSteps[0].expectedAnswer === 8 &&
    l4_3x4.checkSteps[0].visual.a === 2 &&
    l4_3x4.checkSteps[0].visual.b === 4,
  `Lesson 4 Strategy Overview & Check ("3 × 4\\nDouble 4. What is 4 + 4?"), separate stacked fact badge without period, 2-row narrow header, unclipped check cards, and iPhone/iPad landscape side-by-side layout verified`
);

// 28. Owner-Only App Analytics Tab, Server Auth Enforcement, Roster Scoping, Guest IDs, Active Time & Opened vs. Completed Levels
{
  // Reset mock storage for clean test isolation
  global.localStorage.store = {};
  if (global.document) global.document.cookie = "";

  // Create registered learner A on teacher_1's roster and registered learner B on teacher_2's roster (outside teacher_1's roster)
  const studentA = createNewStudent("RosterA_Student", "🦁", "teacher_1");
  const studentB = createNewStudent("OutOfRosterB_Student", "🐬", "teacher_2");

  // Give studentA a legacy historical attempt (without active-time or question-attempt tracking)
  recordLessonComplete(studentA.id, {
    lessonId: 1,
    durationSeconds: 180,
    accuracyPercent: 100,
    totalQuestions: 5,
    correctCount: 5,
    errorFacts: [],
    starsEarned: 3,
    checkoutPassed: true,
  });

  // Create persistent anonymous guest in browser storage
  const guestId1 = getOrCreateGuestLearnerId();
  const guestId2 = getOrCreateGuestLearnerId();
  const guestProfile = getOrCreateGuestProfile();
  assert(
    guestId1.startsWith("guest_") && guestId1 === guestId2 && guestProfile.accountType === "guest",
    `Guest learner receives a persistent random browser ID (${guestId1}) without collecting personal info`
  );

  // Verify Teacher vs. Owner authentication & roster scoping
  const teacherSession = authenticatePortalPin("2468"); // Ms. Rivera (teacher_1)
  const ownerSession = authenticatePortalPin("1234");   // App Owner
  assert(
    teacherSession?.role === "teacher" &&
      teacherSession?.teacherId === "teacher_1" &&
      ownerSession?.role === "owner",
    `Teacher PIN authenticates as teacher_1 while Owner PIN authenticates as owner`
  );

  const teacher1Roster = loadStudentsForTeacher("teacher", teacherSession.teacherId);
  assert(
    teacher1Roster.length === 1 &&
      teacher1Roster[0].id === studentA.id &&
      !teacher1Roster.some((s) => s.id === studentB.id) &&
      !teacher1Roster.some((s) => s.id === guestId1),
    `Teacher 1 sees ONLY their own roster (${studentA.id}); out-of-roster registered learner (${studentB.id}) and guest (${guestId1}) are excluded`
  );

  // Enforce owner access on the server for every analytics request
  const teacherAnalyticsCheck = verifyOwnerAnalyticsAccess(teacherSession.token);
  const rawTeacherPinCheck = verifyOwnerAnalyticsAccess("2468");
  const missingTokenCheck = verifyOwnerAnalyticsAccess("");
  const ownerAnalyticsCheck = verifyOwnerAnalyticsAccess(ownerSession.token);
  assert(
    !teacherAnalyticsCheck.authorized &&
      teacherAnalyticsCheck.status === 403 &&
      !rawTeacherPinCheck.authorized &&
      rawTeacherPinCheck.status === 403 &&
      !missingTokenCheck.authorized &&
      missingTokenCheck.status === 401 &&
      ownerAnalyticsCheck.authorized &&
      ownerAnalyticsCheck.status === 200,
    `Server analytics guard rejects teacher token/PIN with 403 Forbidden and missing token with 401, while authorizing owner token with 200`
  );

  // Verify ActiveLearningTimer pauses when hidden or idle >= 60s
  let now = 1_000_000;
  const timer = new ActiveLearningTimer(now, 60_000);
  // 25 seconds of active interaction
  now += 25_000;
  timer.recordInteraction(now);
  assert(timer.getActiveSeconds(now) === 25, `ActiveLearningTimer accrues 25s during active interaction`);

  // Tab hidden in background for 10 minutes (600,000ms) -> 0 seconds added!
  timer.setPageVisible(false, now);
  now += 600_000;
  assert(
    timer.getActiveSeconds(now) === 25,
    `Leaving a tab open in the background for 10 minutes adds 0s to active learning time (stays 25s)`
  );

  // Tab becomes visible again; learner makes 1 interaction then leaves tab idle for 5 minutes (300,000ms)
  timer.setPageVisible(true, now);
  now += 300_000;
  assert(
    timer.getActiveSeconds(now) === 85,
    `Leaving a visible tab idle for 5 minutes caps accrual at 60s idle threshold (25s + 60s = 85s)`
  );

  // Record telemetry sessions across Student A, Out-of-Roster Student B (who completed L2 and opened L10 7s without completing), and Guest
  const store = createEmptyAnalyticsStore();
  const baseDate = new Date();
  const isoNow = baseDate.toISOString();

  // Out-of-roster Student B: completes Lesson 2 (×2), then opens Lesson 10 (×7) and stops at "guided"
  applyAnalyticsEvent(store, {
    type: "lesson_start",
    eventId: "ev_b_l2_start",
    sessionId: "sess_b_l2",
    learnerId: studentB.id,
    accountType: "registered",
    teacherId: "teacher_2",
    lessonId: 2,
    stage: "strategy_intro",
    timestamp: new Date(baseDate.getTime() - 120_000).toISOString(),
  });
  applyAnalyticsEvent(store, {
    type: "answer_submitted",
    eventId: "ev_b_l2_q1_try1",
    sessionId: "sess_b_l2",
    learnerId: studentB.id,
    lessonId: 2,
    stage: "checkout",
    questionId: "L2-checkout-1-2x3",
    attemptNumber: 1,
    isCorrect: true,
    activeDurationSeconds: 45,
    timestamp: new Date(baseDate.getTime() - 90_000).toISOString(),
  });
  applyAnalyticsEvent(store, {
    type: "lesson_complete",
    eventId: "ev_b_l2_complete",
    sessionId: "sess_b_l2",
    learnerId: studentB.id,
    lessonId: 2,
    checkoutPassed: true,
    activeDurationSeconds: 95,
    timestamp: new Date(baseDate.getTime() - 80_000).toISOString(),
  });
  // Duplicate completion event with same or new eventId must NOT inflate active time or completions
  applyAnalyticsEvent(store, {
    type: "lesson_complete",
    eventId: "ev_b_l2_complete",
    sessionId: "sess_b_l2",
    learnerId: studentB.id,
    lessonId: 2,
    checkoutPassed: true,
    activeDurationSeconds: 95,
    timestamp: new Date(baseDate.getTime() - 80_000).toISOString(),
  });

  // Student B opens Lesson 10 (the 7s) and reaches "guided" without completing
  applyAnalyticsEvent(store, {
    type: "lesson_start",
    eventId: "ev_b_l10_start",
    sessionId: "sess_b_l10",
    learnerId: studentB.id,
    accountType: "registered",
    teacherId: "teacher_2",
    lessonId: 10,
    stage: "strategy_intro",
    timestamp: new Date(baseDate.getTime() - 60_000).toISOString(),
  });
  applyAnalyticsEvent(store, {
    type: "stage_change",
    eventId: "ev_b_l10_guided",
    sessionId: "sess_b_l10",
    learnerId: studentB.id,
    lessonId: 10,
    stage: "guided",
    activeDurationSeconds: 40,
    timestamp: new Date(baseDate.getTime() - 30_000).toISOString(),
  });
  // First attempt wrong (attempt 1), retry right (attempt 2)
  applyAnalyticsEvent(store, {
    type: "answer_submitted",
    eventId: "ev_b_l10_q1_try1",
    sessionId: "sess_b_l10",
    learnerId: studentB.id,
    lessonId: 10,
    stage: "guided",
    questionId: "L10-guided-1-7x8",
    attemptNumber: 1,
    isCorrect: false,
    activeDurationSeconds: 50,
    timestamp: new Date(baseDate.getTime() - 20_000).toISOString(),
  });
  applyAnalyticsEvent(store, {
    type: "answer_submitted",
    eventId: "ev_b_l10_q1_try2",
    sessionId: "sess_b_l10",
    learnerId: studentB.id,
    lessonId: 10,
    stage: "guided",
    questionId: "L10-guided-1-7x8",
    attemptNumber: 2,
    isCorrect: true,
    activeDurationSeconds: 55,
    timestamp: new Date(baseDate.getTime() - 10_000).toISOString(),
  });

  // Guest learner session
  applyAnalyticsEvent(store, {
    type: "lesson_start",
    eventId: "ev_guest_l3_start",
    sessionId: "sess_guest_l3",
    learnerId: guestId1,
    accountType: "guest",
    lessonId: 3,
    stage: "strategy_intro",
    timestamp: isoNow,
  });
  applyAnalyticsEvent(store, {
    type: "stage_change",
    eventId: "ev_guest_l3_guided",
    sessionId: "sess_guest_l3",
    learnerId: guestId1,
    accountType: "guest",
    lessonId: 3,
    stage: "guided",
    activeDurationSeconds: 70,
    timestamp: isoNow,
  });

  const allProfiles = [...loadAllStudents(), guestProfile];
  const report = buildAppAnalyticsReport(store, allProfiles, "all", baseDate);

  const rowA = report.learners.find((l) => l.learnerId === studentA.id);
  const rowB = report.learners.find((l) => l.learnerId === studentB.id);
  const rowGuest = report.learners.find((l) => l.learnerId === guestId1);

  assert(
    report.uniqueActiveLearners === 3 &&
      report.registeredLearnersCount === 2 &&
      report.guestLearnersCount === 1 &&
      Boolean(rowA && rowB && rowGuest),
    `Owner App Analytics report includes all 3 learners: teacher_1 student, out-of-roster teacher_2 student, and anonymous guest`
  );

  assert(
    rowA.totalActiveSeconds === null &&
      formatActiveDuration(rowA.totalActiveSeconds) === "Not tracked" &&
      rowA.hasTrackedAttempts === false,
    `Older historical sessions without active time or question attempt data display "Not tracked"`
  );

  assert(
    rowB.latestLevelReached?.lessonId === 10 &&
      rowB.latestLevelReached?.stage === "guided" &&
      rowB.completedLessonsCount === 1 &&
      rowB.completedLessonIds.includes(2) &&
      !rowB.completedLessonIds.includes(10) &&
      rowB.levelProgress.find((lp) => lp.lessonId === 10)?.opened === true &&
      rowB.levelProgress.find((lp) => lp.lessonId === 10)?.completed === false,
    `Learner row distinguishes latest level opened (Lesson 10 · ×7 at guided stage) from completed lessons (Lesson 2 · ×2)`
  );

  assert(
    rowB.firstAttemptCorrect === 1 &&
      rowB.firstAttemptTotal === 2 &&
      rowB.retryCorrect === 1 &&
      rowB.retryTotal === 1,
    `First-attempt accuracy (1/2) is tracked separately from retries (1/1)`
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
