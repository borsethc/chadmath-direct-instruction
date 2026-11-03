export interface DynamicRuleStep {
  stepNumber: number;
  label: string;
  math: string;
  highlight?: boolean;
}

export interface DynamicRuleExplanation {
  ruleName: string;
  concept: string;
  steps: DynamicRuleStep[];
  conclusion: string;
}

export function getDynamicRuleExplanation(
  lessonId: number,
  factorA: number,
  factorB: number
): DynamicRuleExplanation {
  const otherNumber = factorA === 3 || factorA === 4 || factorA === 5 || factorA === 6 || factorA === 8 || factorA === 9
    ? factorB
    : factorB === 3 || factorB === 4 || factorB === 5 || factorB === 6 || factorB === 8 || factorB === 9
    ? factorA
    : factorB;

  const product = factorA * factorB;

  switch (lessonId) {
    case 1: // Foundations (0s & 1s)
      if (factorA === 0 || factorB === 0) {
        return {
          ruleName: "Zero Property",
          concept: "Zero groups always means nothing!",
          steps: [
            { stepNumber: 1, label: "Multiply by Zero", math: `Anything × 0 = 0` },
          ],
          conclusion: `${factorA} × ${factorB} = 0`,
        };
      }
      return {
        ruleName: "Identity Rule (×1)",
        concept: "1 group of any number is just itself!",
        steps: [
          { stepNumber: 1, label: "Identity", math: `1 group of ${otherNumber} = ${otherNumber}` },
        ],
        conclusion: `So ${factorA} × ${factorB} = ${product}`,
      };

    case 2: // The Doubles (×2)
      return {
        ruleName: "The Double Rule (×2)",
        concept: "Multiplying by 2 is doubling the number!",
        steps: [
          {
            stepNumber: 1,
            label: `Double the ${otherNumber}`,
            math: `${otherNumber} + ${otherNumber} = ${product}`,
            highlight: true,
          },
        ],
        conclusion: `So 2 × ${otherNumber} = ${product}`,
      };

    case 3: // The 5s Skip Rule
      return {
        ruleName: "The 5s Skip Rule (×5)",
        concept: "Count by 5s (like minutes on a clock or nickels)!",
        steps: [
          {
            stepNumber: 1,
            label: `Skip count ${otherNumber} times`,
            math: Array.from({ length: Math.min(otherNumber, 5) })
              .map((_, i) => (i + 1) * 5)
              .join(", ") + (otherNumber > 5 ? ` ... ${product}` : ""),
          },
          {
            stepNumber: 2,
            label: "Check ending",
            math: `Always ends in 0 or 5 (${product})`,
            highlight: true,
          },
        ],
        conclusion: `So 5 × ${otherNumber} = ${product}`,
      };

    case 4: // Double + 1 More (×3)
      const double3 = otherNumber * 2;
      return {
        ruleName: "Double + 1 More Rule (×3)",
        concept: "2 groups + 1 more group = 3 groups!",
        steps: [
          {
            stepNumber: 1,
            label: `Double it`,
            math: `${otherNumber} + ${otherNumber} = ${double3}`,
          },
          {
            stepNumber: 2,
            label: `Add 1 more ${otherNumber}`,
            math: `${double3} + ${otherNumber} = ${product}`,
            highlight: true,
          },
        ],
        conclusion: `So 3 × ${otherNumber} = ${product}`,
      };

    case 5: // Double-Double (×4)
      const firstDouble4 = otherNumber * 2;
      return {
        ruleName: "Double-Double Strategy (×4)",
        concept: "To multiply by 4: double, then double again!",
        steps: [
          {
            stepNumber: 1,
            label: `First double`,
            math: `${otherNumber} + ${otherNumber} = ${firstDouble4}`,
          },
          {
            stepNumber: 2,
            label: `Second double`,
            math: `${firstDouble4} + ${firstDouble4} = ${product}`,
            highlight: true,
          },
        ],
        conclusion: `So 4 × ${otherNumber} = ${product}`,
      };

    case 6: // The Magical Nines (×9)
      const tensDigit = otherNumber - 1;
      const unitsDigit = 9 - tensDigit;
      return {
        ruleName: "The 9s Secret Pattern (×9)",
        concept: "Tens is 1 less, and both digits always add up to 9!",
        steps: [
          {
            stepNumber: 1,
            label: `Tens digit is 1 less`,
            math: `${otherNumber} - 1 = ${tensDigit} (Tens = ${tensDigit})`,
          },
          {
            stepNumber: 2,
            label: `Digits add up to 9`,
            math: `${tensDigit} + ${unitsDigit} = 9 (Units = ${unitsDigit})`,
            highlight: true,
          },
        ],
        conclusion: `So 9 × ${otherNumber} = ${product}`,
      };

    case 7: // Perfect Squares
      return {
        ruleName: "Perfect Square Anchor",
        concept: "When both factors match, it forms a perfect square grid!",
        steps: [
          {
            stepNumber: 1,
            label: "Square array",
            math: `${factorA} rows of ${factorB} dots`,
            highlight: true,
          },
        ],
        conclusion: `Square: ${factorA} × ${factorB} = ${product}`,
      };

    case 8: // Landmark Sixes (×6)
      const fivePart = 5 * otherNumber;
      return {
        ruleName: "5-Group + 1 Rule (×6)",
        concept: "Start with an easy ×5, then add 1 more group!",
        steps: [
          {
            stepNumber: 1,
            label: `Easy ×5 landmark`,
            math: `5 × ${otherNumber} = ${fivePart}`,
          },
          {
            stepNumber: 2,
            label: `Add 1 more ${otherNumber}`,
            math: `${fivePart} + ${otherNumber} = ${product}`,
            highlight: true,
          },
        ],
        conclusion: `So 6 × ${otherNumber} = ${product}`,
      };

    case 9: // The Tricky Eights (×8)
      const d1 = otherNumber * 2;
      const d2 = d1 * 2;
      return {
        ruleName: "Triple-Double Strategy (×8)",
        concept: "8 is 2 × 2 × 2: Double the number 3 times!",
        steps: [
          { stepNumber: 1, label: `Double 1`, math: `${otherNumber} + ${otherNumber} = ${d1}` },
          { stepNumber: 2, label: `Double 2`, math: `${d1} + ${d1} = ${d2}` },
          { stepNumber: 3, label: `Double 3`, math: `${d2} + ${d2} = ${product}`, highlight: true },
        ],
        conclusion: `So 8 × ${otherNumber} = ${product}`,
      };

    case 10: // The Summit Fact (7 × 8 = 56)
      if ((factorA === 7 && factorB === 8) || (factorA === 8 && factorB === 7)) {
        return {
          ruleName: "The 5-6-7-8 Rhyme",
          concept: "Say it out loud: 5, 6, 7, 8!",
          steps: [
            {
              stepNumber: 1,
              label: "The Count Rhyme",
              math: "5, 6, 7, 8  →  56 = 7 × 8",
              highlight: true,
            },
          ],
          conclusion: "7 × 8 = 56",
        };
      }
      const sevenFive = 5 * otherNumber;
      const sevenTwo = 2 * otherNumber;
      return {
        ruleName: "5-Group + 2-Group Rule (×7)",
        concept: "Split into easy groups: 5 groups + 2 groups = 7 groups!",
        steps: [
          { stepNumber: 1, label: `5 groups of ${otherNumber}`, math: `5 × ${otherNumber} = ${sevenFive}` },
          { stepNumber: 2, label: `2 groups of ${otherNumber}`, math: `2 × ${otherNumber} = ${sevenTwo}` },
          { stepNumber: 3, label: `Add together`, math: `${sevenFive} + ${sevenTwo} = ${product}`, highlight: true },
        ],
        conclusion: `So 7 × ${otherNumber} = ${product}`,
      };

    default: // Mixed fluency
      return {
        ruleName: "Rapid Retrieval",
        concept: "Retrieve from memory in under 2.5 seconds with zero counting!",
        steps: [
          { stepNumber: 1, label: "Immediate Recall", math: `${factorA} × ${factorB} = ${product}`, highlight: true },
        ],
        conclusion: `${factorA} × ${factorB} = ${product}`,
      };
  }
}
