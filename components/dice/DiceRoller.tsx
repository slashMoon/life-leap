"use client";

import { Button } from "antd";
import { useEffect, useRef, useState } from "react";

interface DiceRollerProps {
  value?: number | null;
  onRoll: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  /** 不是自己的回合时显示，例如「等待 旅人 掷骰」 */
  hint?: string;
  /** 其他玩家掷骰时，用同一颗骰子滚到对方的点数 */
  rollCue?: { key: string; value: number } | null;
}

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DieFace({ value }: { value: number | null }) {
  if (value == null) return <span className="ll-die-idle">·</span>;
  if (value < 1 || value > 6) return <span className="ll-die-num">{value}</span>;
  const on = new Set(PIPS[value]);
  return (
    <span className="ll-pips" aria-hidden>
      {Array.from({ length: 9 }, (_, index) => (
        <i key={index} className={on.has(index) ? "on" : ""} />
      ))}
    </span>
  );
}

export function DiceRoller({
  value,
  onRoll,
  disabled,
  loading,
  hint,
  rollCue,
}: DiceRollerProps) {
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState<number | null>(value ?? null);
  const seenCue = useRef<string | null>(null);
  const primed = useRef(false);
  const cueKey = rollCue?.key ?? null;
  const cueValue = rollCue?.value;

  useEffect(() => {
    if (!spinning && value != null) setDisplay(value);
  }, [value, spinning]);

  useEffect(() => {
    if (!primed.current) {
      primed.current = true;
      seenCue.current = cueKey;
      return;
    }
    if (!cueKey || cueValue == null || seenCue.current === cueKey) return;
    seenCue.current = cueKey;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSpinning(true);
    const timer = window.setTimeout(() => {
      setDisplay(cueValue);
      setSpinning(false);
    }, reduce ? 0 : 680);
    return () => window.clearTimeout(timer);
  }, [cueKey, cueValue]);

  const handleRoll = async () => {
    if (disabled || loading || spinning) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    setSpinning(true);
    try {
      await onRoll();
    } finally {
      const remain = reduce ? 0 : 680 - (performance.now() - started);
      if (remain > 0) await new Promise((resolve) => setTimeout(resolve, remain));
      setSpinning(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={handleRoll}
        disabled={disabled || loading || spinning}
        className={`ll-die ${spinning ? "is-spinning" : display != null ? "is-settled" : ""}`}
        aria-label={hint ?? "掷骰子"}
      >
        {spinning ? <span className="ll-die-idle">◆</span> : <DieFace value={display} />}
      </button>
      <div>
        <Button
          type="primary"
          size="large"
          onClick={handleRoll}
          disabled={disabled || loading || spinning}
          loading={loading || spinning}
        >
          {hint ?? "掷骰子"}
        </Button>
        {hint ? (
          <p className="mt-1 text-sm text-[var(--ll-gold-bright)]">{hint}</p>
        ) : null}
        {display != null && !spinning && (
          <p className="mt-1 text-sm text-[var(--ll-muted)]">
            点数：<span className="font-semibold text-[var(--ll-gold-bright)]">{display}</span>
          </p>
        )}
      </div>
    </div>
  );
}
