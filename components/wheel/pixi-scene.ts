import { INNER_TRACK, LIFE_DIMENSIONS, OUTER_TRACK } from "@/lib/constants/board";
import type { BoardTile, LifeCircle } from "@/types/game";
import { Application, Container, Graphics, Text } from "pixi.js";
import {
  motionDuration,
  motionSteps,
  poseFromSample,
  restPose,
  ringMid,
  sampleMotion,
  trackLength,
  type MotionStep,
  type RingPoint,
  type TrackName,
  WHEEL_CENTER,
  WHEEL_SIZE,
} from "./token-motion";
import type { WheelToken } from "./types";
import { labelPosition, segmentAngles } from "./wheel-utils";

const FONT =
  '"WenQuanYi Micro Hei", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif';

const CX = WHEEL_CENTER;
const CY = WHEEL_CENTER;

const R = {
  bezelOuter: 352,
  bezelInner: 336,
  outerOuter: 330,
  outerInner: 232,
  seamOuter: 228,
  seamInner: 214,
  innerOuter: 210,
  innerInner: 132,
  dimOuter: 126,
  dimInner: 90,
};

export interface WheelSceneState {
  tokens: WheelToken[];
  activePosition?: RingPoint;
  lastDice?: number | null;
  playerLabel?: string;
  orbit?: LifeCircle;
  onHover?: (tile: BoardTile | null) => void;
}

export interface WheelHandle {
  sync(state: WheelSceneState): void;
  destroy(): void;
}

interface TokenView {
  root: Container;
  ring: Graphics;
  body: Graphics;
  initial: Text;
  badge: Graphics;
  dice: Text;
}

interface RunningMotion {
  steps: MotionStep[];
  started: number;
  dur: number;
}

const ORBIT_RANK: Record<LifeCircle, number> = { 牛马: 0, 老板: 1, 核心: 2 };

function cssHex(input: string | undefined, fallback = 0xd4a853) {
  const match = input?.trim().match(/^#([0-9a-fA-F]{6})$/);
  return match ? Number.parseInt(match[1], 16) : fallback;
}

function traceSector(
  g: Graphics,
  rInner: number,
  rOuter: number,
  start: number,
  end: number
) {
  const x1 = CX + rOuter * Math.cos(start);
  const y1 = CY + rOuter * Math.sin(start);
  g.moveTo(x1, y1)
    .arc(CX, CY, rOuter, start, end, false)
    .arc(CX, CY, rInner, end, start, true)
    .closePath();
}

function makeText(text: string, size: number, fill: number, weight: "600" | "700" | "800" = "600") {
  const node = new Text({
    text,
    style: { fontFamily: FONT, fontSize: size, fontWeight: weight, fill },
    resolution: Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1),
  });
  node.anchor.set(0.5);
  node.eventMode = "none";
  return node;
}

function addRadialLabel(
  parent: Container,
  text: string,
  mid: number,
  rInner: number,
  rOuter: number,
  size: number
) {
  const chars = Array.from(text);
  const rotation = mid - Math.PI / 2;
  chars.forEach((char, index) => {
    const t = chars.length === 1 ? 0.5 : index / Math.max(1, chars.length - 1);
    const pos = labelPosition(CX, CY, rInner + (rOuter - rInner) * t, mid);
    const node = makeText(char, size, 0xf6f1e6);
    node.position.set(pos.x, pos.y);
    node.rotation = rotation;
    parent.addChild(node);
  });
}

function drawGlyph(type: string) {
  const g = new Graphics();
  g.eventMode = "none";
  switch (type) {
    case "opportunity":
      for (const [x, y] of [
        [-3.1, -3.1],
        [3.1, -3.1],
        [-3.1, 3.1],
        [3.1, 3.1],
      ] as const) {
        g.circle(x, y, 2.15).fill({ color: 0x1f6b45 });
        g.circle(x, y, 1.15).fill({ color: 0x7dffa8 });
      }
      break;
    case "risk":
      g.poly([0, -6.6, 6, 5.4, -6, 5.4]).fill({ color: 0xf0b429 });
      g.moveTo(0, -1.4).lineTo(0, 1.5).stroke({ width: 1.2, color: 0x1a1408 });
      g.circle(0, 3.15, 0.7).fill({ color: 0x1a1408 });
      break;
    case "market":
      g.circle(-3, 1, 2.7).stroke({ width: 1.25, color: 0x8cbcff });
      g.circle(3.2, -1, 2.7).stroke({ width: 1.25, color: 0x8cbcff });
      break;
    case "settlement":
      g.roundRect(-4.8, -6, 9.6, 12, 1.4).fill({ color: 0xc4473a });
      g.rect(-3.2, -4.2, 6.4, 1.6).fill({ color: 0xffd0c8, alpha: 0.8 });
      break;
    case "child":
      g.circle(0, -1.3, 1.9).fill({ color: 0xe7d4ff });
      g.moveTo(-6, 2.2).quadraticCurveTo(0, 6.2, 6, 2.2).stroke({ width: 1.25, color: 0xd7b0ff });
      break;
    case "health":
    case "study":
      g.moveTo(0, -6.4)
        .quadraticCurveTo(3.2, -1, 0, 2.4)
        .quadraticCurveTo(-3.2, -1, 0, -6.4)
        .fill({ color: 0xff8a5b });
      g.poly([-1.4, 2, -3.8, 5.8, -0.5, 3.1]).fill({ color: 0xf5c542 });
      g.poly([1.4, 2, 3.8, 5.8, 0.5, 3.1]).fill({ color: 0xf5c542 });
      break;
    case "charity":
      g.poly([0, 5, -5.2, -0.4, 0, -3, 5.2, -0.4]).fill({ color: 0xf3e2b3 });
      break;
    case "financial_storm":
      g.moveTo(-6, 1.4)
        .quadraticCurveTo(-2, -5.4, 2, -0.4)
        .quadraticCurveTo(5, -4, 5.4, 2)
        .stroke({ width: 1.35, color: 0xff8d8d });
      g.poly([0.1, -1, -1.2, 2.8, 1, 2.8, -0.15, 5.6, 2.3, -1]).fill({ color: 0xffe08a });
      break;
    case "investment":
      g.circle(0, 0, 2.2).stroke({ width: 1.2, color: 0x9ec4ff });
      g.circle(0, 0, 4.2).stroke({ width: 1.2, color: 0x9ec4ff });
      break;
    case "wealth_leisure":
      g.circle(0, 0, 4.6).stroke({ width: 1.25, color: 0xd7b0ff });
      g.moveTo(0, -2).lineTo(0, 0.4).lineTo(1.8, 1.6).stroke({ width: 1.25, color: 0xd7b0ff });
      break;
    case "quality_life":
      g.poly([0, -6, 4.8, 0, 0, 6, -4.8, 0]).fill({ color: 0x2f9e62 });
      g.poly([0, -3, 2.2, 0, 0, 3, -2.2, 0]).fill({ color: 0xb6ffd0 });
      break;
    case "tax_audit":
      g.roundRect(-4.4, -5.8, 8.8, 11.6, 1.2).stroke({ width: 1.15, color: 0xb9d4ff });
      g.moveTo(-2, -2).lineTo(2, -2).moveTo(-2, 0.6).lineTo(2, 0.6).stroke({
        width: 1.1,
        color: 0xb9d4ff,
      });
      break;
    case "divorce":
      g.poly([0, 5.2, -5.2, -0.4, 0, -3.2, 5.2, -0.4]).fill({ color: 0xc084fc });
      g.moveTo(-1.2, -0.2).lineTo(1.4, 2.4).stroke({ width: 1.2, color: 0x241433 });
      break;
    default:
      g.circle(0, 0, 2.6).fill({ color: 0xd4a853 });
  }
  return g;
}

function createStars(count: number) {
  let seed = 20261020;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: next() * WHEEL_SIZE,
    y: next() * WHEEL_SIZE,
    r: next() > 0.86 ? 1.35 : 0.7,
    gold: next() > 0.8,
    opacity: 0.35 + next() * 0.6,
    phase: next() * Math.PI * 2,
  }));
}

class DualRingScene {
  private readonly app: Application;
  private readonly onHover?: (tile: BoardTile | null) => void;
  private readonly reduced: boolean;
  private readonly stars = createStars(96);
  private readonly starG = new Graphics();
  private readonly sheen = new Graphics();
  private readonly orbitGlow = new Graphics();
  private readonly shockG = new Graphics();
  private readonly tokenLayer = new Container();
  private dead = false;
  private removeTick: (() => void) | null = null;

  private hovered: BoardTile | null = null;
  private pinned = false;
  private focus: RingPoint | null = null;

  private tokenState = new Map<string, WheelToken>();
  private settled = new Map<string, RingPoint>();
  private target = new Map<string, RingPoint>();
  private motions = new Map<string, RunningMotion>();
  private views = new Map<string, TokenView>();

  private orbit: LifeCircle = "牛马";
  private orbitReady = false;
  private shock: { started: number } | null = null;

  private playerLabel = "我";
  private lastDice: number | null = null;

  constructor(app: Application, onHover?: (tile: BoardTile | null) => void) {
    this.app = app;
    this.onHover = onHover;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.build();
    const tick = () => {
      if (!this.dead) this.frame(performance.now());
    };
    app.ticker.add(tick);
    this.removeTick = () => app.ticker.remove(tick);
  }

  sync(state: WheelSceneState) {
    if (this.dead) return;
    const now = performance.now();
    this.playerLabel = state.playerLabel || "我";
    this.lastDice = state.lastDice ?? null;
    this.focus = state.activePosition ?? null;
    this.syncOrbit(state.orbit, now);
    this.syncTokens(this.withFallback(state.tokens), now);
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.removeTick?.();
    this.app.destroy({ removeView: true }, { children: true });
  }

  private withFallback(tokens: WheelToken[]) {
    if (tokens.length > 0 || !this.focus) return tokens;
    return [
      {
        id: "__solo",
        label: this.playerLabel,
        track: this.focus.track,
        index: this.focus.index,
        active: true,
        dice: this.lastDice,
      },
    ];
  }

  private build() {
    const stage = this.app.stage;
    stage.eventMode = "static";

    const bg = new Graphics();
    bg.eventMode = "none";
    bg.circle(CX, CY, R.bezelOuter + 14).fill({ color: 0x07080c });
    const wash = new Graphics();
    wash.circle(CX, CY, 310).fill({ color: 0x3a2c16, alpha: 0.2 });
    wash.eventMode = "none";

    const outer = new Container();
    const inner = new Container();
    this.drawTrack(outer, OUTER_TRACK, R.outerInner, R.outerOuter, "outer");
    this.drawTrack(inner, INNER_TRACK, R.innerInner, R.innerOuter, "inner");

    const seam = new Graphics();
    seam.eventMode = "none";
    const seamR = (R.seamOuter + R.seamInner) / 2;
    seam.circle(CX, CY, seamR).stroke({ width: R.seamOuter - R.seamInner, color: 0xc4923a });
    seam.circle(CX, CY, seamR).stroke({ width: 1.2, color: 0xfff6d8, alpha: 0.55 });

    const hub = new Graphics();
    hub.eventMode = "none";
    hub.circle(CX, CY, R.dimOuter).stroke({ width: 2.2, color: 0xe7c98a });
    hub.circle(CX, CY, R.dimInner).fill({ color: 0x120e0a }).stroke({ width: 1.4, color: 0xd4a853 });

    const dims = new Container();
    dims.eventMode = "none";
    LIFE_DIMENSIONS.forEach((dimension, index) => {
      const angle = segmentAngles(index, LIFE_DIMENSIONS.length).mid;
      const pos = labelPosition(CX, CY, (R.dimOuter + R.dimInner) / 2, angle);
      let rotation = angle + Math.PI / 2;
      let deg = ((rotation * 180) / Math.PI) % 360;
      if (deg < 0) deg += 360;
      if (deg > 90 && deg < 270) rotation += Math.PI;
      const node = makeText(dimension, 12, 0xf3e2b3);
      node.position.set(pos.x, pos.y);
      node.rotation = rotation;
      dims.addChild(node);
    });
    const infinity = makeText("∞", 72, 0xf3e2b3, "600");
    infinity.position.set(CX, CY + 2);
    infinity.style.fontFamily = "Palatino, 'Times New Roman', serif";

    const bezel = new Graphics();
    bezel.eventMode = "none";
    bezel.circle(CX, CY, R.bezelOuter + 8).stroke({ width: 10, color: 0xd4a853, alpha: 0.18 });
    bezel.circle(CX, CY, R.bezelOuter).stroke({ width: 11, color: 0xd4a853 });
    bezel.circle(CX, CY, (R.bezelOuter + R.bezelInner) / 2).stroke({
      width: 1.2,
      color: 0xfff6d8,
      alpha: 0.45,
    });

    this.addStartMark(stage);

    for (const node of [this.sheen, this.orbitGlow, this.shockG]) {
      node.eventMode = "none";
    }

    stage.addChild(
      bg,
      this.starG,
      wash,
      outer,
      seam,
      inner,
      hub,
      dims,
      infinity,
      bezel,
      this.sheen,
      this.orbitGlow,
      this.tokenLayer,
      this.shockG
    );
  }

  private addStartMark(stage: Container) {
    const edge = segmentAngles(0, OUTER_TRACK.length).start + 0.12;
    const pos = labelPosition(CX, CY, R.bezelOuter + 18, edge);
    const label = makeText("START", 11, 0xf3e2b3, "700");
    label.position.set(pos.x, pos.y);
    stage.addChild(label);
  }

  private drawTrack(
    layer: Container,
    tiles: BoardTile[],
    rInner: number,
    rOuter: number,
    track: TrackName
  ) {
    tiles.forEach((tile) => {
      const { start, end, mid } = segmentAngles(tile.index, tiles.length);
      const shape = new Graphics();
      traceSector(shape, rInner, rOuter, start, end);
      const warm = track === "inner";
      const fill = warm
        ? tile.index % 2
          ? 0x1a150f
          : 0x120e0a
        : tile.index % 2
          ? 0x12161e
          : 0x0a0c11;
      shape.fill({ color: fill });
      shape.stroke({ width: 0.9, color: warm ? 0xe7c98a : 0xb8903e, alpha: 0.9 });
      shape.eventMode = "static";
      shape.cursor = "pointer";
      shape.on("pointerover", () => {
        this.pinned = false;
        this.hover(tile);
      });
      shape.on("pointerout", () => {
        if (!this.pinned && this.hovered === tile) this.hover(null);
      });
      shape.on("pointertap", () => {
        if (this.pinned && this.hovered === tile) {
          this.pinned = false;
          this.hover(null);
          return;
        }
        this.pinned = true;
        this.hover(tile);
      });
      layer.addChild(shape);

      const glyph = drawGlyph(tile.type);
      const icon = labelPosition(CX, CY, rOuter - (track === "outer" ? 18 : 15), mid);
      glyph.position.set(icon.x, icon.y);
      glyph.rotation = mid + Math.PI / 2;
      layer.addChild(glyph);

      addRadialLabel(
        layer,
        tile.label,
        mid,
        rInner + (track === "outer" ? 18 : 16),
        rOuter - (track === "outer" ? 34 : 28),
        track === "outer" ? 13 : 12
      );
    });
  }

  private hover(tile: BoardTile | null) {
    if (this.hovered === tile) return;
    this.hovered = tile;
    this.onHover?.(tile);
  }

  private syncOrbit(next: LifeCircle | undefined, now: number) {
    const orbit = next ?? "牛马";
    if (!this.orbitReady) {
      this.orbitReady = true;
      this.orbit = orbit;
      return;
    }
    if (ORBIT_RANK[orbit] > ORBIT_RANK[this.orbit] && !this.reduced) {
      this.shock = { started: now };
    }
    this.orbit = orbit;
  }

  private syncTokens(tokens: WheelToken[], now: number) {
    const seen = new Set<string>();
    for (const token of tokens) {
      seen.add(token.id);
      this.tokenState.set(token.id, token);
      const next = { track: token.track, index: token.index };
      const previous = this.target.get(token.id);
      this.target.set(token.id, next);
      if (!previous) {
        this.settled.set(token.id, next);
        this.motions.delete(token.id);
        continue;
      }
      if (previous.track === next.track && previous.index === next.index) continue;
      const from = this.visualPoint(token.id, now);
      if (this.reduced || (from.track === next.track && from.index === next.index)) {
        this.settled.set(token.id, next);
        this.motions.delete(token.id);
        continue;
      }
      const steps = motionSteps(from, next);
      if (steps.length === 0) {
        this.settled.set(token.id, next);
        this.motions.delete(token.id);
        continue;
      }
      this.settled.set(token.id, from);
      this.motions.set(token.id, { steps, started: now, dur: motionDuration(steps) });
    }
    for (const id of [...this.target.keys()]) {
      if (seen.has(id)) continue;
      this.target.delete(id);
      this.settled.delete(id);
      this.tokenState.delete(id);
      this.motions.delete(id);
      this.views.get(id)?.root.destroy({ children: true });
      this.views.delete(id);
    }
  }

  private visualPoint(id: string, now: number): RingPoint {
    const motion = this.motions.get(id);
    const settled = this.settled.get(id);
    if (!motion) return settled ?? this.target.get(id) ?? { track: "outer", index: 0 };
    const sample = sampleMotion(motion.steps, (now - motion.started) / Math.max(1, motion.dur));
    if (!sample) return settled ?? { track: "outer", index: 0 };
    return { track: sample.track, index: sample.index };
  }

  private frame(now: number) {
    this.drawStars(now);
    this.drawSheen(now);
    this.drawOrbit(now);
    this.advanceMotions(now);
    this.drawTokens(now);
    this.drawShock(now);
  }

  private drawStars(now: number) {
    this.starG.clear();
    const sky = R.bezelOuter + 8;
    for (const star of this.stars) {
      if (Math.hypot(star.x - CX, star.y - CY) > sky) continue;
      const wave = this.reduced ? 1 : 0.55 + 0.45 * Math.sin(now * 0.0015 + star.phase);
      this.starG.circle(star.x, star.y, star.r).fill({
        color: star.gold ? 0xf3e2b3 : 0xffffff,
        alpha: star.opacity * wave,
      });
    }
  }

  private drawSheen(now: number) {
    this.sheen.clear();
    if (this.reduced) return;
    const angle = now * 0.00032;
    const radius = (R.bezelOuter + R.bezelInner) / 2;
    this.sheen.arc(CX, CY, radius, angle, angle + 0.85).stroke({
      width: 5,
      color: 0xfff6d8,
      alpha: 0.55,
      cap: "round",
    });
  }

  private drawOrbit(now: number) {
    this.orbitGlow.clear();
    const pulse = this.reduced ? 0.2 : 0.16 + 0.1 * Math.sin(now / 520);
    if (this.orbit === "牛马") {
      this.orbitGlow.circle(CX, CY, ringMid("outer")).stroke({
        width: 10,
        color: 0xd4a853,
        alpha: pulse * 0.45,
      });
      return;
    }
    this.orbitGlow.circle(CX, CY, this.orbit === "核心" ? 118 : ringMid("inner")).stroke({
      width: this.orbit === "核心" ? 7 : 5,
      color: 0xfff6d8,
      alpha: 0.28 + pulse,
    });
  }

  private advanceMotions(now: number) {
    const done: string[] = [];
    for (const [id, motion] of this.motions) {
      const progress = Math.min(1, (now - motion.started) / Math.max(1, motion.dur));
      if (progress >= 1) {
        const last = motion.steps[motion.steps.length - 1];
        if (last) this.settled.set(id, { track: last.toTrack, index: last.toIndex });
        done.push(id);
      }
    }
    for (const id of done) this.motions.delete(id);
  }

  private drawTokens(now: number) {
    const spots = new Map<string, { id: string; x: number; y: number; moving: boolean }>();
    for (const [id, token] of this.tokenState) {
      const motion = this.motions.get(id);
      let pose = restPose(token.track, token.index);
      let moving = false;
      if (motion) {
        const sample = sampleMotion(
          motion.steps,
          Math.min(1, (now - motion.started) / Math.max(1, motion.dur))
        );
        if (sample) {
          pose = poseFromSample(sample);
          moving = true;
        }
      } else {
        const settled = this.settled.get(id);
        if (settled) pose = restPose(settled.track, settled.index);
      }
      spots.set(id, { id, x: pose.x, y: pose.y, moving });
    }

    const groups = new Map<string, string[]>();
    for (const spot of spots.values()) {
      if (spot.moving) continue;
      const point = this.settled.get(spot.id);
      if (!point) continue;
      const key = `${point.track}:${point.index}`;
      const list = groups.get(key) ?? [];
      list.push(spot.id);
      groups.set(key, list);
    }

    for (const [id, token] of this.tokenState) {
      const spot = spots.get(id);
      if (!spot) continue;
      const view = this.ensureToken(token);
      const point = this.settled.get(id);
      const fellows = point && !spot.moving ? (groups.get(`${point.track}:${point.index}`) ?? [id]) : [id];
      const slot = fellows.indexOf(id);
      const shifted = offsetMarker(spot.x, spot.y, slot < 0 ? 0 : slot, fellows.length);
      view.root.position.set(shifted.x, shifted.y);
      this.paintToken(view, token, now, spot.moving);
    }
  }

  private ensureToken(token: WheelToken) {
    const existing = this.views.get(token.id);
    if (existing) return existing;
    const root = new Container();
    root.eventMode = "none";
    const ring = new Graphics();
    const body = new Graphics();
    const initial = makeText(token.label.charAt(0) || "我", 13, 0x1a1408, "700");
    const badge = new Graphics();
    const dice = makeText("", 12, 0x1a1408, "800");
    dice.position.set(16, -15);
    root.addChild(ring, body, initial, badge, dice);
    this.tokenLayer.addChild(root);
    const view = { root, ring, body, initial, badge, dice };
    this.views.set(token.id, view);
    return view;
  }

  private paintToken(view: TokenView, token: WheelToken, now: number, moving: boolean) {
    const color = cssHex(token.color);
    const initial = token.label.charAt(0) || "我";
    if (view.initial.text !== initial) view.initial.text = initial;
    const showRing = token.active !== false || token.glow;
    view.ring.clear();
    if (showRing) {
      const pulse = this.reduced ? 1 : 1 + 0.08 * Math.sin(now * 0.006 + token.index);
      view.ring.circle(0, 0, 22 * pulse).stroke({
        width: token.glow ? 2.6 : 1.7,
        color: token.glow ? 0xfff6d8 : color,
        alpha: this.reduced ? 0.9 : 0.45 + 0.4 * Math.sin(now * 0.005),
      });
    }
    view.body.clear();
    view.body.circle(0, 0, 16).fill({ color: 0x0c0a08 }).stroke({ width: 3, color });
    view.body.circle(0, 0, 11).fill({ color });

    const dice = !moving && token.dice != null ? String(token.dice) : "";
    view.badge.clear();
    if (dice) {
      view.badge.roundRect(4, -26, 24, 18, 6).fill({ color: 0xf3e2b3 });
      if (view.dice.text !== dice) view.dice.text = dice;
      view.dice.visible = true;
    } else {
      view.dice.visible = false;
    }
  }

  private drawShock(now: number) {
    this.shockG.clear();
    if (!this.shock) return;
    const t = (now - this.shock.started) / 1100;
    if (t >= 1) {
      this.shock = null;
      return;
    }
    const radius = 70 + t * 290;
    this.shockG.circle(CX, CY, radius).stroke({ width: 3, color: 0xf3e2b3, alpha: 1 - t });
    this.shockG.circle(CX, CY, radius * 0.72).stroke({
      width: 1.4,
      color: 0xfff6d8,
      alpha: (1 - t) * 0.7,
    });
  }
}

function offsetMarker(x: number, y: number, slot: number, count: number) {
  if (count <= 1) return { x, y };
  const dx = x - CX;
  const dy = y - CY;
  const len = Math.hypot(dx, dy) || 1;
  const shift = (slot - (count - 1) / 2) * 22;
  return {
    x: x + (-dy / len) * shift,
    y: y + (dx / len) * shift,
  };
}

export async function mountDualRing(
  host: HTMLElement,
  initial: WheelSceneState
): Promise<WheelHandle> {
  const app = new Application();
  await app.init({
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
    preference: "webgl",
  });
  const canvas = app.canvas;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "人生跃迁游戏轮盘");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  host.replaceChildren(canvas);
  const scene = new DualRingScene(app, initial.onHover);
  scene.sync(initial);
  return {
    sync: (state) => scene.sync(state),
    destroy: () => scene.destroy(),
  };
}
