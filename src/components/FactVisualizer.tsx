"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Layers } from "lucide-react";

interface FactVisualizerProps {
  factorA: number; // Number of groups (rows)
  factorB: number; // Items per group (columns)
  showAnswer?: boolean;
  activeGroupIndex?: number | null; // For sequential model animation
  compact?: boolean;
}

export function FactVisualizer({
  factorA,
  factorB,
  showAnswer = true,
  activeGroupIndex = null,
  compact = false,
}: FactVisualizerProps) {
  const [viewMode, setViewMode] = useState<"groups" | "array">("groups");
  const product = factorA * factorB;

  // Determine dot and grid sizing to guarantee ZERO vertical scrolling even for 5x8 and 5x9
  const isLargeCount = factorA * factorB > 25 || factorB >= 7;
  const isFiveByLarge = factorA === 5 && factorB >= 6;

  return (
    <div className="w-full flex flex-col items-center gap-1.5 select-none">
      {/* View Mode Toggle & Mathematical Meaning */}
      <div className="w-full flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 text-white/70 font-bold">
          <span className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-300 font-mono font-black">
            {factorA} {factorA === 1 ? "group" : "groups"}
          </span>
          <span className="text-white/40 text-[11px]">of</span>
          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono font-black">
            {factorB} {factorB === 1 ? "item" : "items"}
          </span>
        </div>

        <button
          onClick={() => setViewMode((prev) => (prev === "groups" ? "array" : "groups"))}
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer text-[10px] font-semibold"
          title="Toggle between Groups and Array view"
        >
          {viewMode === "groups" ? (
            <>
              <LayoutGrid className="w-3 h-3 text-sky-400" />
              <span>Array</span>
            </>
          ) : (
            <>
              <Layers className="w-3 h-3 text-purple-400" />
              <span>Groups</span>
            </>
          )}
        </button>
      </div>

      {/* Visual Canvas Container: strictly NO internal scrollbar */}
      <div className="w-full rounded-2xl bg-black/40 border border-white/10 p-2 sm:p-2.5 flex flex-col items-center justify-center gap-1.5 overflow-hidden backdrop-blur-md shadow-inner">
        {viewMode === "groups" ? (
          /* Equal Groups View: compact reflow prevents any overflow */
          <div className="w-full flex flex-wrap items-center justify-center gap-1 sm:gap-2">
            {Array.from({ length: factorA }).map((_, gIdx) => {
              const isActive = activeGroupIndex === gIdx;
              return (
                <motion.div
                  key={gIdx}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                    opacity: 1,
                  }}
                  transition={{ duration: 0.15 }}
                  className={`p-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                    isActive
                      ? "bg-sky-500/20 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                      : "bg-white/[0.03] border-white/10 hover:border-white/20"
                  }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-wider text-sky-300/80">
                    G{gIdx + 1}
                  </span>

                  {/* Dots inside this group: arranged in 2-row grid for large groups to prevent horizontal/vertical overflow */}
                  <div
                    className={
                      isFiveByLarge || factorB >= 7
                        ? "grid grid-rows-2 grid-flow-col gap-0.5"
                        : "flex items-center gap-0.5"
                    }
                  >
                    {Array.from({ length: factorB }).map((_, dotIdx) => (
                      <div
                        key={dotIdx}
                        className={`${
                          isLargeCount
                            ? "w-2.5 h-2.5 sm:w-3 sm:h-3 text-[6px]"
                            : "w-3 h-3 sm:w-3.5 sm:h-3.5 text-[7px]"
                        } rounded-full flex items-center justify-center font-black shadow-sm ${
                          isActive
                            ? "bg-gradient-to-br from-sky-400 to-blue-500 text-black animate-pulse"
                            : "bg-gradient-to-br from-purple-400 to-indigo-500 text-black"
                        }`}
                      >
                        {dotIdx + 1}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Grid Array View */
          <div className="flex flex-col items-center gap-0.5">
            {Array.from({ length: factorA }).map((_, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-0.5">
                <span className="text-[7px] font-bold text-sky-300/60 w-3 text-right">
                  R{rowIdx + 1}
                </span>
                {Array.from({ length: factorB }).map((_, colIdx) => (
                  <motion.div
                    key={colIdx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (rowIdx * factorB + colIdx) * 0.01 }}
                    className={`${
                      isLargeCount ? "w-2.5 h-2.5 sm:w-3 sm:h-3" : "w-3 h-3 sm:w-3.5 sm:h-3.5"
                    } rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 border border-white/20 flex items-center justify-center text-[7px] font-bold text-white/80 shadow-sm`}
                  >
                    •
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Repeated Addition Equation Bar with Light Purple addends and Gold Product */}
        <div className="w-full pt-1 border-t border-white/5 flex items-center justify-center gap-1 flex-wrap text-[11px] sm:text-xs font-mono">
          <span className="text-white/40 font-sans text-[10px]">Addition:</span>
          {Array.from({ length: factorA }).map((_, idx) => (
            <span key={idx} className="flex items-center">
              {idx > 0 && <span className="text-white/40 mx-0.5">+</span>}
              <span className="text-purple-300 font-bold">{factorB}</span>
            </span>
          ))}
          <span className="text-white/40 mx-0.5">=</span>
          <span className="text-amber-300 font-black">
            {showAnswer ? product : "?"}
          </span>
        </div>
      </div>
    </div>
  );
}
