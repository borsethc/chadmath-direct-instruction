"use client";

import React from "react";

interface FormattedMathFactProps {
  a: number;
  b: number;
  product?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * Renders a multiplication fact with:
 * - First digit (Factor A, Number of Groups): Cyan (bolder, larger)
 * - Multiplication symbol (×): Neutral dim white
 * - Second digit (Factor B, Items per group): Purple (bolder, larger)
 * - Product (The total): Emerald (bolder, larger, underlined)
 */
export function FormattedMathFact({
  a,
  b,
  product,
  size = "md",
  className = "",
}: FormattedMathFactProps) {
  const sizeClasses = {
    sm: "text-xs sm:text-sm",
    md: "text-sm sm:text-base",
    lg: "text-lg sm:text-xl",
    xl: "text-3xl sm:text-5xl",
  };

  return (
    <span className={`inline-flex items-center font-mono font-black tracking-tight ${sizeClasses[size]} ${className}`}>
      <span className="text-cyan-400 font-black">{a}</span>
      <span className="text-white/40 mx-1 font-bold">×</span>
      <span className="text-purple-300 font-black">{b}</span>
      {product !== undefined && (
        <>
          <span className="text-white/40 mx-1 font-bold">=</span>
          <span className="text-emerald-400 font-black underline decoration-emerald-400/50 underline-offset-4">
            {product}
          </span>
        </>
      )}
    </span>
  );
}

/**
 * Parses and formats math equations dynamically:
 * - "A × B = C" -> Cyan × Purple = Emerald
 * - "B + B = C" -> Purple + Purple = Emerald
 * - "A × B" -> Cyan × Purple
 */
export function FormattedEquation({
  mathString,
  factorA,
  factorB,
  className = "",
  size = "md",
}: {
  mathString: string;
  factorA?: number;
  factorB?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "text-xs sm:text-sm",
    md: "text-sm sm:text-base",
    lg: "text-base sm:text-lg",
  };

  const str = mathString.trim();

  // Pattern 1: Multiplication equation "A × B = C" or "A x B = C"
  const multMatch = str.match(/^(\d+)\s*[×x*]\s*(\d+)\s*=\s*(\d+)$/);
  if (multMatch) {
    const a = parseInt(multMatch[1], 10);
    const b = parseInt(multMatch[2], 10);
    const c = parseInt(multMatch[3], 10);
    return (
      <span className={`inline-flex items-center font-mono font-black ${sizeClasses[size]} ${className}`}>
        <span className="text-cyan-400">{a}</span>
        <span className="text-white/40 mx-1">×</span>
        <span className="text-purple-300">{b}</span>
        <span className="text-white/40 mx-1">=</span>
        <span className="text-emerald-400 underline decoration-emerald-400/50 underline-offset-2">{c}</span>
      </span>
    );
  }

  // Pattern 2: Addition equation e.g. "3 + 3 = 6" or "7 + 7 = 14"
  const addMatch = str.match(/^(.+)=\s*(\d+)$/);
  if (addMatch && str.includes("+")) {
    const leftSide = addMatch[1];
    const sum = addMatch[2];
    const addends = leftSide.split("+").map((s) => s.trim());
    return (
      <span className={`inline-flex items-center font-mono font-black ${sizeClasses[size]} ${className}`}>
        {addends.map((item, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-white/40 mx-1">+</span>}
            <span className="text-purple-300">{item}</span>
          </React.Fragment>
        ))}
        <span className="text-white/40 mx-1">=</span>
        <span className="text-emerald-400 underline decoration-emerald-400/50 underline-offset-2">{sum}</span>
      </span>
    );
  }

  // Pattern 3: Bare multiplication e.g. "1 × 2"
  const bareMult = str.match(/^(\d+)\s*[×x*]\s*(\d+)$/);
  if (bareMult) {
    const a = parseInt(bareMult[1], 10);
    const b = parseInt(bareMult[2], 10);
    return (
      <span className={`inline-flex items-center font-mono font-black ${sizeClasses[size]} ${className}`}>
        <span className="text-cyan-400">{a}</span>
        <span className="text-white/40 mx-1">×</span>
        <span className="text-purple-300">{b}</span>
      </span>
    );
  }

  // Fallback: standard font
  return <span className={`font-mono font-black text-cyan-300 ${sizeClasses[size]} ${className}`}>{str}</span>;
}

/**
 * Highlights a full teacher strategy paragraph with bigger, bolder colored elements:
 * - "A × B" -> styled fact
 * - "A group(s) of B" -> Cyan groups of Purple items
 * - "total is C" -> Emerald total
 */
export function HighlightedStrategyText({
  text,
  factorA,
  factorB,
  product,
}: {
  text: string;
  factorA: number;
  factorB: number;
  product: number;
}) {
  // Regex pattern matching the fact, groups phrasing, and total
  // E.g. "1 × 2", "1 x 2", "1 group of 2", "total is 2"
  const factPattern = new RegExp(`(${factorA}\\s*[×x]\\s*${factorB})`, "g");
  const groupsPattern = new RegExp(`(${factorA}\\s*groups?\\s*of\\s*${factorB})`, "gi");
  const totalPattern = new RegExp(`(total\\s+is\\s+)(${product})`, "gi");

  // We split by segments and format
  const parts = text.split(/(×|x|\d+\s*[×x]\s*\d+|\d+\s*groups?\s*of\s*\d+|total\s+is\s+\d+)/gi);

  return (
    <span className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
      {text.split(factPattern).map((chunk, i) => {
        if (chunk.match(new RegExp(`^${factorA}\\s*[×x]\\s*${factorB}$`))) {
          return (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded-md bg-white/10 border border-white/15 font-mono font-black text-sm sm:text-base align-middle shadow-sm"
            >
              <span className="text-cyan-400">{factorA}</span>
              <span className="text-white/40 mx-0.5 font-bold">×</span>
              <span className="text-purple-300">{factorB}</span>
            </span>
          );
        }

        // Within non-fact chunks, format groups phrasing and total
        return (
          <span key={i}>
            {chunk.split(groupsPattern).map((gChunk, j) => {
              const gMatch = gChunk.match(new RegExp(`^(${factorA})\\s*(groups?)\\s*of\\s*(${factorB})$`, "i"));
              if (gMatch) {
                return (
                  <span key={j} className="inline-flex items-center gap-1 font-bold">
                    <span className="text-cyan-300 font-black">{gMatch[1]} {gMatch[2]}</span>
                    <span className="text-white/60">of</span>
                    <span className="text-purple-300 font-black text-sm sm:text-base">{gMatch[3]}</span>
                  </span>
                );
              }

              return (
                <span key={j}>
                  {gChunk.split(totalPattern).map((tChunk, k) => {
                    if (tChunk.toLowerCase().startsWith("total is")) {
                      return <span key={k}>{tChunk}</span>;
                    }
                    if (tChunk === String(product)) {
                      return (
                        <span
                          key={k}
                          className="font-mono font-black text-sm sm:text-base text-emerald-400 px-1 rounded bg-emerald-500/10 border border-emerald-500/20 underline decoration-emerald-400/50 underline-offset-2 ml-0.5"
                        >
                          {product}
                        </span>
                      );
                    }
                    return tChunk;
                  })}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
