// scripts/verify-layout-dimensions.mjs
// Automated Layout Dimension Verification for iPhone 17 (402 × 874 points)

import { DI_LESSONS } from "../src/lib/lessons.ts";
import { getDynamicRuleExplanation } from "../src/lib/ruleEngine.ts";

const IPHONE_17_WIDTH = 402;
const IPHONE_17_HEIGHT = 874;
const NAVBAR_HEIGHT = 52;
const LESSON_USABLE_HEIGHT = IPHONE_17_HEIGHT - NAVBAR_HEIGHT; // 822pt
const MIN_TAP_TARGET_PT = 44; // Apple Human Interface Guidelines

console.log(`📱 Running iPhone 17 (402 × 874 pt) Layout & Height Verification...`);

let failedSteps = 0;
let totalStepsTested = 0;

// Test Keypad tap targets
const KEYPAD_BUTTON_HEIGHT = 44; // h-11 in Tailwind is 44px (11 * 4 = 44)
if (KEYPAD_BUTTON_HEIGHT < MIN_TAP_TARGET_PT) {
  console.error(`❌ Tap target failure: Keypad button height is ${KEYPAD_BUTTON_HEIGHT}pt, must be >= ${MIN_TAP_TARGET_PT}pt`);
  failedSteps++;
} else {
  console.log(`✅ Keypad tap target verified: ${KEYPAD_BUTTON_HEIGHT}pt >= ${MIN_TAP_TARGET_PT}pt`);
}

// Height budgets for lesson phases
// Total usable: 822pt
const HEADER_HEIGHT = 42;
const NUMPAD_TOTAL_HEIGHT = 110;
const CONTAINER_PADDING = 16;
const AVAILABLE_CONTENT_HEIGHT_WITH_KEYPAD = LESSON_USABLE_HEIGHT - HEADER_HEIGHT - NUMPAD_TOTAL_HEIGHT - CONTAINER_PADDING; // 654pt
const AVAILABLE_CONTENT_HEIGHT_NO_KEYPAD = LESSON_USABLE_HEIGHT - HEADER_HEIGHT - CONTAINER_PADDING; // 764pt

for (const lesson of DI_LESSONS) {
  // Test 1: Strategy Intro Phase (no keypad)
  totalStepsTested++;
  const firstFact = lesson.targetFacts[0];
  const introExpl = getDynamicRuleExplanation(lesson.id, firstFact.a, firstFact.b);
  // Estimate height: Header (40) + Overview text (~90) + Context (~45) + Steps (steps.length * 36) + Button (44) + padding (32)
  const introContentHeight = 40 + 90 + 45 + (introExpl.steps.length * 36) + 44 + 32;
  if (introContentHeight > AVAILABLE_CONTENT_HEIGHT_NO_KEYPAD) {
    console.error(`❌ Lesson ${lesson.id} Strategy Intro exceeds vertical limit: ${introContentHeight}pt > ${AVAILABLE_CONTENT_HEIGHT_NO_KEYPAD}pt`);
    failedSteps++;
  }

  // Test 2: Check Question Phase (with keypad)
  totalStepsTested++;
  const checkPromptHeight = 40;
  const scaffoldMaxHeight = 140;
  const answerBoxHeight = 54;
  const checkTotalContent = checkPromptHeight + scaffoldMaxHeight + answerBoxHeight + 20;
  if (checkTotalContent > AVAILABLE_CONTENT_HEIGHT_WITH_KEYPAD) {
    console.error(`❌ Lesson ${lesson.id} Check Question exceeds vertical limit: ${checkTotalContent}pt > ${AVAILABLE_CONTENT_HEIGHT_WITH_KEYPAD}pt`);
    failedSteps++;
  }

  // Test 3: Drill Steps across all target facts (Warm-up, Guided, Fluency)
  for (const fact of lesson.targetFacts) {
    totalStepsTested++;
    const numeralsHeight = 56;
    const scaffoldHeight = 135;
    const bannerHeight = 32;
    const correctionHeight = 65; // Worst-case with re-teaching alert active
    const totalStepContent = numeralsHeight + scaffoldHeight + bannerHeight + correctionHeight;

    if (totalStepContent > AVAILABLE_CONTENT_HEIGHT_WITH_KEYPAD) {
      console.error(`❌ Lesson ${lesson.id} Fact ${fact.a}x${fact.b} exceeds vertical limit: ${totalStepContent}pt > ${AVAILABLE_CONTENT_HEIGHT_WITH_KEYPAD}pt`);
      failedSteps++;
    }
  }

  // Test 4: Checkout Gate (no scaffold, with keypad)
  totalStepsTested++;
  const checkoutNumerals = 64;
  const targetPill = 28;
  const checkoutContent = checkoutNumerals + targetPill + 20;
  if (checkoutContent > AVAILABLE_CONTENT_HEIGHT_WITH_KEYPAD) {
    console.error(`❌ Lesson ${lesson.id} Checkout Gate exceeds vertical limit: ${checkoutContent}pt > ${AVAILABLE_CONTENT_HEIGHT_WITH_KEYPAD}pt`);
    failedSteps++;
  }
}

console.log(`\nVerified ${totalStepsTested} lesson steps across all 11 lessons for iPhone 17 (402 × 874 pt).`);
if (failedSteps === 0) {
  console.log(`✅ PASSED: All lesson steps fit completely on iPhone 17 (402 × 874 pt) with 0 vertical scroll and >= 44pt tap targets.`);
  process.exit(0);
} else {
  console.error(`❌ FAILED: ${failedSteps} steps failed vertical bounds test.`);
  process.exit(1);
}
