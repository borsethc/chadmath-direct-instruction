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

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* View Mode Toggle & Mathematical Meaning */}
      <div className="w-full flex items-center justify-between px-2 text-xs">
        <div className="flex items-center gap-1.5 text-white/70 font-bold">
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
            {factorA} {factorA === 1 ? "group" : "groups"}
          </span>
          <span className="text-white/40">of</span>
          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300">
            {factorB} {factorB === 1 ? "item" : "items"}
          </span>
        </div>

        <button
          onClick={() => setViewMode((prev) => (prev === "groups" ? "array" : "groups"))}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer text-[11px] font-semibold"
          title="Toggle between Groups and Array view"
        >
          {viewMode === "groups" ? (
            <>
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
              <span>Array View</span>
            </>
          ) : (
            <>
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Groups View</span>
            </>
          )}
        </button>
      </div>

      {/* Visual Canvas Container */}
      <div className="w-full min-h-[140px] max-h-[220px] rounded-2xl bg-black/40 border border-white/10 p-3 sm:p-4 flex flex-col items-center justify-center gap-3 overflow-y-auto backdrop-blur-md shadow-inner">
        {viewMode === "groups" ? (
          /* Equal Groups View */
          <div className="w-full flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
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
                  transition={{ duration: 0.2 }}
                  className={`relative p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    isActive
                      ? "bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                      : "bg-white/[0.03] border-white/10 hover:border-white/20"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                    Group {gIdx + 1}
                  </span>

                  {/* Dots inside this group */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: factorB }).map((_, dotIdx) => (
                      <div
                        key={dotIdx}
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] font-black shadow-sm ${
                          isActive
                            ? "bg-gradient-to-br from-cyan-400 to-blue-500 text-black animate-pulse"
                            : "bg-gradient-to-br from-amber-400 to-amber-600 text-black"
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
          <div className="flex flex-col items-center gap-1 sm:gap-1.5">
            {Array.from({ length: factorA }).map((_, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-[9px] font-bold text-white/30 w-4 text-right">
                  R{rowIdx + 1}
                </span>
                {Array.from({ length: factorB }).map((_, colIdx) => (
                  <motion.div
                    key={colIdx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (rowIdx * factorB + colIdx) * 0.02 }}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/20 flex items-center justify-center text-[8px] font-bold text-white/80 shadow-sm"
                  >
                    •
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Repeated Addition Equation Bar */}
        <div className="w-full pt-1.5 border-t border-white/5 flex items-center justify-center gap-1 flex-wrap text-xs sm:text-sm font-mono text-white/80">
          <span className="text-white/40 font-sans text-xs">Repeated Addition:</span>
          <span className="text-amber-300 font-bold">
            {Array.from({ length: factorA }).map(() => factorB).join(" + ")}
          </span>
          <span className="text-white/40">=</span>
          <span className="text-emerald-400 font-black">
            {showAnswer ? product : "?"}
          </span>
        </div>
      </div>
    </div>
  );
}
