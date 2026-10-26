"use client";

import { useEffect, useRef, useState } from "react";
import type { LifeCircle } from "@/types/game";
import "./ceremony.css";

export interface CeremonyView {
  to: LifeCircle;
  nickname: string;
  passiveIncome: number;
  totalExpense: number;
  netWorth: number;
  netWorthWan: number;
  multiplier: number;
  frame?: string;
}

function useCount(target: number, run: boolean) {
  const [value, setValue] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) {
      setValue(target);
      return;
    }
    setValue(0);
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 900);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return value;
}

const ARC = [
  { x: 400, y: 612 },
  { x: 250, y: 520 },
  { x: 210, y: 300 },
  { x: 400, y: 196 },
];

function arcPoint(t: number) {
  const [p0, p1, p2, p3] = ARC;
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

function frameProgress(frame?: string) {
  if (frame === "leap") return 0.58;
  if (frame === "title") return 1;
  return 0;
}

function playChime(core: boolean) {
  if (window.localStorage.getItem("life-leap-sound") !== "on") return;
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(core ? 494 : 392, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(core ? 988 : 784, audio.currentTime + 0.42);
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.035, audio.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 1.1);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 1.15);
  window.setTimeout(() => void audio.close(), 1400);
}

function Foil({ core, active, settled }: { core: boolean; active: boolean; settled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
    };
    resize();
    const count = core ? 56 : 36;
    const flakes = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: settled ? Math.random() : Math.random() * -0.2,
      s: 1.2 + Math.random() * 2.4,
      v: 0.08 + Math.random() * 0.16,
      r: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.08,
      gold: Math.random() > 0.35,
    }));
    let raf = 0;
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      for (const flake of flakes) {
        flake.y += flake.v / 60;
        flake.r += flake.spin;
        if (flake.y > 1.05) {
          flake.y = -0.05;
          flake.x = Math.random();
        }
        context.save();
        context.translate(flake.x * width, flake.y * height);
        context.rotate(flake.r);
        context.fillStyle = flake.gold ? "rgba(243,226,179,0.85)" : "rgba(255,255,255,0.7)";
        context.fillRect(-flake.s, -0.4, flake.s * 2, 1.1);
        context.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, core, settled]);
  return <canvas ref={ref} className="ll-ceremony-foil" aria-hidden />;
}

function CeremonyToken({
  nickname,
  core,
  hold,
  frame,
}: {
  nickname: string;
  core: boolean;
  hold: boolean;
  frame?: string;
}) {
  const ref = useRef<SVGGElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const place = (t: number) => {
      const point = arcPoint(t);
      node.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
    };
    if (hold) {
      place(frameProgress(frame));
      return;
    }
    const delay = 950;
    const duration = 1100;
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const raw = (now - started - delay) / duration;
      const t = Math.max(0, Math.min(1, raw));
      const eased = 1 - (1 - t) ** 3;
      place(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frame, hold]);

  const initial = arcPoint(hold ? frameProgress(frame) : 0);
  return (
    <g ref={ref} className="ll-ceremony-token" transform={`translate(${initial.x.toFixed(2)} ${initial.y.toFixed(2)})`}>
      <circle r="28" fill={core ? "rgba(255,246,216,0.18)" : "rgba(212,168,83,0.16)"} />
      <circle r="18" fill="#0c0a08" stroke="#f3e2b3" strokeWidth="3" />
      <circle r="12" fill={core ? "#fff6d8" : "#d4a853"} />
      <text textAnchor="middle" dominantBaseline="middle" y="1" fill="#1a1408" fontSize="13" fontWeight="700">
        {nickname.slice(0, 1) || "我"}
      </text>
    </g>
  );
}

export function CircleCeremony({
  view,
  onDone,
}: {
  view: CeremonyView;
  onDone: () => void;
}) {
  const core = view.to === "核心";
  const [reduced, setReduced] = useState(false);
  const [runCount, setRunCount] = useState(false);
  const hold = Boolean(view.frame);
  const passive = useCount(view.passiveIncome, runCount);
  const worth = useCount(Math.round(view.netWorth / 10000), runCount);
  const passiveText = (runCount ? passive : view.passiveIncome).toLocaleString();
  const worthText = (runCount ? worth : Math.round(view.netWorth / 10000)).toLocaleString();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const armed = useRef(hold);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reduce);
    if (hold) return;
    if (reduce) {
      armed.current = true;
      const timer = window.setTimeout(() => onDoneRef.current(), 2800);
      return () => window.clearTimeout(timer);
    }
    playChime(core);
    const armTimer = window.setTimeout(() => {
      armed.current = true;
    }, 1600);
    const countTimer = window.setTimeout(() => setRunCount(true), 2100);
    const timer = window.setTimeout(() => onDoneRef.current(), 4000);
    return () => {
      window.clearTimeout(armTimer);
      window.clearTimeout(countTimer);
      window.clearTimeout(timer);
    };
  }, [core, hold]);

  const subtitle = core
    ? `净资产 ≥ ${view.netWorthWan} 万，且被动收入 ≥ 总支出 × ${view.multiplier}`
    : "非劳动收入 > 总支出";

  return (
    <div
      className={`ll-ceremony ${core ? "is-core" : "is-boss"}${reduced ? " is-reduced" : ""}`}
      data-frame={reduced ? undefined : view.frame}
      role="dialog"
      aria-label={`跃迁成功，晋升${view.to}圈`}
      onClick={() => {
        if (armed.current) onDone();
      }}
    >
      <div className="ll-ceremony-dim" />
      {!reduced && (
        <>
          <Foil core={core} active={!hold || view.frame === "title"} settled={view.frame === "title"} />
          <div className="ll-ceremony-stage">
            <svg className="ll-ceremony-svg" viewBox="0 0 800 800" aria-hidden>
              <defs>
                <linearGradient id="llCeremonyMetal" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fff8e4" />
                  <stop offset="45%" stopColor="#d4a853" />
                  <stop offset="100%" stopColor="#fff1c4" />
                </linearGradient>
                <radialGradient id="llCeremonySpot" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(243,226,179,0.55)" />
                  <stop offset="100%" stopColor="rgba(243,226,179,0)" />
                </radialGradient>
              </defs>
              <circle className="ll-ceremony-spot" cx="400" cy="400" r="210" fill="url(#llCeremonySpot)" />
              <circle className="ll-ceremony-halo" cx="400" cy="400" r="214" strokeWidth={core ? 3 : 2.2} />
              {core && <circle className="ll-ceremony-halo-core" cx="400" cy="400" r="248" strokeWidth="1.6" />}
              <circle className="ll-ceremony-shock" cx="400" cy="400" r="150" strokeWidth="2" />
              {core && <circle className="ll-ceremony-shock-core" cx="400" cy="400" r="186" strokeWidth="1.2" />}
              <g className="ll-ceremony-burst">
                <path d="M400 168 V146 M428 178 L446 162 M372 178 L354 162 M400 224 V242" />
              </g>
              <CeremonyToken nickname={view.nickname} core={core} hold={hold} frame={view.frame} />
            </svg>
          </div>
        </>
      )}
      <div className="ll-ceremony-card">
        <p className="ll-ceremony-kicker">跃迁成功</p>
        <h2 className="ll-ceremony-title">晋升{view.to}圈</h2>
        <p className="ll-ceremony-sub">{subtitle}</p>
        <div className="ll-ceremony-nums">
          {core ? (
            <>
              <div>
                <span>{worthText} 万</span>
                <small>净资产</small>
              </div>
              <div>
                <span>{view.multiplier}×</span>
                <small>被动收入倍数</small>
              </div>
            </>
          ) : (
            <>
              <div>
                <span>{passiveText}</span>
                <small>非劳动收入</small>
              </div>
              <div>
                <span>{view.totalExpense.toLocaleString()}</span>
                <small>总支出</small>
              </div>
            </>
          )}
        </div>
        <p className="ll-ceremony-hint">点击任意处继续</p>
      </div>
    </div>
  );
}

export function CircleBanner({
  nickname,
  to,
  onDone,
}: {
  nickname: string;
  to: LifeCircle;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="ll-ceremony-banner" role="status">
      <i />
      {nickname} 晋升{to}圈
    </div>
  );
}
