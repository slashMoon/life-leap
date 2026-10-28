import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  forwardIndexes,
  motionDuration,
  motionSteps,
  poseFromSample,
  restPose,
  sampleMotion,
} from "./token-motion";

describe("棋子步进", () => {
  it("顺时针逐格，经过 0 点也能接上", () => {
    assert.deepEqual(forwardIndexes(0, 3, 24), [1, 2, 3]);
    assert.deepEqual(forwardIndexes(22, 1, 24), [23, 0, 1]);
  });

  it("同圈移动拆成一格一跳", () => {
    const steps = motionSteps({ track: "outer", index: 1 }, { track: "outer", index: 4 });
    assert.deepEqual(
      steps.map((step) => step.toIndex),
      [2, 3, 4]
    );
    assert.ok(steps.every((step) => !step.radial));
    assert.ok(motionDuration(steps) > 0);
  });

  it("换到内圈是一次径向滑入，不绕外圈", () => {
    const steps = motionSteps({ track: "outer", index: 8 }, { track: "inner", index: 0 });
    assert.equal(steps.length, 1);
    assert.equal(steps[0].radial, true);
    assert.equal(steps[0].toTrack, "inner");
    assert.equal(steps[0].toIndex, 0);
  });

  it("步进过半后高亮落到下一格", () => {
    const steps = motionSteps({ track: "outer", index: 0 }, { track: "outer", index: 1 });
    const early = sampleMotion(steps, 0.1);
    const late = sampleMotion(steps, 0.9);
    assert.equal(early?.index, 0);
    assert.equal(late?.index, 1);
    assert.equal(sampleMotion(steps, 1)?.eased, 1);
  });

  it("外圈起点在转盘下方，内圈更靠近圆心", () => {
    const outer = restPose("outer", 0);
    const inner = restPose("inner", 0);
    assert.ok(outer.y > 400);
    assert.ok(Math.abs(outer.x - 400) < 40);
    const outerR = Math.hypot(outer.x - 400, outer.y - 400);
    const innerR = Math.hypot(inner.x - 400, inner.y - 400);
    assert.ok(innerR < outerR);
  });

  it("径向滑入时半径从外圈收到内圈", () => {
    const steps = motionSteps({ track: "outer", index: 4 }, { track: "inner", index: 0 });
    const start = poseFromSample({ ...sampleMotion(steps, 0)!, eased: 0 });
    const end = poseFromSample(sampleMotion(steps, 1)!);
    const startR = Math.hypot(start.x - 400, start.y - 400);
    const endR = Math.hypot(end.x - 400, end.y - 400);
    assert.ok(endR < startR);
  });
});
