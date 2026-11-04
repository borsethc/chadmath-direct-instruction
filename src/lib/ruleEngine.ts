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
  checkQuestionVisual?: { a: number; b: number };
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
  | "mixed"
  | "general" {
  if (factorA === 0 || factorB === 0) return "zero";
  if (factorA === 1 || factorB === 1) return "one";

  // Lesson 11 is always Mixed Retrieval
  if (lessonId === 11) return "mixed";

  // Lesson 9 is strictly Triple-Double for all x8 facts (never hijacked by summit rhyme)
  if (lessonId === 9 && (factorA === 8 || factorB === 8)) return "eight";

  // Lesson 10 is the designated home for the 5-6-7-8 rhyme & decomposition anchor
  if (lessonId === 10 && ((factorA === 7 && factorB === 8) || (factorA === 8 && factorB === 7))) {
    return "summit";
  }

  // Squares
  if (factorA === factorB && (lessonId === 7 || (factorA >= 5 && lessonId !== 8 && lessonId !== 9 && lessonId !== 10))) {
    return "square";
  }

  // Standard family strategies
  if (factorA === 2 || factorB === 2) return "two";
  if (factorA === 5 || factorB === 5) return "five";
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
      checkQuestionVisual: { a: 0, b: other || 5 },
      repeatedAddition: "0",
    };
  }

  // 2. Identity Rule (x1)
  if (strategy === "one") {
    const n = factorA === 1 ? factorB : factorA;
    const isOneByOne = factorA === 1 && factorB === 1;

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
      checkQuestion: {
        prompt: isOneByOne
          ? "If you have 1 group of 1, what is the total?"
          : `If you have 1 group of ${n}, what is the total?`,
        expectedAnswer: n,
        hint: `1 group of ${n} is simply ${n}.`,
      },
      checkQuestionVisual: { a: 1, b: n },
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
      checkQuestionVisual: { a: 2, b: n },
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
      checkQuestionVisual: { a: 5, b: n },
      repeatedAddition: Array.from({ length: factorA }).map(() => factorB).join(" + "),
    };
  }

  // 5. Double + 1 More Group (x3) - P1 Strategy Split & Intermediate Visual Agreement
  if (strategy === "three") {
    const n = factorA === 3 ? factorB : factorA;
    const doubleVal = n * 2;

    return {
      lessonId: 4,
      ruleName: "Double + 1 More Rule (×3)",
      concept: "3 groups = 2 groups (the double) plus 1 more group.",
      strategyOverview:
        `To multiply by 3, break 3 into 2 + 1. First double the other factor (${n} + ${n} = ${doubleVal}), then add one more group of ${n} (${doubleVal} + ${n} = ${product}).`,
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
      // P1: Check question asks for the intermediate double, so visual displays 2 groups of n
      checkQuestion: {
        prompt: `To find 3 × ${n}, first double ${n}: what is ${n} + ${n}?`,
        expectedAnswer: doubleVal,
        hint: `Double ${n} is ${doubleVal}. Next add ${n} to reach ${product}.`,
      },
      checkQuestionVisual: { a: 2, b: n },
      repeatedAddition: `${doubleVal} + ${n} = ${product} (Double is ${doubleVal}, plus ${n})`,
    };
  }

  // 6. Double-Double (x4) - P1 Strategy Split & Intermediate Visual Agreement
  if (strategy === "four") {
    const n = factorA === 4 ? factorB : factorA;
    const d1 = n * 2;

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
      // P1: Check question asks for first double, so visual displays 2 groups of n
      checkQuestion: {
        prompt: `To find 4 × ${n}, what is the first double of ${n} (${n} + ${n})?`,
        expectedAnswer: d1,
        hint: `First double of ${n} is ${d1}. Then double ${d1} to get ${product}.`,
      },
      checkQuestionVisual: { a: 2, b: n },
      repeatedAddition: `${d1} + ${d1} = ${product} (Double ${n} is ${d1}, double again is ${product})`,
    };
  }

  // 7. The Magical Nines (x9) - P1 Tens/Ones Split
  if (strategy === "nine") {
    const n = factorA === 9 ? factorB : factorA;
    const tens = n - 1;
    const units = 9 - tens;

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
        prompt: `For 9 × ${n}, what is the tens digit (1 less than ${n})?`,
        expectedAnswer: tens,
        hint: `${n} minus 1 is ${tens}. (And ${tens} + ${units} = 9, so ${product}!)`,
      },
      checkQuestionVisual: { a: 9, b: n },
      repeatedAddition: `Tens: ${n}-1 = ${tens}, Ones: 9-${tens} = ${units} → ${product}`,
    };
  }

  // 8. Perfect Squares (nxn) - P1 Full Squares List & Geometric Shapes
  if (strategy === "square") {
    const derivation =
      factorA === 7
        ? "Anchor: 7 × 7 = 35 (from 5 × 7) + 14 (from 2 × 7) = 49."
        : factorA === 8
        ? "Anchor: 8 × 8 = Triple-double 8: 16 → 32 → 64."
        : factorA === 6
        ? "Anchor: 6 × 6 = 30 (from 5 × 6) + 6 = 36."
        : `Equal factors form a geometric square: ${factorA} × ${factorA} = ${product}.`;

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
        prompt: `A square grid with ${factorA} rows and ${factorA} columns has how many total squares?`,
        expectedAnswer: product,
        hint: `Square fact: ${factorA} × ${factorA} = ${product}.`,
      },
      checkQuestionVisual: { a: factorA, b: factorB },
      repeatedAddition: `Square: ${factorA} × ${factorB} = ${product} [Squares: 25, 36, 49, 64, 81]`,
    };
  }

  // 9. Landmark Sixes (x6) - P1 5-Group + 1 with Landmark definition
  if (strategy === "six") {
    const n = factorA === 6 ? factorB : factorA;
    const fivePart = 5 * n;

    return {
      lessonId: 8,
      ruleName: "5-Group + 1 Rule (×6)",
      concept: "6 groups = 5 groups (easy landmark) + 1 more group.",
      strategyOverview:
        `6 is 5 + 1. First find the easy 5s landmark (a landmark is an easy, friendly number like 5s or 10s that serves as a stepping stone): 5 × ${n} = ${fivePart}. Then add one more group of ${n}: ${fivePart} + ${n} = ${product}.`,
      contextLeadIn: `Items are packed in 6-packs (5 standard cans + 1 bonus can). ${n} six-packs have 5 × ${n} = ${fivePart} standard plus ${n} bonus = ${product} total cans.`,
      steps: [
        {
          stepNumber: 1,
          label: `5s landmark (5 × ${n})`,
          math: `5 × ${n} = ${fivePart}`,
        },
        {
          stepNumber: 2,
          label: `Add 1 more group (${n})`,
          math: `${fivePart} + ${n} = ${product}`,
          highlight: true,
        },
      ],
      conclusion: `${factorA} × ${factorB} = ${product}`,
      checkQuestion: {
        prompt: `For 6 × ${n}, first find the 5s landmark: what is 5 × ${n}?`,
        expectedAnswer: fivePart,
        hint: `5 × ${n} = ${fivePart}. Next add ${n} to reach ${product}.`,
      },
      checkQuestionVisual: { a: 5, b: n },
      repeatedAddition: `${fivePart} + ${n} = ${product} (5-group is ${fivePart}, plus ${n})`,
    };
  }

  // 10. The Tricky Eights (x8) - P0 Triple-Double for WHOLE x8 family
  if (strategy === "eight") {
    const n = factorA === 8 ? factorB : factorA;
    const d1 = n * 2;
    const d2 = d1 * 2;

    return {
      lessonId: 9,
      ruleName: "Triple-Double Strategy (×8)",
      concept: "8 is 2 × 2 × 2: Double the other factor three times.",
      strategyOverview:
        `8 is 2 × 2 × 2, so to multiply by 8, double the other factor three times. For 8 × ${n}: first double ${n} (${n} + ${n} = ${d1}), double again (${d1} + ${d1} = ${d2}), and double a third time (${d2} + ${d2} = ${product}).`,
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
        prompt: `To multiply 8 × ${n}, double ${n} to get ${d1}, and double ${d1} to get ${d2}. What is the third double: ${d2} + ${d2}?`,
        expectedAnswer: product,
        hint: `Third double: ${d2} + ${d2} = ${product}.`,
      },
      checkQuestionVisual: { a: 8, b: n },
      repeatedAddition: `Triple-Double: ${n} → ${d1} → ${d2} → ${product}`,
    };
  }

  // 11. The Summit Fact (7 x 8 = 56) - P0 Distinct Mnemonic Rhyme & Decomposition in Lesson 10 ONLY
  if (strategy === "summit") {
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
        prompt: "Say the mnemonic: 5, 6, 7, 8. What is 7 × 8?",
        expectedAnswer: 56,
        hint: "5, 6, 7, 8 gives 56 = 7 × 8.",
      },
      checkQuestionVisual: { a: 7, b: 8 },
      repeatedAddition: "5, 6, 7, 8 Rhyme: 40 + 16 = 56",
    };
  }

  // 12. Sevens (x7) - 5-Group + 2-Group
  if (strategy === "seven") {
    const n = factorA === 7 ? factorB : factorA;
    const part5 = 5 * n;
    const part2 = 2 * n;

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
          label: "Combine landmarks",
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
      checkQuestionVisual: { a: 7, b: n },
      repeatedAddition: `${part5} + ${part2} = ${product} (5-group ${part5} + 2-group ${part2})`,
    };
  }

  // 13. Mixed Retrieval (Lesson 11) - P0 Real Mixed Retrieval Overview with Strategy Recap Table
  return {
    lessonId: 11,
    ruleName: "Mixed Retrieval & Fluency",
    concept: "Direct memory recall using learned strategy anchors.",
    strategyOverview:
      `This lesson mixes every fact learned so far. There is no single strategy to apply; retrieve each fact directly using whichever strategy fits (Doubles, Clock 5s, Double-Double, 9s pattern, Squares, 5-group + 1, or Triple-Double). Automaticity means retrieving answers directly from memory within 3.5 seconds.`,
    contextLeadIn: "Speed automaticity sprint: target under 3.5 seconds per fact with 4+/5 accuracy.",
    steps: [
      {
        stepNumber: 1,
        label: "Strategy Anchors Recap",
        math: "×2: Double | ×3: Double+1 | ×4: Double-Double | ×5: Clock 5s | ×6: 5+1 | ×8: Triple-Double | ×9: Tens=N-1 | Squares",
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
      prompt: `In this mixed sprint, what is ${factorA} × ${factorB}?`,
      expectedAnswer: product,
      hint: `${factorA} × ${factorB} = ${product}.`,
    },
    checkQuestionVisual: { a: factorA, b: factorB },
    repeatedAddition: `Mixed Retrieval: ${factorA} × ${factorB} = ${product}`,
  };
}
