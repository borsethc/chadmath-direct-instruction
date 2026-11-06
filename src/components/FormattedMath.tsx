"use client";

import React from "react";
import type { StrategyStep } from "@/lib/types";

interface FormattedMathFactProps {
  a: number;
  b: number;
  product?: number;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
}

/**
 * P0 Spec Color Coding:
 * First factor (Factor A): Light Blue (text-sky-300)
 * Multiplication symbol (×): Neutral dim white (text-white/40)
 * Second factor (Factor B): Light Purple (text-purple-300)
 * Product (The Total): Gold (text-amber-300)
 *
 * Whole product is gold (in a two-digit product such as 14, the whole product is gold).
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
    xl: "text-2xl sm:text-3xl",
    hero: "text-3xl sm:text-5xl font-black",
  };

  return (
    <span className={`inline-flex items-center font-mono font-black tracking-tight ${sizeClasses[size]} ${className}`}>
      <span className="text-sky-300 font-black">{a}</span>
      <span className="text-white/40 mx-1 font-bold">×</span>
      <span className="text-purple-300 font-black">{b}</span>
      {product !== undefined && (
        <>
          <span className="text-white/40 mx-1 font-bold">=</span>
          <span className="text-amber-300 font-black underline decoration-amber-300/40 underline-offset-4">
            {product}
          </span>
        </>
      )}
    </span>
  );
}

/**
 * Parses and formats math equations dynamically:
 * - "A × B = C" -> Light Blue × Light Purple = Gold
 * - "B + B = C" -> Light Purple + Light Purple = Gold (each addend takes color of factor it comes from)
 * - "A × B" -> Light Blue × Light Purple
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
        <span className="text-sky-300">{a}</span>
        <span className="text-white/40 mx-1">×</span>
        <span className="text-purple-300">{b}</span>
        <span className="text-white/40 mx-1">=</span>
        <span className="text-amber-300 underline decoration-amber-300/40 underline-offset-2">{c}</span>
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
        <span className="text-amber-300 underline decoration-amber-300/40 underline-offset-2">{sum}</span>
      </span>
    );
  }

  // Pattern 3: Comma-separated skip-counting sequence e.g. "5, 10, 15, 20, 25, 30, 35 = 35"
  const seqMatch = str.match(/^(\d+(?:\s*,\s*\d+)+)\s*=\s*(\d+)$/);
  if (seqMatch) {
    const sequencePart = seqMatch[1];
    const totalPart = seqMatch[2];
    return (
      <span className={`inline-flex flex-wrap items-center font-mono font-black ${sizeClasses[size]} ${className}`}>
        <span className="text-sky-300">{sequencePart}</span>
        <span className="text-white/40 mx-1">=</span>
        <span className="text-amber-300 underline decoration-amber-300/40 underline-offset-2">{totalPart}</span>
      </span>
    );
  }

  // Pattern 4: Bare multiplication e.g. "1 × 2"
  const bareMult = str.match(/^(\d+)\s*[×x*]\s*(\d+)$/);
  if (bareMult) {
    const a = parseInt(bareMult[1], 10);
    const b = parseInt(bareMult[2], 10);
    return (
      <span className={`inline-flex items-center font-mono font-black ${sizeClasses[size]} ${className}`}>
        <span className="text-sky-300">{a}</span>
        <span className="text-white/40 mx-1">×</span>
        <span className="text-purple-300">{b}</span>
      </span>
    );
  }

  // Fallback: standard font
  return <span className={`font-mono font-black text-sky-300 ${sizeClasses[size]} ${className}`}>{str}</span>;
}

/**
 * Highlights a full teacher strategy paragraph with consistent factor colors:
 * - "A × B" -> styled fact (light blue x light purple)
 * - "A group(s) of B" -> Light Blue groups of Light Purple items
 * - "total is C" -> Gold total
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
  // Match inline equations/facts and consume any immediately trailing standalone period
  const fullEqPattern = new RegExp(`(${factorA}\\s*[×x]\\s*${factorB}\\s*=\\s*${product})\\.?`, "g");
  const factPattern = new RegExp(`(${factorA}\\s*[×x]\\s*${factorB})\\.?`, "g");
  const groupsPattern = new RegExp(`(${factorA}\\s*groups?\\s*of\\s*${factorB})`, "gi");
  const totalPattern = new RegExp(`(total\\s+is\\s+)(${product})`, "gi");

  const renderInlineHighlighted = (content: string) =>
    content.split(fullEqPattern).map((eqChunk, eqIdx) => {
      if (eqChunk.match(new RegExp(`^${factorA}\\s*[×x]\\s*${factorB}\\s*=\\s*${product}$`))) {
        return (
          <span
            key={eqIdx}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-white/10 border border-white/15 font-mono font-black text-sm sm:text-base align-middle shadow-sm"
          >
            <span className="text-sky-300">{factorA}</span>
            <span className="text-white/40 mx-0.5 font-bold">×</span>
            <span className="text-purple-300">{factorB}</span>
            <span className="text-white/40 mx-0.5 font-bold">=</span>
            <span className="text-amber-300 underline decoration-amber-300/40 underline-offset-2">
              {product}
            </span>
          </span>
        );
      }

      return (
        <span key={eqIdx}>
          {eqChunk.split(factPattern).map((chunk, i) => {
            if (chunk.match(new RegExp(`^${factorA}\\s*[×x]\\s*${factorB}$`))) {
              return (
                <span
                  key={i}
                  className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded-md bg-white/10 border border-white/15 font-mono font-black text-sm sm:text-base align-middle shadow-sm"
                >
                  <span className="text-sky-300">{factorA}</span>
                  <span className="text-white/40 mx-0.5 font-bold">×</span>
                  <span className="text-purple-300">{factorB}</span>
                </span>
              );
            }

            return (
              <span key={i}>
                {chunk.split(groupsPattern).map((gChunk, j) => {
                  const gMatch = gChunk.match(
                    new RegExp(`^(${factorA})\\s*(groups?)\\s*of\\s*(${factorB})$`, "i")
                  );
                  if (gMatch) {
                    return (
                      <span key={j} className="inline-flex items-center gap-1 font-bold">
                        <span className="text-sky-300 font-black">
                          {gMatch[1]} {gMatch[2]}
                        </span>
                        <span className="text-white/60">of</span>
                        <span className="text-purple-300 font-black text-sm sm:text-base">
                          {gMatch[3]}
                        </span>
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
                              className="font-mono font-black text-sm sm:text-base text-amber-300 px-1 rounded bg-amber-500/10 border border-amber-500/20 underline decoration-amber-300/40 underline-offset-2 ml-0.5"
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
    });

  // Detect leading standalone math badge ("A × B = C" or "A × B" separated from the question)
  // and render the fact badge and the question as separate stacked elements with no trailing period.
  const leadingEqMatch = text.match(
    new RegExp(
      `^\\s*(${factorA}\\s*[×x]\\s*${factorB}\\s*=\\s*${product})\\s*\\.?\\s+([\\s\\S]+)$`
    )
  );
  const leadingFactMatch = !leadingEqMatch
    ? text.match(
        new RegExp(
          `^\\s*(${factorA}\\s*[×x]\\s*${factorB})(?:\\s*\\.\\s+|\\s*\\n\\s*)([\\s\\S]+)$`
        )
      )
    : null;

  if (leadingEqMatch || leadingFactMatch) {
    const showProductInBadge = Boolean(leadingEqMatch);
    const questionBody = (leadingEqMatch ? leadingEqMatch[2] : leadingFactMatch![2]).trim();
    const doublingQuestionMatch = questionBody.match(
      /^What number did we double to get\s+(\d+)\s+(\d+)\s+or\s+(\d+)\?$/i
    );

    return (
      <div className="w-full flex flex-col items-center gap-2 text-center">
        <div className="animate-fact-badge inline-flex items-center justify-center px-4 py-1.5 rounded-xl bg-white/12 border-2 border-purple-300/35 font-mono font-black text-xl sm:text-2xl tracking-wide shadow-md">
          <span className="text-sky-300">{factorA}</span>
          <span className="text-white/50 mx-2 font-bold">×</span>
          <span className="text-purple-300">{factorB}</span>
          {showProductInBadge && (
            <>
              <span className="text-white/50 mx-2 font-bold">=</span>
              <span className="text-amber-300 underline decoration-amber-300/60 decoration-2 underline-offset-4">
                {product}
              </span>
            </>
          )}
        </div>
        {doublingQuestionMatch ? (
          <div className="animate-question-text text-sm sm:text-base text-white font-extrabold leading-snug flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-1">
            <span>What number did we double to get</span>
            <span className="inline-flex items-center justify-center font-mono font-black text-lg sm:text-xl text-amber-300 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/35 shadow-sm">
              {doublingQuestionMatch[1]}
            </span>
            <span className="ml-0.5">
              <span className="text-sky-300 font-black">{doublingQuestionMatch[2]}</span> or{" "}
              <span className="text-purple-300 font-black">{doublingQuestionMatch[3]}</span>?
            </span>
          </div>
        ) : (
          <div className="animate-question-text text-xs sm:text-sm text-white/95 leading-relaxed font-bold whitespace-pre-line">
            {renderInlineHighlighted(questionBody)}
          </div>
        )}
      </div>
    );
  }

  return (
    <span className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium whitespace-pre-line">
      {renderInlineHighlighted(text)}
    </span>
  );
}

/**
 * P0 Headline Banner:
 * Makes the math fact the headline — largest, boldest text in the banner
 * at least twice the size of surrounding explanation text, high contrast, centered.
 */
export function HeadlineMathFactBanner({
  a,
  b,
  product,
  label,
  strategyName,
  steps,
  strategyText,
  repeatedAddition,
}: {
  a: number;
  b: number;
  product?: number;
  label?: string;
  strategyName?: string;
  steps?: StrategyStep[];
  strategyText?: string;
  repeatedAddition?: string;
}) {
  return (
    <div className="w-full p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.08] to-black/75 border-2 border-cyan-500/40 shadow-xl flex flex-col items-center text-center gap-1.5 shrink-0">
      {label && (
        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider">
          {label}
        </span>
      )}

      {/* Headline: Largest, boldest text on screen */}
      <div className="flex items-center justify-center gap-2 font-mono font-black text-3xl sm:text-4xl tracking-tight my-0.5">
        <span className="text-sky-300">{a}</span>
        <span className="text-white/40 text-2xl sm:text-3xl">×</span>
        <span className="text-purple-300">{b}</span>
        {product !== undefined && (
          <>
            <span className="text-white/40 text-2xl sm:text-3xl">=</span>
            <span className="text-amber-300 underline decoration-amber-300/40 underline-offset-4">{product}</span>
          </>
        )}
      </div>

      {/* Strategy Name directly under the fact */}
      {strategyName && (
        <span className="text-xs sm:text-sm font-black text-cyan-300 tracking-wide">
          {strategyName}
        </span>
      )}

      {/* Strategy Steps in order */}
      {steps && steps.length > 0 && (
        <div className="w-full flex flex-col gap-1 max-w-md">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-[11px] sm:text-xs"
            >
              <span className="font-bold text-white/85 text-left">{st.label}</span>
              <FormattedEquation mathString={st.expression} factorA={a} factorB={b} size="sm" />
            </div>
          ))}
        </div>
      )}

      {strategyText && (
        <div className="text-xs sm:text-sm font-semibold text-white/90 leading-snug max-w-md">
          <HighlightedStrategyText text={strategyText} factorA={a} factorB={b} product={product ?? a * b} />
        </div>
      )}

      {repeatedAddition && (!steps || steps.length === 0) && (
        <div className="text-[11px] sm:text-xs font-mono font-bold text-white/80 bg-black/50 px-3 py-1 rounded-lg border border-white/10 mt-0.5">
          <FormattedEquation mathString={repeatedAddition} factorA={a} factorB={b} size="sm" />
        </div>
      )}
    </div>
  );
}
