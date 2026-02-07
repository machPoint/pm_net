"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface TypewriterProps {
  first: string; // e.g. "connect to jama"
  pivot: string; // e.g. "connect"
  second?: string; // backward compat: single next phrase
  others?: string[]; // additional phrases to cycle through after pivot
  typingSpeedMs?: number; // per character
  deletingSpeedMs?: number; // per character
  pauseMs?: number; // pause between phases
  longPauseMs?: number; // extra pause before final phrase
  boldMatch?: string; // substring to render in bold when present (e.g., "your systems")
}

export const Typewriter = ({
  first,
  pivot,
  second,
  others = [],
  typingSpeedMs = 75,
  deletingSpeedMs = 45,
  pauseMs = 700,
  longPauseMs = 1800,
  boldMatch
}: TypewriterProps) => {
  const [text, setText] = useState<string>("");
  const [done, setDone] = useState(false);
  const phaseRef = useRef<
    "typeFirst" |
    "deleteToPivot" |
    "typeSecond" |
    "cycleNext" |
    "done">(
    "typeFirst");
  const timerRef = useRef<number | null>(null);
  const indexRef = useRef(0); // index into targets array

  // Build targets list (back-compat: include `second` if provided)
  const targets = useMemo(() => {
    const list = [] as string[];
    if (second) list.push(second);
    if (others.length) list.push(...others);
    return list;
  }, [second, others]);

  // Precompute strings
  const firstChars = useMemo(() => first.split(""), [first]);
  const currentTarget = targets[indexRef.current] ?? "";

  useEffect(() => {
    const clear = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };

    const schedule = (fn: () => void, ms: number) => {
      clear();
      timerRef.current = window.setTimeout(fn, ms);
    };

    const step = () => {
      const phase = phaseRef.current;

      if (phase === "typeFirst") {
        const nextLen = text.length + 1;
        const next = firstChars.slice(0, nextLen).join("");
        setText(next);
        if (next === first) {
          phaseRef.current = "deleteToPivot";
          schedule(step, pauseMs);
        } else {
          schedule(step, typingSpeedMs);
        }
        return;
      }

      if (phase === "deleteToPivot") {
        if (text === pivot) {
          phaseRef.current = "typeSecond";
          const isFinal = indexRef.current === targets.length - 1;
          schedule(step, isFinal ? longPauseMs : pauseMs);
          return;
        }
        // remove one char
        const next = text.slice(0, Math.max(0, text.length - 1));
        setText(next);
        schedule(step, deletingSpeedMs);
        return;
      }

      if (phase === "typeSecond") {
        const nextLen = text.length + 1;
        // Ensure we keep the pivot and only type the remainder
        const prefix = pivot;
        const target = currentTarget;
        const suffix = target.startsWith(prefix) ? target.slice(prefix.length) : target;
        const typedSuffixLen = Math.max(0, text.startsWith(prefix) ? text.length - prefix.length : 0);
        const next = prefix + suffix.slice(0, typedSuffixLen + 1);
        setText(next);
        if (next === target) {
          // Completed one target
          if (indexRef.current >= targets.length - 1) {
            phaseRef.current = "done";
            setDone(true);
            return; // stop, keep cursor blinking
          }
          // More targets remain: pause, then backspace again
          phaseRef.current = "cycleNext";
          schedule(step, pauseMs);
          return;
        } else {
          schedule(step, typingSpeedMs);
        }
        return;
      }

      if (phase === "cycleNext") {
        // Move to next target and start deleting back to pivot
        indexRef.current = Math.min(indexRef.current + 1, targets.length - 1);
        phaseRef.current = "deleteToPivot";
        schedule(step, pauseMs);
        return;
      }
    };

    // Kick off or continue
    schedule(step, typingSpeedMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // We intentionally depend on `text` to drive the stepper
  }, [text, firstChars, typingSpeedMs, deletingSpeedMs, pauseMs, longPauseMs, pivot, first, targets]);

  // Render with optional bold match
  if (boldMatch && text.includes(boldMatch)) {
    const idx = text.indexOf(boldMatch);
    const pre = text.slice(0, idx);
    const bold = text.slice(idx);
    return (
      <span className="inline-flex items-baseline">
        <span aria-live="polite" aria-atomic="true" className="whitespace-pre">
          {pre}
          <strong className="font-semibold">{bold}</strong>
        </span>
        <span
          className={
          "ml-0.5 inline-block h-[1.1em] w-[1px] bg-foreground/80 animate-pulse " + (
          done ? "opacity-60" : "")
          }
          aria-hidden="true" />

      </span>);

  }

  return (
    <span className="inline-flex items-baseline">
      <span aria-live="polite" aria-atomic="true" className="whitespace-pre">{text}</span>
      <span
        className={
        "ml-0.5 inline-block h-[1.1em] w-[1px] bg-foreground/80 animate-pulse " + (
        done ? "opacity-60" : "")
        }
        aria-hidden="true" />

    </span>);


};