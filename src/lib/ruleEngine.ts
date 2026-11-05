import type { StrategyStep, FactStrategy, Fact } from "./types.ts";

export type { StrategyStep, FactStrategy, Fact };

export interface DynamicRuleStep {
  stepNumber: number;
  label: string;
  math: string;
  highlight?: boolean;
}

export interface CheckQuestion {
  prompt: string;
  expectedAnswer: number;
  hint: string;
}

export interface StagedCheckStep {
  prompt: string;
  expectedAnswer: number;
  hint: string;
  visual: { a: number; b: number };
}

export interface DynamicRuleExplanation {
  lessonId: number;
  ruleName: string;
  concept: string;
  strategyOverview: string;
  contextLeadIn: string;
  steps: DynamicRuleStep[];
  conclusion: string;
  checkQuestion: CheckQuestion;
  checkQuestionVisual?: { a: number; b: number };
  checkSteps: StagedCheckStep[];
  commutativityNote?: string;
  repeatedAddition: string;
}

/**
 * Strategy Registry — Strategy travels with the fact across all screens and lessons.
 * Note on orientation: each strategy normalises the non-anchor factor so both
 * (a × b) and (b × a) resolve cleanly while rendering steps for that exact fact.
 */
export const strategies: Record<string, FactStrategy> = {
  zero: {
    id: "zero",
    name: "Zero Property",
    stepsFor: (g, n) => [
      { label: "Zero groups", expression: `${g} × ${n} = 0` },
    ],
  },
  identity: {
    id: "identity",
    name: "The Identity Rule (×1)",
    stepsFor: (g, n) => {
      const other = g === 1 ? n : g;
      return [
        {
          label: g === 1 && n === 1 ? "1 group of 1" : `1 group of ${other}`,
          expression: `${g} × ${n} = ${other}`,
        },
      ];
    },
  },
  double: {
    id: "double",
    name: "The Double Rule (×2)",
    stepsFor: (g, n) => {
      const other = g === 2 ? n : g;
      return [
        { label: `Double ${other}`, expression: `${other} + ${other} = ${2 * other}` },
      ];
    },
  },
  countBy5s: {
    id: "count-by-5s",
    name: "Count by 5s (×5)",
    stepsFor: (g, n) => {
      const other = g === 5 ? n : g;
      const seq = Array.from({ length: other }, (_, i) => (i + 1) * 5).join(", ");
      return [
        { label: `Count by 5s ${other} times`, expression: `${seq} = ${5 * other}` },
      ];
    },
  },
  doubleAddOneGroup: {
    id: "double-add-one-group",
    name: "Double, Then Add One More Group (×3)",
    // 3 × n = 2 × n + n. The 2 × n is the doubling step —
    // that is why a 2 × ? fact appears when working on 3s.
    stepsFor: (g, n) => {
      const other = g === 3 ? n : g;
      return [
        { label: `Double ${other}`, expression: `${other} + ${other} = ${2 * other}` },
        { label: `Add one more group of ${other}`, expression: `${2 * other} + ${other} = ${3 * other}` },
      ];
    },
  },
  doubleDouble: {
    id: "double-double",
    name: "Double-Double Strategy (×4)",
    stepsFor: (g, n) => {
      const other = g === 4 ? n : g;
      return [
        { label: `Double ${other}`, expression: `${other} + ${other} = ${2 * other}` },
        { label: "Double again", expression: `${2 * other} + ${2 * other} = ${4 * other}` },
      ];
    },
  },
  ninesPattern: {
    id: "nines-pattern",
    name: "The 9s Secret Pattern (×9)",
    stepsFor: (g, n) => {
      const other = g === 9 ? n : g;
      const tens = other - 1;
      const ones = 9 - tens;
      return [
        { label: `Tens digit (1 less than ${other})`, expression: `${other} - 1 = ${tens}` },
        { label: "Ones digit (adds to 9)", expression: `9 - ${tens} = ${ones} → ${9 * other}` },
      ];
    },
  },
  squares: {
    id: "perfect-squares",
    name: "Perfect Square Numbers Anchor",
    stepsFor: (g, n) => [
      { label: `Square array (${g} rows of ${n})`, expression: `${g} × ${n} = ${g * n}` },
    ],
  },
  fivePlusOneGroup: {
    id: "five-plus-one-group",
    name: "5-Group + 1 Rule (×6)",
    stepsFor: (g, n) => {
      const other = g === 6 ? n : g;
      return [
        { label: `5 groups of ${other}`, expression: `5 × ${other} = ${5 * other}` },
        { label: `Add one more group of ${other}`, expression: `${5 * other} + ${other} = ${6 * other}` },
      ];
    },
  },
  tripleDouble: {
    id: "triple-double",
    name: "Triple-Double Strategy (×8)",
    stepsFor: (g, n) => {
      const other = g === 8 ? n : g;
      const d1 = 2 * other;
      const d2 = 4 * other;
      return [
        { label: `Double ${other}`, expression: `${other} + ${other} = ${d1}` },
        { label: `Double again (${d1})`, expression: `${d1} + ${d1} = ${d2}` },
        { label: `Double a third time (${d2})`, expression: `${d2} + ${d2} = ${8 * other}` },
      ];
    },
  },
  summitFact: {
    id: "summit-5678",
    name: "5-6-7-8 Rhyme Mnemonic & Decomposition",
    stepsFor: (g, n) => {
      const other = g === 7 ? n : g;
      return [
        { label: `5 groups of ${other}`, expression: `5 × ${other} = ${5 * other}` },
        { label: `Add 2 groups of ${other}`, expression: `${5 * other} + ${2 * other} = ${7 * other}` },
      ];
    },
  },
  fivePlusTwoGroups: {
    id: "five-plus-two-groups",
    name: "5-Group + 2-Group Rule (×7)",
    stepsFor: (g, n) => {
      const other = g === 7 ? n : g;
      return [
        { label: `5 groups of ${other}`, expression: `5 × ${other} = ${5 * other}` },
        { label: `Add 2 groups of ${other}`, expression: `${5 * other} + ${2 * other} = ${7 * other}` },
      ];
    },
  },
};

/**
 * Lookup the strategy for any (groups, perGroup) fact.
 * Never returns a generic "Mixed Retrieval" banner — mixed lessons and review facts
 * always resolve to the strategy for THAT specific fact.
 */
export function strategyFor(groups: number, perGroup: number, lessonId?: number): FactStrategy {
  if (groups === 0 || perGroup === 0) return strategies.zero;
  if (groups === 1 || perGroup === 1) return strategies.identity;

  // Lesson-specific disambiguation when the fact is a target of that lesson
  if (lessonId === 7 && groups === perGroup) return strategies.squares;
  if (lessonId === 9 && (groups === 8 || perGroup === 8)) return strategies.tripleDouble;
  if (lessonId === 10 && ((groups === 7 && perGroup === 8) || (groups === 8 && perGroup === 7))) {
    return strategies.summitFact;
  }

  // Primary lookup by leading factor (groups), then normalised orientation
  if (groups === 3) return strategies.doubleAddOneGroup;
  if (groups === 4) return strategies.doubleDouble;
  if (groups === 5) return strategies.countBy5s;
  if (groups === 2) return strategies.double;

  if (groups === perGroup && (groups === 7 || lessonId === 7 || lessonId === 10 || lessonId === 11 || !lessonId)) {
    return strategies.squares;
  }

  if (groups === 9) return strategies.ninesPattern;
  if (groups === 6) return strategies.fivePlusOneGroup;

  if (groups === 8) {
    if (perGroup === 7 && lessonId === 10) return strategies.summitFact;
    return strategies.tripleDouble;
  }

  if (groups === 7) {
    if (perGroup === 8) return strategies.summitFact;
    // Normalise orientation: e.g. 7 × 6 resolves to 5-Group + 1 Rule (×6), 7 × 3 resolves to ×3
    if (perGroup === 2) return strategies.double;
    if (perGroup === 3) return strategies.doubleAddOneGroup;
    if (perGroup === 4) return strategies.doubleDouble;
    if (perGroup === 5) return strategies.countBy5s;
    if (perGroup === 6 && lessonId !== 10) return strategies.fivePlusOneGroup;
    if (perGroup === 9 && lessonId !== 10) return strategies.ninesPattern;
    return strategies.fivePlusTwoGroups;
  }

  // Fallback orientation normalisation if perGroup carries the strategy anchor
  if (perGroup === 5) return strategies.countBy5s;
  if (perGroup === 2) return strategies.double;
  if (perGroup === 3) return strategies.doubleAddOneGroup;
  if (perGroup === 4) return strategies.doubleDouble;
  if (perGroup === 6) return strategies.fivePlusOneGroup;
  if (perGroup === 9) return strategies.ninesPattern;
  if (perGroup === 8) return strategies.tripleDouble;
  if (perGroup === 7) return strategies.fivePlusTwoGroups;

  throw new Error(`No strategy registered for ${groups} × ${perGroup}`);
}

export function createFact(groups: number, perGroup: number, lessonId?: number): Fact {
  return {
    groups,
    perGroup,
    product: groups * perGroup,
    strategy: strategyFor(groups, perGroup, lessonId),
  };
}

export interface RenderedFactView {
  groups: number;
  perGroup: number;
  product: number;
  headline: string;
  strategyName: string;
  steps: StrategyStep[];
  summaryLine: string;
}

/**
 * Render fact + strategy together everywhere (overview, I Do, We Do, Sprint hints,
 * re-teach panels, and gate feedback after submission).
 */
export function renderFact(
  fact: Fact | { a: number; b: number; product?: number; strategy?: FactStrategy },
  lessonId?: number
): RenderedFactView {
  const groups = "groups" in fact ? fact.groups : fact.a;
  const perGroup = "perGroup" in fact ? fact.perGroup : fact.b;
  const product = fact.product ?? groups * perGroup;
  const strategy =
    "strategy" in fact && fact.strategy
      ? fact.strategy
      : strategyFor(groups, perGroup, lessonId);
  const steps = strategy.stepsFor(groups, perGroup);
  const summaryLine = `${groups} × ${perGroup} = ${product}. ${steps
    .map((s) => `${s.label} (${s.expression})`)
    .join(", then ")}.`;

  return {
    groups,
    perGroup,
    product,
    headline: `${groups} × ${perGroup} = ${product}`,
    strategyName: strategy.name,
    steps,
    summaryLine,
  };
}

/**
 * Determines the primary mathematical strategy for a given fact.
 */
function resolveStrategyType(
  lessonId: number,
  factorA: number,
  factorB: number
):
  | "zero"
  | "one"
  | "two"
  | "five"
  | "three"
  | "four"
  | "nine"
  | "square"
  | "summit"
  | "six"
  | "eight"
  | "seven"
  | "mixed" {
  // Lesson 11 overview uses "mixed"
  if (lessonId === 11) return "mixed";

  const strat = strategyFor(factorA, factorB, lessonId);
  switch (strat.id) {
    case "zero":
      return "zero";
    case "identity":
      return "one";
    case "double":
      return "two";
    case "count-by-5s":
      return "five";
    case "double-add-one-group":
      return "three";
    case "double-double":
      return "four";
    case "nines-pattern":
      return "nine";
    case "perfect-squares":
      return "square";
    case "five-plus-one-group":
      return "six";
    case "triple-double":
      return "eight";
    case "summit-5678":
      return "summit";
    case "five-plus-two-groups":
      return "seven";
    default:
      return "mixed";
  }
}

/**
 * Generates an adult-neutral, mathematically precise Direct Instruction explanation
 * for any multiplication fact (1x1 to 9x9).
 */
export function getDynamicRuleExplanation(
  lessonId: number,
  factorA: number,
  factorB: number
): DynamicRuleExplanation {
  const product = factorA * factorB;
  const strategy = resolveStrategyType(lessonId, factorA, factorB);

  // 1. Zero Property
  if (strategy === "zero") {
    const other = factorA === 0 ? factorB : factorA;
    const checkQ = {
      prompt: `${factorA} × ${factorB} = 0. We got 0 because there are zero groups of ${other || 5}. How many items are in 0 groups of ${other || 5}?`,
      expectedAnswer: 0,
      hint: `In ${factorA} × ${factorB} = 0, zero groups of ${other || 5} equals 0.`,
    };
    return {
      lessonId: 1,
      ruleName: "Zero Property",
      concept: "Zero groups always produce zero total items.",
      strategyOverview:
        "Multiplying any number by 0 means there are zero groups. No matter the group size, with zero groups the total is always 0.",
      contextLeadIn: "Buying zero tickets at $15 each costs exactly $0.",
      steps: [
        {
          stepNumber: 1,
          label: "Zero Groups",
          math: `${factorA} × ${factorB} = 0`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = 0`,
      checkQuestion: checkQ,
      checkQuestionVisual: { a: 0, b: other || 5 },
      checkSteps: [
        {
          ...checkQ,
          visual: { a: 0, b: other || 5 },
        },
      ],
      repeatedAddition: "0",
    };
  }

  // 2. Identity Rule (x1)
  if (strategy === "one") {
    const n = factorA === 1 ? factorB : factorA;
    const isOneByOne = factorA === 1 && factorB === 1;
    const checkQ = {
      prompt: `${factorA} × ${factorB} = ${product}. We got ${product} from 1 group of ${n}. What number is in that 1 group?`,
      expectedAnswer: n,
      hint: `In ${factorA} × ${factorB} = ${product}, 1 group of ${n} equals ${n}.`,
    };

    return {
      lessonId: 1,
      ruleName: "The Identity Rule (×1)",
      concept: "1 group of any quantity equals that exact quantity.",
      strategyOverview: isOneByOne
        ? "1 × 1 is 1 group of 1, so the total is 1. The identity property states that 1 times any number is the number itself."
        : `1 × ${n} is 1 group of ${n}, so the total is ${n}. The identity property states that 1 times any number is the number itself.`,
      contextLeadIn: isOneByOne
        ? "Purchasing 1 item priced at $1 costs exactly $1."
        : `Purchasing 1 item priced at $${n} costs exactly $${n}.`,
      steps: [
        {
          stepNumber: 1,
          label: isOneByOne ? "1 group of 1" : `1 group of ${n}`,
          math: `1 × ${n} = ${n}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: checkQ,
      checkQuestionVisual: { a: 1, b: n },
      checkSteps: [
        {
          ...checkQ,
          visual: { a: 1, b: n },
        },
      ],
      commutativityNote: factorA !== 1 ? `${factorA} × 1 is ${factorA} groups of 1, which equals 1 group of ${n} (${n}).` : undefined,
      repeatedAddition: `${n}`,
    };
  }

  // 3. The Doubles (x2)
  if (strategy === "two") {
    const n = factorA === 2 ? factorB : factorA;
    const isTwoByTwo = factorA === 2 && factorB === 2;

    const steps: DynamicRuleStep[] = [];
    if (factorA !== 2) {
      steps.push({
        stepNumber: 1,
        label: "Turn around (Commutativity)",
        math: `${factorA} × 2 is the same as 2 × ${n} = ${product}`,
      });
      steps.push({
        stepNumber: 2,
        label: `Double ${n}`,
        math: `${n} + ${n} = ${product}`,
        highlight: true,
      });
    } else {
      steps.push({
        stepNumber: 1,
        label: isTwoByTwo ? "Double 2" : `Double ${n}`,
        math: `${n} + ${n} = ${product}`,
        highlight: true,
      });
    }

    const checkQ = {
      prompt: `${factorA} × ${factorB} = ${product}. We got ${product} by doubling a number. Which number did we double?`,
      expectedAnswer: n,
      hint: `In ${factorA} × ${factorB} = ${product}, we doubled ${n} (${n} + ${n} = ${product}).`,
    };

    return {
      lessonId: 2,
      ruleName: "The Double Rule (×2)",
      concept: "Multiplying by 2 means combining two equal groups.",
      strategyOverview:
        `Multiplying by 2 means two equal groups. 2 × ${n} is two groups of ${n}, so we calculate ${n} + ${n} = ${product}. We double ${n} (the number multiplied by 2).`,
      contextLeadIn: `In basketball, scoring two ${n}-point field goals equals 2 × ${n} = ${product} points.`,
      steps,
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: checkQ,
      checkQuestionVisual: { a: 2, b: n },
      checkSteps: [
        {
          ...checkQ,
          visual: { a: 2, b: n },
        },
      ],
      commutativityNote: factorA !== 2 ? `${factorA} × 2 is ${factorA} groups of 2, which equals 2 groups of ${n} (${n} + ${n} = ${product}).` : undefined,
      repeatedAddition: `${n} + ${n} = ${product}`,
    };
  }

  // 4. Count by 5s (x5)
  if (strategy === "five") {
    const n = factorA === 5 ? factorB : factorA;
    const timesWords: Record<number, string> = {
      1: "one time",
      2: "two times",
      3: "three times",
      4: "four times",
      5: "five times",
      6: "six times",
      7: "seven times",
      8: "eight times",
      9: "nine times",
    };
    const countSequence = Array.from({ length: n })
      .map((_, i) => (i + 1) * 5)
      .join(", ");
    const parity = n % 2 === 0 ? "even" : "odd";
    const lastDigit = product % 10;

    const checkQ = {
      prompt: `${factorA} × ${factorB} = ${product}. We got ${product} by counting by 5s (${countSequence}). How many times did we count by 5?`,
      expectedAnswer: n,
      hint: `In ${factorA} × ${factorB} = ${product}, we counted by 5s ${timesWords[n] || `${n} times`}: ${countSequence}.`,
    };

    return {
      lessonId: 3,
      ruleName: "Count by 5s (×5)",
      concept: "Count by 5s to find the product. Even factors end in 0; odd factors end in 5.",
      strategyOverview:
        `What is ${factorA} × ${factorB}?\nCount by 5s ${timesWords[n] || `${n} times`}. Say ${countSequence}.\nSo ${factorA} × ${factorB} = ${product}.\n\nLook at the last digit.\nWhen you multiply 5 by an even number, the answer ends in 0. When you multiply 5 by an odd number, the answer ends in 5. Here, ${n} is ${parity}, and ${product} ends in ${lastDigit}.`,
      contextLeadIn: "",
      steps: [
        {
          stepNumber: 1,
          label: `Count by 5s ${timesWords[n] || `${n} times`}`,
          math: `${countSequence}`,
        },
        {
          stepNumber: 2,
          label: "Look at the last digit",
          math: `${n} is ${parity} → ${product} ends in ${lastDigit}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: checkQ,
      checkQuestionVisual: { a: n, b: 5 },
      checkSteps: [
        {
          ...checkQ,
          visual: { a: n, b: 5 },
        },
      ],
      repeatedAddition: `${countSequence} = ${product}`,
    };
  }

  // 5. Double, Then Add One More Group (×3)
  if (strategy === "three") {
    const n = factorA === 3 ? factorB : factorA;
    const doubleVal = n * 2;

    const step1Check: StagedCheckStep = {
      prompt: `${factorA} × ${factorB} = ${product}. Double ${n}. What is ${n} + ${n}?`,
      expectedAnswer: doubleVal,
      hint: `Double ${n}. Two groups of ${n} make ${doubleVal} (${n} + ${n} = ${doubleVal}).`,
      visual: { a: 2, b: n },
    };

    const step2Check: StagedCheckStep = {
      prompt: `Add one more group of ${n}. What is ${doubleVal} + ${n}?`,
      expectedAnswer: product,
      hint: `Add one more group of ${n}: ${doubleVal} + ${n} = ${product}. So ${factorA} × ${factorB} = ${product}.`,
      visual: { a: 3, b: n },
    };

    return {
      lessonId: 4,
      ruleName: "Double, Then Add One More Group (×3)",
      concept: "3 groups = 2 groups (the double) plus one more group.",
      strategyOverview:
        `How can you use doubling to find ${factorA} × ${factorB}?\nThink of ${factorA} × ${factorB} as 3 groups of ${n}. Start with two groups, then add the third.\nDouble ${n}. Two groups of ${n} make ${doubleVal}. ${n} + ${n} = ${doubleVal}\nAdd one more group of ${n}. ${doubleVal} + ${n} = ${product}\nSo ${factorA} × ${factorB} = ${product}.\n\nPicture it. There are 3 sections with ${n} seats in each. The first two sections have ${doubleVal} seats. The last section adds ${n} more, for ${product} seats in all.`,
      contextLeadIn: "",
      steps: [
        {
          stepNumber: 1,
          label: `Double ${n}`,
          math: `${n} + ${n} = ${doubleVal}`,
        },
        {
          stepNumber: 2,
          label: `Add one more group of ${n}`,
          math: `${doubleVal} + ${n} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      // Staged multi-step check: Step 1 shows 2 groups of n (total = doubleVal); Step 2 reveals 3rd group (total = product)
      checkQuestion: {
        prompt: step1Check.prompt,
        expectedAnswer: step1Check.expectedAnswer,
        hint: step1Check.hint,
      },
      checkQuestionVisual: { a: 2, b: n },
      checkSteps: [step1Check, step2Check],
      repeatedAddition: `${doubleVal} + ${n} = ${product} (Double ${n} is ${doubleVal}, plus one more group of ${n})`,
    };
  }

  // 6. Double-Double (x4) - Staged Multi-Step Check
  if (strategy === "four") {
    const n = factorA === 4 ? factorB : factorA;
    const d1 = n * 2;

    const step1Check: StagedCheckStep = {
      prompt: `${factorA} × ${factorB} = ${product}. Double ${n}. What is ${n} + ${n}?`,
      expectedAnswer: d1,
      hint: `Step 1: Double ${n} is ${n} + ${n} = ${d1}.`,
      visual: { a: 2, b: n },
    };

    const step2Check: StagedCheckStep = {
      prompt: `Double again. What is ${d1} + ${d1}?`,
      expectedAnswer: product,
      hint: `Step 2: Double again (${d1} + ${d1} = ${product}). So ${factorA} × ${factorB} = ${product}.`,
      visual: { a: 4, b: n },
    };

    return {
      lessonId: 5,
      ruleName: "Double-Double Strategy (×4)",
      concept: "Multiplying by 4 is doubling twice (4 = 2 × 2).",
      strategyOverview:
        `Because 4 is 2 × 2, multiplying by 4 is doubling twice. First double ${n} to get ${d1}, then double ${d1} to get ${product}.`,
      contextLeadIn: `A standard car has 4 wheels (2 front wheels + 2 rear wheels). ${n} cars have 4 × ${n} = ${product} total wheels.`,
      steps: [
        {
          stepNumber: 1,
          label: `Double ${n}`,
          math: `${n} + ${n} = ${d1}`,
        },
        {
          stepNumber: 2,
          label: "Double again",
          math: `${d1} + ${d1} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: step1Check.prompt,
        expectedAnswer: step1Check.expectedAnswer,
        hint: step1Check.hint,
      },
      checkQuestionVisual: { a: 2, b: n },
      checkSteps: [step1Check, step2Check],
      repeatedAddition: `${d1} + ${d1} = ${product} (Double ${n} is ${d1}, double again is ${product})`,
    };
  }

  // 7. The Magical Nines (x9) - Staged Multi-Step Check
  if (strategy === "nine") {
    const n = factorA === 9 ? factorB : factorA;
    const tens = n - 1;
    const units = 9 - tens;

    const step1Check: StagedCheckStep = {
      prompt: `${factorA} × ${factorB} = ${product}. Step 1 is finding the tens digit (1 less than ${n}). What is ${n} - 1?`,
      expectedAnswer: tens,
      hint: `In ${factorA} × ${factorB} = ${product}, ${n} minus 1 is ${tens} (and ${tens} + ${units} = 9, so ${product}!).`,
      visual: { a: 9, b: n },
    };

    return {
      lessonId: 6,
      ruleName: "The 9s Secret Pattern (×9)",
      concept: "Tens digit is N - 1, and the two digits always sum to 9.",
      strategyOverview:
        `For 9 × ${n}, the tens digit is 1 less than ${n} (${n} - 1 = ${tens}). Since the two digits of any single-digit multiple of 9 always sum to 9, the units digit is 9 - ${tens} = ${units}. Combined: ${product}.`,
      contextLeadIn: `A baseball game has 9 innings. With 3 outs per inning, a 9-inning game has 9 × 3 = 27 outs.`,
      steps: [
        {
          stepNumber: 1,
          label: `Tens digit (1 less than ${n})`,
          math: `${n} - 1 = ${tens}`,
        },
        {
          stepNumber: 2,
          label: "Ones digit (adds to 9)",
          math: `9 - ${tens} = ${units}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: step1Check.prompt,
        expectedAnswer: step1Check.expectedAnswer,
        hint: step1Check.hint,
      },
      checkQuestionVisual: { a: 9, b: n },
      checkSteps: [step1Check],
      repeatedAddition: `Tens: ${n}-1 = ${tens}, Ones: 9-${tens} = ${units} → ${product}`,
    };
  }

  // 8. Perfect Squares (nxn)
  if (strategy === "square") {
    const derivation =
      factorA === 7
        ? "Anchor: 7 × 7 = 35 (from 5 × 7) + 14 (from 2 × 7) = 49."
        : factorA === 8
        ? "Anchor: 8 × 8 = Triple-double 8: 16 → 32 → 64."
        : factorA === 6
        ? "Anchor: 6 × 6 = 30 (from 5 × 6) + 6 = 36."
        : `Equal factors form a geometric square: ${factorA} × ${factorA} = ${product}.`;

    const step1Check: StagedCheckStep = {
      prompt: `${factorA} × ${factorB} = ${product}. We got ${product} by multiplying a number by itself in a square grid. Which number did we multiply by itself?`,
      expectedAnswer: factorA,
      hint: `In ${factorA} × ${factorB} = ${product}, we multiplied ${factorA} by itself (${factorA} × ${factorA} = ${product}).`,
      visual: { a: factorA, b: factorB },
    };

    return {
      lessonId: 7,
      ruleName: "Perfect Square Numbers Anchor",
      concept: "Equal factors form a geometric square grid.",
      strategyOverview:
        `When both factors match (${factorA} × ${factorB}), the items form a perfect geometric square array. Key squares: 1, 4, 9, 16, 25, 36, 49, 64, 81. ${derivation}`,
      contextLeadIn: `A square tiled patio measuring ${factorA} tiles wide by ${factorB} tiles long contains exactly ${product} total tiles.`,
      steps: [
        {
          stepNumber: 1,
          label: "Square Array",
          math: `${factorA} rows of ${factorB} = ${product}`,
          highlight: true,
        },
        {
          stepNumber: 2,
          label: "Square List",
          math: "1, 4, 9, 16, 25, 36, 49, 64, 81",
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: step1Check.prompt,
        expectedAnswer: step1Check.expectedAnswer,
        hint: step1Check.hint,
      },
      checkQuestionVisual: { a: factorA, b: factorB },
      checkSteps: [step1Check],
      repeatedAddition: `Square: ${factorA} × ${factorB} = ${product} [Squares: 25, 36, 49, 64, 81]`,
    };
  }

  // 9. Landmark Sixes (x6) - 5-Group + 1 More Group
  if (strategy === "six") {
    const n = factorA === 6 ? factorB : factorA;
    const fivePart = 5 * n;

    const step1Check: StagedCheckStep = {
      prompt: `${factorA} × ${factorB} = ${product}. Step 1 is finding 5 groups of ${n} (5 × ${n}). What is 5 × ${n}?`,
      expectedAnswer: fivePart,
      hint: `Step 1: 5 groups of ${n} is 5 × ${n} = ${fivePart}.`,
      visual: { a: 5, b: n },
    };

    const step2Check: StagedCheckStep = {
      prompt: `Add one more group of ${n}. What is ${fivePart} + ${n}?`,
      expectedAnswer: product,
      hint: `Step 2: ${fivePart} + ${n} = ${product}. So ${factorA} × ${factorB} = ${product}.`,
      visual: { a: 6, b: n },
    };

    return {
      lessonId: 8,
      ruleName: "5-Group + 1 Rule (×6)",
      concept: "6 groups = 5 groups (easy landmark) + one more group.",
      strategyOverview:
        `6 is 5 + 1. First find the easy 5s landmark (a landmark is an easy, friendly number like 5s or 10s that serves as a stepping stone): 5 × ${n} = ${fivePart}. Then add one more group of ${n}: ${fivePart} + ${n} = ${product}.`,
      contextLeadIn: `Items are packed in 6-packs (5 standard cans + 1 bonus can). ${n} six-packs have 5 × ${n} = ${fivePart} standard plus ${n} bonus = ${product} total cans.`,
      steps: [
        {
          stepNumber: 1,
          label: `5 groups of ${n}`,
          math: `5 × ${n} = ${fivePart}`,
        },
        {
          stepNumber: 2,
          label: `Add one more group of ${n}`,
          math: `${fivePart} + ${n} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: step1Check.prompt,
        expectedAnswer: step1Check.expectedAnswer,
        hint: step1Check.hint,
      },
      checkQuestionVisual: { a: 5, b: n },
      checkSteps: [step1Check, step2Check],
      repeatedAddition: `${fivePart} + ${n} = ${product} (5 groups of ${n} is ${fivePart}, plus one more group of ${n})`,
    };
  }

  // 10. The Tricky Eights (x8) - Triple-Double
  if (strategy === "eight") {
    const n = factorA === 8 ? factorB : factorA;
    const d1 = n * 2;
    const d2 = d1 * 2;

    const step1Check: StagedCheckStep = {
      prompt: `${factorA} × ${factorB} = ${product}. We got ${product} by doubling a number three times (${n} → ${d1} → ${d2} → ${product}). Which number did we start with and double first?`,
      expectedAnswer: n,
      hint: `In ${factorA} × ${factorB} = ${product}, we started with ${n} and doubled it three times: ${n} + ${n} = ${d1}, ${d1} + ${d1} = ${d2}, ${d2} + ${d2} = ${product}.`,
      visual: { a: 8, b: n },
    };

    return {
      lessonId: 9,
      ruleName: "Triple-Double Strategy (×8)",
      concept: "8 is 2 × 2 × 2: Double the number multiplied by 8 three times.",
      strategyOverview:
        `8 is 2 × 2 × 2, so to multiply by 8, double ${n} (the number multiplied by 8) three times. For 8 × ${n}: first double ${n} (${n} + ${n} = ${d1}), double again (${d1} + ${d1} = ${d2}), and double a third time (${d2} + ${d2} = ${product}).`,
      contextLeadIn: `A recipe requires 8 fluid ounces per portion. ${n} portions require 8 × ${n} = ${product} fluid ounces.`,
      steps: [
        {
          stepNumber: 1,
          label: `First double (${n})`,
          math: `${n} + ${n} = ${d1}`,
        },
        {
          stepNumber: 2,
          label: `Second double (${d1})`,
          math: `${d1} + ${d1} = ${d2}`,
        },
        {
          stepNumber: 3,
          label: `Third double (${d2})`,
          math: `${d2} + ${d2} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: step1Check.prompt,
        expectedAnswer: step1Check.expectedAnswer,
        hint: step1Check.hint,
      },
      checkQuestionVisual: { a: 8, b: n },
      checkSteps: [step1Check],
      repeatedAddition: `Triple-Double: ${n} → ${d1} → ${d2} → ${product}`,
    };
  }

  // 11. The Summit Fact (7 x 8 = 56) - Distinct Mnemonic Rhyme & Decomposition in Lesson 10
  if (strategy === "summit") {
    const step1Check: StagedCheckStep = {
      prompt: `${factorA} × ${factorB} = 56. To check 7 × 8 = 56 one step at a time, split 7 into 5 + 2. First, what is 5 × 8?`,
      expectedAnswer: 40,
      hint: "Step 1: 5 groups of 8 is 5 × 8 = 40.",
      visual: { a: 5, b: 8 },
    };

    const step2Check: StagedCheckStep = {
      prompt: "Next, find 2 groups of 8 (2 × 8). What is 8 + 8?",
      expectedAnswer: 16,
      hint: "Step 2: 2 groups of 8 is 8 + 8 = 16.",
      visual: { a: 2, b: 8 },
    };

    const step3Check: StagedCheckStep = {
      prompt: "Add the 5 groups (40) and 2 groups (16). What is 40 + 16?",
      expectedAnswer: 56,
      hint: "40 + 16 = 56. So 7 × 8 = 56!",
      visual: { a: 7, b: 8 },
    };

    return {
      lessonId: 10,
      ruleName: "5-6-7-8 Rhyme Mnemonic & Decomposition",
      concept: "Mnemonic sequence 5, 6, 7, 8 gives 56 = 7 × 8.",
      strategyOverview:
        "7 × 8 is a well-known tricky fact in elementary arithmetic. Use the consecutive counting rhyme: 5, 6, 7, 8 gives 56 = 7 × 8! Mathematically, verify it by splitting 7 into 5 + 2: (5 × 8 = 40) + (2 × 8 = 16) = 56.",
      contextLeadIn: "A full-time worker works 8 hours per day. 7 days × 8 hours per day = 56 total hours.",
      steps: [
        {
          stepNumber: 1,
          label: "Mnemonic Rhyme",
          math: "5, 6, 7, 8  →  56 = 7 × 8",
        },
        {
          stepNumber: 2,
          label: "Decomposition Check",
          math: "(5 × 8 = 40) + (2 × 8 = 16) = 56",
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = 56`,
      checkQuestion: {
        prompt: step1Check.prompt,
        expectedAnswer: step1Check.expectedAnswer,
        hint: step1Check.hint,
      },
      checkQuestionVisual: { a: 5, b: 8 },
      checkSteps: [step1Check, step2Check, step3Check],
      repeatedAddition: "5, 6, 7, 8 Rhyme: 40 + 16 = 56",
    };
  }

  // 12. Sevens (x7) - 5-Group + 2-Group
  if (strategy === "seven") {
    const n = factorA === 7 ? factorB : factorA;
    const part5 = 5 * n;
    const part2 = 2 * n;

    const step1Check: StagedCheckStep = {
      prompt: `${factorA} × ${factorB} = ${product}. Split 7 into 5 + 2. First, what are 5 groups of ${n} (5 × ${n})?`,
      expectedAnswer: part5,
      hint: `Step 1: 5 groups of ${n} is 5 × ${n} = ${part5}.`,
      visual: { a: 5, b: n },
    };

    const step2Check: StagedCheckStep = {
      prompt: `Next, what are 2 groups of ${n} (${n} + ${n})?`,
      expectedAnswer: part2,
      hint: `Step 2: 2 groups of ${n} is ${n} + ${n} = ${part2}.`,
      visual: { a: 2, b: n },
    };

    const step3Check: StagedCheckStep = {
      prompt: `Add the 5 groups (${part5}) and 2 groups (${part2}). What is ${part5} + ${part2}?`,
      expectedAnswer: product,
      hint: `${part5} + ${part2} = ${product}. So ${factorA} × ${factorB} = ${product}.`,
      visual: { a: 7, b: n },
    };

    return {
      lessonId: 10,
      ruleName: "5-Group + 2-Group Rule (×7)",
      concept: "7 groups = 5 groups + 2 groups (doubling).",
      strategyOverview:
        `Break 7 into friendly landmarks: 5 + 2. First find 5 × ${n} = ${part5}. Then find 2 × ${n} = ${part2}. Combine them: ${part5} + ${part2} = ${product}.`,
      contextLeadIn: `There are 7 days in a week. Over ${n} weeks, 5 × ${n} = ${part5} weekdays and 2 × ${n} = ${part2} weekend days total ${product} days.`,
      steps: [
        {
          stepNumber: 1,
          label: `5 groups of ${n}`,
          math: `5 × ${n} = ${part5}`,
        },
        {
          stepNumber: 2,
          label: `2 groups of ${n}`,
          math: `2 × ${n} = ${part2}`,
        },
        {
          stepNumber: 3,
          label: "Combine groups",
          math: `${part5} + ${part2} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: step1Check.prompt,
        expectedAnswer: step1Check.expectedAnswer,
        hint: step1Check.hint,
      },
      checkQuestionVisual: { a: 5, b: n },
      checkSteps: [step1Check, step2Check, step3Check],
      repeatedAddition: `${part5} + ${part2} = ${product} (5-group ${part5} + 2-group ${part2})`,
    };
  }

  // 13. Mixed Retrieval (Lesson 11) Overview + Staged Check for 6 × 7
  const step1Mixed: StagedCheckStep = {
    prompt: `${factorA} × ${factorB} = ${product}. Using the 5-Group + 1 strategy for ${factorA} × ${factorB}, Step 1 is 5 × ${factorB}. What is 5 × ${factorB}?`,
    expectedAnswer: 5 * factorB,
    hint: `Step 1: 5 groups of ${factorB} is 5 × ${factorB} = ${5 * factorB}.`,
    visual: { a: 5, b: factorB },
  };

  const step2Mixed: StagedCheckStep = {
    prompt: `Add one more group of ${factorB}. What is ${5 * factorB} + ${factorB}?`,
    expectedAnswer: product,
    hint: `${5 * factorB} + ${factorB} = ${product}. So ${factorA} × ${factorB} = ${product}.`,
    visual: { a: factorA, b: factorB },
  };

  return {
    lessonId: 11,
    ruleName: "Mixed Retrieval & Fluency",
    concept: "Direct memory recall using learned strategy anchors.",
    strategyOverview:
      `This lesson mixes every fact learned so far. There is no single strategy to apply; retrieve each fact directly using whichever strategy fits (Doubles, Count by 5s, Double, Then Add One More Group, Double-Double, 9s pattern, Squares, 5-group + 1, or Triple-Double). Automaticity means retrieving answers directly from memory within 3.5 seconds.`,
    contextLeadIn: "Speed automaticity sprint: target under 3.5 seconds per fact with 4+/5 accuracy.",
    steps: [
      {
        stepNumber: 1,
        label: "Strategy Anchors Recap",
        math: "×2: Double | ×3: Double + 1 Group | ×4: Double-Double | ×5: Count by 5s | ×6: 5 + 1 Group | ×8: Triple-Double | ×9: Tens=N-1 | Squares",
      },
      {
        stepNumber: 2,
        label: "Direct Retrieval",
        math: `${factorA} × ${factorB} = ${product}`,
        highlight: true,
      },
    ],
    conclusion: `${factorA} × ${factorB} = ${product}`,
    checkQuestion: {
      prompt: step1Mixed.prompt,
      expectedAnswer: step1Mixed.expectedAnswer,
      hint: step1Mixed.hint,
    },
    checkQuestionVisual: { a: 5, b: factorB },
    checkSteps: [step1Mixed, step2Mixed],
    repeatedAddition: `Mixed Retrieval: ${factorA} × ${factorB} = ${product}`,
  };
}
