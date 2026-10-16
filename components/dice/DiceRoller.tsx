"use client";

import { Button } from "antd";
import { useEffect, useState } from "react";

interface DiceRollerProps {
  value?: number | null;
  onRoll: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export function DiceRoller({
  value,
  onRoll,
  disabled,
  loading,
}: DiceRollerProps) {
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState<number | null>(value ?? null);

  useEffect(() => {
    if (value != null) setDisplay(value);
  }, [value]);

  const handleRoll = async () => {
    if (disabled || loading || spinning) return;
    setSpinning(true);
    let ticks = 0;
    const timer = setInterval(() => {
      setDisplay(Math.floor(Math.random() * 6) + 1);
      ticks += 1;
      if (ticks >= 8) clearInterval(timer);
    }, 80);

    try {
      await onRoll();
    } finally {
      clearInterval(timer);
      setSpinning(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={handleRoll}
        disabled={disabled || loading || spinning}
        className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-gold/50 bg-[#141b2d] text-4xl shadow-lg transition hover:border-gold hover:shadow-gold/20 disabled:opacity-40"
        aria-label="掷骰子"
      >
        {display != null ? FACES[display - 1] : "🎲"}
      </button>
      <div>
        <Button
          type="primary"
          size="large"
          onClick={handleRoll}
          disabled={disabled || loading || spinning}
          loading={loading || spinning}
        >
          掷骰子
        </Button>
        {display != null && (
          <p className="mt-1 text-sm text-gray-400">
            点数：<span className="text-gold font-semibold">{display}</span>
          </p>
        )}
      </div>
    </div>
  );
}
