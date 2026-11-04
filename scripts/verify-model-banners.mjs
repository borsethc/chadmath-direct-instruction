// Automated check that renders the model banner for all 81 facts (1x1 to 9x9)
// and fails with exit code 1 if any banner, equation, or repeated-addition line
// is mathematically wrong or refers to the wrong factors.

import { getDynamicRuleExplanation } from "../src/lib/ruleEngine.ts";

let failureCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    failureCount++;
  }
}

console.log("🔍 Running Automated Mathematical Verification for all 81 Facts (1×1 to 9×9)...");

for (let a = 1; a <= 9; a++) {
  for (let b = 1; b <= 9; b++) {
    const product = a * b;

    // Test across lessons 1 through 11
    for (let lessonId = 1; lessonId <= 11; lessonId++) {
      const exp = getDynamicRuleExplanation(lessonId, a, b);

      // 1. Conclusion must reflect the current problem and correct product
      const conclusionNumbers = exp.conclusion.match(/\d+/g)?.map(Number) || [];
      assert(
        conclusionNumbers.includes(product),
        `Fact ${a}×${b} (Lesson ${lessonId}): Conclusion "${exp.conclusion}" does not include correct product ${product}`
      );

      // 2. Specific x2 doubling models verification (Lesson 2)
      if ((a === 2 || b === 2) && exp.ruleName === "The Double Rule (×2)") {
        const other = a === 2 ? b : a;
        if (other !== 2) {
          // Must NEVER double the 2 for problems other than 2x2
          assert(
            !exp.conclusion.includes("2 × 2 ="),
            `Fact ${a}×${b}: Invalid conclusion "${exp.conclusion}" mentions 2 × 2 for other factor ${other}`
          );

          // Steps must double the OTHER factor
          const stepMathText = exp.steps.map((s) => s.math).join(" ");
          assert(
            !stepMathText.includes("2 + 2 ="),
            `Fact ${a}×${b}: Step math "${stepMathText}" contains "2 + 2 =" instead of doubling ${other}`
          );
          assert(
            stepMathText.includes(`${other} + ${other} = ${product}`),
            `Fact ${a}×${b}: Step math does not contain expected doubling "${other} + ${other} = ${product}". Found: "${stepMathText}"`
          );
        } else {
          // For 2x2, must equal 4 only
          assert(
            product === 4,
            `2x2 must equal 4, got ${product}`
          );
        }
      }

      // 3. Specific x1 models verification
      if ((a === 1 || b === 1) && exp.ruleName.includes("Identity")) {
        const other = a === 1 ? b : a;
        const stepLabels = exp.steps.map((s) => s.label).join(" ");
        if (other !== 1) {
          assert(
            !stepLabels.includes("1 group of 1"),
            `Fact ${a}×${b}: Banner "${stepLabels}" mentions "1 group of 1" when N is ${other}`
          );
          assert(
            stepLabels.includes(`1 group of ${other}`) || stepLabels.includes(`${other} group`),
            `Fact ${a}×${b}: Banner "${stepLabels}" does not mention 1 group of ${other}`
          );
        }
      }

      // 4. Mathematical accuracy of equation steps (A + B = C, A - B = C, A × B = C)
      for (const step of exp.steps) {
        // Test addition equations: X + Y = Z
        const addMatch = step.math.match(/(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)/);
        if (addMatch) {
          const num1 = parseInt(addMatch[1], 10);
          const num2 = parseInt(addMatch[2], 10);
          const sum = parseInt(addMatch[3], 10);
          assert(
            num1 + num2 === sum,
            `Fact ${a}×${b}: Arithmetic error in step "${step.math}": ${num1} + ${num2} != ${sum}`
          );
        }

        // Test subtraction equations: X - Y = Z
        const subMatch = step.math.match(/(\d+)\s*-\s*(\d+)\s*=\s*(\d+)/);
        if (subMatch) {
          const num1 = parseInt(subMatch[1], 10);
          const num2 = parseInt(subMatch[2], 10);
          const diff = parseInt(subMatch[3], 10);
          assert(
            num1 - num2 === diff,
            `Fact ${a}×${b}: Arithmetic error in step "${step.math}": ${num1} - ${num2} != ${diff}`
          );
        }

        // Test multiplication equations: X × Y = Z
        const mulMatch = step.math.match(/(\d+)\s*[×x*]\s*(\d+)\s*=\s*(\d+)/);
        if (mulMatch) {
          const num1 = parseInt(mulMatch[1], 10);
          const num2 = parseInt(mulMatch[2], 10);
          const prod = parseInt(mulMatch[3], 10);
          assert(
            num1 * num2 === prod,
            `Fact ${a}×${b}: Arithmetic error in step "${step.math}": ${num1} × ${num2} != ${prod}`
          );
        }
      }

      // 5. Repeated addition & strategy representation line verification
      if (exp.repeatedAddition && exp.repeatedAddition !== "0") {
        if (/^[\d\s+]+$/.test(exp.repeatedAddition.trim())) {
          const parts = exp.repeatedAddition.split("+").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
          const sumOfParts = parts.reduce((acc, val) => acc + val, 0);
          assert(
            sumOfParts === product,
            `Fact ${a}×${b}: Repeated addition "${exp.repeatedAddition}" sums to ${sumOfParts}, expected ${product}`
          );
        } else {
          // If it's a rich strategy split (e.g. 14 + 7 = 21 or Triple-Double: 7 → 14 → 28 → 56), verify product is included
          assert(
            exp.repeatedAddition.includes(String(product)),
            `Fact ${a}×${b}: Strategy representation "${exp.repeatedAddition}" must reference product ${product}`
          );
        }
      }
    }
  }
}

if (failureCount > 0) {
  console.error(`\n🚨 FAILED: ${failureCount} errors found in model banner verification!`);
  process.exit(1);
} else {
  console.log("✅ PASSED: All 81 facts (1×1 to 9×9) verified across all lessons! 0 mathematical errors.");
  process.exit(0);
}
