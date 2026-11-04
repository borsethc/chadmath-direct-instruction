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

export interface DynamicRuleExplanation {
  lessonId: number;
  ruleName: string;
  concept: string;
  strategyOverview: string;
  contextLeadIn: string;
  steps: DynamicRuleStep[];
  conclusion: string;
  checkQuestion: CheckQuestion;
  commutativityNote?: string;
  repeatedAddition: string;
}

/**
 * Determines the primary mathematical strategy for a given fact.
 * Each fact is taught and explained using its own authentic strategy.
 */
function resolveStrategyType(
  lessonId: number,
  factorA: number,
  factorB: number
): "zero" | "one" | "two" | "five" | "three" | "four" | "nine" | "square" | "summit" | "six" | "eight" | "seven" | "general" {
  if (factorA === 0 || factorB === 0) return "zero";
  if (factorA === 1 || factorB === 1) return "one";
  if (factorA === 2 || factorB === 2) return "two";
  if (factorA === 5 || factorB === 5) return "five";
  if (factorA === factorB && factorA >= 6 && (lessonId === 7 || lessonId === 11)) return "square";
  if ((factorA === 7 && factorB === 8) || (factorA === 8 && factorB === 7)) return "summit";
  if (factorA === 3 || factorB === 3) return "three";
  if (factorA === 4 || factorB === 4) return "four";
  if (factorA === 9 || factorB === 9) return "nine";
  if (factorA === 6 || factorB === 6) return "six";
  if (factorA === 8 || factorB === 8) return "eight";
  if (factorA === 7 || factorB === 7) return "seven";
  return "general";
}

/**
 * Generates an adult-neutral, mathematically precise Direct Instruction explanation
 * for any multiplication fact (1x1 to 9x9).
 *
 * Guaranteed Correctness Rules:
 * 1. For x2: 2 x n means two groups of n (n + n). Always double n, never "double the 2" (unless 2x2=4).
 * 2. For x1: 1 x n means 1 group of n = n. Only 1x1 is "1 group of 1".
 * 3. Banners and steps strictly derive from the CURRENT fact's factors.
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
      checkQuestion: {
        prompt: `How many items are in 0 groups of ${other || 5}?`,
        expectedAnswer: 0,
        hint: "Zero groups always equals 0.",
      },
      repeatedAddition: "0",
    };
  }

  // 2. Identity Rule (x1)
  if (strategy === "one") {
    const n = factorA === 1 ? factorB : factorA;
    const isOneByOne = factorA === 1 && factorB === 1;
    const repAdd = factorA === 1 ? `${n}` : Array.from({ length: factorA }).map(() => "1").join(" + ");

    const steps: DynamicRuleStep[] = [];
    if (factorA === 1) {
      steps.push({
        stepNumber: 1,
        label: isOneByOne ? "1 group of 1" : `1 group of ${n}`,
        math: `1 × ${n} = ${n}`,
        highlight: true,
      });
    } else {
      steps.push({
        stepNumber: 1,
        label: `${factorA} groups of 1`,
        math: `${factorA} × 1 = ${factorA}`,
        highlight: true,
      });
    }

    return {
      lessonId: 1,
      ruleName: "Identity Rule (×1)",
      concept: "One group of any quantity remains that exact quantity.",
      strategyOverview:
        "The identity property states that 1 times any number is the number itself. One group containing N items simply contains N items.",
      contextLeadIn: `Purchasing 1 item priced at $${n} costs exactly $${n}.`,
      steps,
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: `If you have 1 group of ${n}, what is the total?`,
        expectedAnswer: n,
        hint: "1 group of any number is that exact number.",
      },
      commutativityNote: factorA !== 1 ? `${factorA} × 1 is the same total as 1 × ${factorA} = ${n}.` : undefined,
      repeatedAddition: repAdd,
    };
  }

  // 3. The Doubles (x2) - P0 Core Correctness Rule
  // 2 x n means two groups of n, so 2 x n = n + n. Double the OTHER factor, never "double the 2" (unless 2x2=4).
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

    return {
      lessonId: 2,
      ruleName: "The Double Rule (×2)",
      concept: "Multiplying by 2 means combining two equal groups.",
      strategyOverview:
        `Multiplying by 2 means two equal groups. 2 × ${n} is two groups of ${n}, so we calculate ${n} + ${n} = ${product}. We always double the other factor.`,
      contextLeadIn: `In basketball, scoring two ${n}-point field goals equals 2 × ${n} = ${product} points.`,
      steps,
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: isTwoByTwo ? "What is 2 + 2?" : `What number do we double to find 2 × ${n}?`,
        expectedAnswer: n,
        hint: `In 2 × ${n}, double the other factor: ${n}.`,
      },
      commutativityNote: factorA !== 2 ? `${factorA} × 2 is ${factorA} groups of 2, which equals 2 groups of ${n} (${n} + ${n} = ${product}).` : undefined,
      repeatedAddition: `${n} + ${n}`,
    };
  }

  // 4. Landmark Fives (x5)
  if (strategy === "five") {
    const n = factorA === 5 ? factorB : factorA;
    const countSequence = Array.from({ length: Math.min(n, 5) })
      .map((_, i) => (i + 1) * 5)
      .join(", ") + (n > 5 ? ` ... ${product}` : "");

    return {
      lessonId: 3,
      ruleName: "The 5s Skip Rule (×5)",
      concept: "Multiples of 5 always end in 0 or 5 (like clock minutes or nickels).",
      strategyOverview:
        `Multiples of 5 represent landmark numbers. Counting ${n} groups of 5 progresses by 5s (${countSequence}) and always ends in 0 (for even factors) or 5 (for odd factors).`,
      contextLeadIn: `On a clock, the minute hand pointing to ${n} represents 5 × ${n} = ${product} minutes.`,
      steps: [
        {
          stepNumber: 1,
          label: `Count by 5s (${n} times)`,
          math: countSequence,
        },
        {
          stepNumber: 2,
          label: n % 2 === 0 ? "Even factor ends in 0" : "Odd factor ends in 5",
          math: `Ends in ${product % 10} → ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: `On an analog clock face, how many minutes are at the ${n}?`,
        expectedAnswer: product,
        hint: `Each clock number is 5 minutes: 5 × ${n} = ${product}.`,
      },
      repeatedAddition: Array.from({ length: factorA }).map(() => factorB).join(" + "),
    };
  }

  // 5. Double + 1 More Group (x3)
  if (strategy === "three") {
    const n = factorA === 3 ? factorB : factorA;
    const doubleVal = n * 2;

    return {
      lessonId: 4,
      ruleName: "Double + 1 More Rule (×3)",
      concept: "3 groups = 2 groups (the double) plus 1 more group.",
      strategyOverview:
        `To multiply by 3, break 3 into 2 + 1. First double the factor (${n} + ${n} = ${doubleVal}), then add one more group of ${n} (${doubleVal} + ${n} = ${product}).`,
      contextLeadIn: `An auditorium row with 3 sections of ${n} seats has 2 × ${n} = ${doubleVal} seats plus 1 more section of ${n} = ${product} seats.`,
      steps: [
        {
          stepNumber: 1,
          label: `Double ${n}`,
          math: `${n} + ${n} = ${doubleVal}`,
        },
        {
          stepNumber: 2,
          label: `Add 1 more ${n}`,
          math: `${doubleVal} + ${n} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: `First double ${n}: what is ${n} + ${n}?`,
        expectedAnswer: doubleVal,
        hint: `Double ${n} is ${doubleVal}. Next add ${n} to reach ${product}.`,
      },
      repeatedAddition: Array.from({ length: factorA }).map(() => factorB).join(" + "),
    };
  }

  // 6. Double-Double (x4)
  if (strategy === "four") {
    const n = factorA === 4 ? factorB : factorA;
    const d1 = n * 2;

    return {
      lessonId: 5,
      ruleName: "Double-Double Strategy (×4)",
      concept: "Multiplying by 4 is doubling twice (4 = 2 × 2).",
      strategyOverview:
        `Because 4 is 2 × 2, multiplying by 4 is doubling twice. Double ${n} once to get ${d1}, then double ${d1} to get ${product}.`,
      contextLeadIn: `Vehicles have 4 wheels. ${n} vehicles have ${d1} wheels on one side and ${d1} on the other: ${d1} + ${d1} = ${product} wheels.`,
      steps: [
        {
          stepNumber: 1,
          label: `First double (${n})`,
          math: `${n} + ${n} = ${d1}`,
        },
        {
          stepNumber: 2,
          label: `Second double (${d1})`,
          math: `${d1} + ${d1} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: `What is the first double of ${n} (${n} + ${n})?`,
        expectedAnswer: d1,
        hint: `Double ${n} is ${d1}. Then double ${d1} to get ${product}.`,
      },
      repeatedAddition: Array.from({ length: factorA }).map(() => factorB).join(" + "),
    };
  }

  // 7. The Magical Nines (x9)
  if (strategy === "nine") {
    const n = factorA === 9 ? factorB : factorA;
    const tens = n - 1;
    const units = 9 - tens;

    return {
      lessonId: 6,
      ruleName: "The 9s Secret Pattern (×9)",
      concept: "Tens digit is N - 1, and the digits always sum to 9.",
      strategyOverview:
        `For 9 × ${n}, the tens digit is 1 less than ${n} (${n} - 1 = ${tens}). Since the two digits of any single-digit multiple of 9 always sum to 9, the units digit is 9 - ${tens} = ${units}. Combined: ${product}.`,
      contextLeadIn: `In a 9-inning baseball game series, scoring ${n} runs per game totals 9 × ${n} = ${product} runs.`,
      steps: [
        {
          stepNumber: 1,
          label: `Tens digit (1 less than ${n})`,
          math: `${n} - 1 = ${tens} (Tens: ${tens})`,
        },
        {
          stepNumber: 2,
          label: "Digits add to 9",
          math: `9 - ${tens} = ${units} (Units: ${units})`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: `For 9 × ${n}, what is the tens digit (1 less than ${n})?`,
        expectedAnswer: tens,
        hint: `${n} minus 1 is ${tens}.`,
      },
      repeatedAddition: Array.from({ length: factorA }).map(() => factorB).join(" + "),
    };
  }

  // 8. Perfect Squares (nxn)
  if (strategy === "square") {
    return {
      lessonId: 7,
      ruleName: "Perfect Square Anchor",
      concept: "Equal factors form a geometric square array.",
      strategyOverview:
        `When both factors are identical (${factorA} × ${factorB}), the items form a square with equal width and height. A square of ${factorA} by ${factorB} contains exactly ${product} units.`,
      contextLeadIn: `A square floor patio measuring ${factorA} tiles wide by ${factorB} tiles long uses ${product} total tiles.`,
      steps: [
        {
          stepNumber: 1,
          label: "Equal Dimensions",
          math: `${factorA} rows of ${factorB} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: `A square grid with ${factorA} rows and ${factorA} columns has how many total squares?`,
        expectedAnswer: product,
        hint: `Square fact: ${factorA} × ${factorA} = ${product}.`,
      },
      repeatedAddition: Array.from({ length: factorA }).map(() => factorB).join(" + "),
    };
  }

  // 9. The Summit Fact (7 x 8 = 56)
  if (strategy === "summit") {
    return {
      lessonId: 10,
      ruleName: "5-6-7-8 Rhyme Anchor",
      concept: "Consecutive counting digits: 5, 6, 7, 8.",
      strategyOverview:
        "7 × 8 is the most commonly practiced fact in arithmetic. Remember the consecutive counting pattern: 5, 6, 7, 8 represents 56 = 7 × 8. Alternatively, split 7 into 5 + 2: (5 × 8 = 40) + (2 × 8 = 16) = 56.",
      contextLeadIn: "7 weeks of 8 work hours per day totals exactly 56 hours.",
      steps: [
        {
          stepNumber: 1,
          label: "Counting Sequence",
          math: "5, 6, 7, 8  →  56 = 7 × 8",
        },
        {
          stepNumber: 2,
          label: "Decomposition Check",
          math: "40 + 16 = 56 (from 5 × 8 + 2 × 8)",
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = 56`,
      checkQuestion: {
        prompt: "Say the sequence: 5, 6, 7, 8. What is 7 × 8?",
        expectedAnswer: 56,
        hint: "56 = 7 × 8.",
      },
      repeatedAddition: Array.from({ length: factorA }).map(() => factorB).join(" + "),
    };
  }

  // 10. Landmark Sixes (x6)
  if (strategy === "six") {
    const n = factorA === 6 ? factorB : factorA;
    const fivePart = 5 * n;

    return {
      lessonId: 8,
      ruleName: "5-Group + 1 Rule (×6)",
      concept: "6 groups = 5 groups (easy landmark) + 1 more group.",
      strategyOverview:
        `6 is 5 + 1. First find the easy 5s landmark: 5 × ${n} = ${fivePart}. Then add one more group of ${n}: ${fivePart} + ${n} = ${product}.`,
      contextLeadIn: `A warehouse packs items in 6-packs. ${n} packs have 5 × ${n} = ${fivePart} items plus ${n} more = ${product} total items.`,
      steps: [
        {
          stepNumber: 1,
          label: `5s landmark (5 × ${n})`,
          math: `5 × ${n} = ${fivePart}`,
        },
        {
          stepNumber: 2,
          label: `Add 1 more ${n}`,
          math: `${fivePart} + ${n} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: `First find the 5s landmark: what is 5 × ${n}?`,
        expectedAnswer: fivePart,
        hint: `5 × ${n} = ${fivePart}. Then add ${n} to reach ${product}.`,
      },
      repeatedAddition: Array.from({ length: factorA }).map(() => factorB).join(" + "),
    };
  }

  // 11. The Tricky Eights (x8)
  if (strategy === "eight") {
    const n = factorA === 8 ? factorB : factorA;
    const d1 = n * 2;
    const d2 = d1 * 2;

    return {
      lessonId: 9,
      ruleName: "Triple-Double Strategy (×8)",
      concept: "8 is 2 × 2 × 2: Double the number 3 times.",
      strategyOverview:
        `Because 8 = 2 × 2 × 2, multiplying by 8 means doubling three times in a row. Double ${n} to get ${d1}, double ${d1} to get ${d2}, and double ${d2} to get ${product}.`,
      contextLeadIn: `There are 8 fluid ounces in a cup. ${n} cups equal 8 × ${n} = ${product} fluid ounces.`,
      steps: [
        {
          stepNumber: 1,
          label: `Double 1 (${n})`,
          math: `${n} + ${n} = ${d1}`,
        },
        {
          stepNumber: 2,
          label: `Double 2 (${d1})`,
          math: `${d1} + ${d1} = ${d2}`,
        },
        {
          stepNumber: 3,
          label: `Double 3 (${d2})`,
          math: `${d2} + ${d2} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: `Double ${n} is ${d1}, and double ${d1} is ${d2}. What is the final double: ${d2} + ${d2}?`,
        expectedAnswer: product,
        hint: `${d2} + ${d2} = ${product}.`,
      },
      repeatedAddition: Array.from({ length: factorA }).map(() => factorB).join(" + "),
    };
  }

  // 12. Sevens (x7)
  if (strategy === "seven") {
    const n = factorA === 7 ? factorB : factorA;
    const part5 = 5 * n;
    const part2 = 2 * n;

    return {
      lessonId: 10,
      ruleName: "5-Group + 2-Group Rule (×7)",
      concept: "7 groups = 5 groups + 2 groups.",
      strategyOverview:
        `Break 7 into friendly landmarks: 5 + 2. First find 5 × ${n} = ${part5}. Then find 2 × ${n} = ${part2}. Combine them: ${part5} + ${part2} = ${product}.`,
      contextLeadIn: `There are 7 days in a week. Over ${n} weeks, there are 5 × ${n} = ${part5} weekdays and 2 × ${n} = ${part2} weekend days, totaling ${product} days.`,
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
          label: "Add landmarks",
          math: `${part5} + ${part2} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: `For 7 × ${n}, 5 groups is ${part5} and 2 groups is ${part2}. What is ${part5} + ${part2}?`,
        expectedAnswer: product,
        hint: `${part5} + ${part2} = ${product}.`,
      },
      repeatedAddition: Array.from({ length: factorA }).map(() => factorB).join(" + "),
    };
  }

  // 13. Default Rapid Retrieval (e.g. Mixed Fluency)
  return {
    lessonId: 11,
    ruleName: "Rapid Retrieval",
    concept: "Automatic retrieval directly from memory.",
    strategyOverview:
      `Direct memory recall without hesitation: ${factorA} × ${factorB} = ${product}. True mathematical automaticity means answering unassisted in under 3.5 seconds.`,
    contextLeadIn: `Speed recall sprint: ${factorA} groups of ${factorB} items.`,
    steps: [
      {
        stepNumber: 1,
        label: "Direct Recall",
        math: `${factorA} × ${factorB} = ${product}`,
        highlight: true,
      },
    ],
    conclusion: `${factorA} × ${factorB} = ${product}`,
    checkQuestion: {
      prompt: `What is ${factorA} × ${factorB}?`,
      expectedAnswer: product,
      hint: `${factorA} × ${factorB} = ${product}.`,
    },
    repeatedAddition: Array.from({ length: factorA }).map(() => factorB).join(" + "),
  };
}
