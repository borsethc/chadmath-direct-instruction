"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Lightbulb } from "lucide-react";
import { getDynamicRuleExplanation } from "@/lib/ruleEngine";

interface DynamicRuleCardProps {
  lessonId: number;
  factorA: number;
  factorB: number;
  mode?: "full" | "guided";
}

export function DynamicRuleCard({
  lessonId,
  factorA,
  factorB,
  mode = "full",
}: DynamicRuleCardProps) {
  const explanation = getDynamicRuleExplanation(lessonId, factorA, factorB);

  if (mode === "guided") {
    return (
      <div className="w-full p-2.5 sm:p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Rule: {explanation.ruleName}</span>
          </div>
          <span className="text-[10px] text-amber-200/60 font-semibold hidden xs:inline">
            {explanation.concept}
          </span>
        </div>

        {/* Dynamic Steps Row */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {explanation.steps.map((step) => (
            <div
              key={step.stepNumber}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] sm:text-xs font-mono font-bold ${
                step.highlight
                  ? "bg-amber-500/20 border-amber-400/50 text-amber-200 shadow-sm"
                  : "bg-black/30 border-white/10 text-white/80"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-amber-400 text-black text-[9px] font-black flex items-center justify-center shrink-0">
                {step.stepNumber}
              </span>
              <span>{step.math}</span>
            </div>
          ))}

          <span className="text-emerald-400 font-mono font-black text-xs ml-auto">
            👉 {explanation.conclusion}
          </span>
        </div>
      </div>
    );
  }

  // Full Model Mode ("I Do" phase)
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-950/60 via-purple-900/30 to-black/60 border-2 border-purple-400/40 shadow-xl flex flex-col gap-3 text-left"
    >
      <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-purple-300" />
          <span className="text-xs sm:text-sm font-black text-purple-200 uppercase tracking-wider">
            {explanation.ruleName}
          </span>
        </div>
        <span className="text-[11px] text-purple-300/80 font-medium italic">
          {explanation.concept}
        </span>
      </div>

      {/* Numbered Step-by-Step Breakdown */}
      <div className="flex flex-col gap-2">
        {explanation.steps.map((step) => (
          <div
            key={step.stepNumber}
            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
              step.highlight
                ? "bg-purple-500/20 border-purple-400/60 shadow-md shadow-purple-500/10"
                : "bg-black/40 border-white/10"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-purple-400 text-black text-xs font-black flex items-center justify-center shrink-0 shadow-sm">
                {step.stepNumber}
              </span>
              <span className="text-xs sm:text-sm font-bold text-white/90">
                {step.label}:
              </span>
            </div>

            <span className="font-mono font-black text-xs sm:text-sm text-cyan-300">
              {step.math}
            </span>
          </div>
        ))}
      </div>

      {/* Final Punchy Conclusion */}
      <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between text-xs sm:text-sm">
        <span className="text-white/60 font-semibold">Answer:</span>
        <span className="font-mono font-black text-emerald-400 text-base sm:text-lg bg-emerald-950/50 px-3 py-0.5 rounded-lg border border-emerald-500/30">
          👉 {explanation.conclusion}
        </span>
      </div>
    </motion.div>
  );
}
