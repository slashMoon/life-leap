import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { circleCueKey, detectCircleCues } from "./detect-transition";

describe("跃迁演出去重", () => {
  it("第一帧快照只建立基线，不演出", () => {
    const seen = new Set<string>();
    const first = detectCircleCues(null, [{ userId: "星尘", round: 3, circle: "老板" }], seen);
    assert.equal(first.cues.length, 0);
    assert.equal(first.next.星尘, "老板");
  });

  it("圈层上升时给出一次演出，重复快照不再给", () => {
    const seen = new Set<string>();
    const baseline = { 星尘: "牛马" as const };
    const changed = detectCircleCues(
      baseline,
      [{ userId: "星尘", round: 4, circle: "老板" }],
      seen
    );
    assert.equal(changed.cues.length, 1);
    assert.equal(changed.cues[0].key, circleCueKey("星尘", 4));
    seen.add(changed.cues[0].key);
    const replay = detectCircleCues(
      changed.next,
      [{ userId: "星尘", round: 4, circle: "老板" }],
      seen
    );
    assert.equal(replay.cues.length, 0);
  });

  it("同一回合的重连回放被 key 拦住", () => {
    const seen = new Set([circleCueKey("星尘", 4)]);
    const replay = detectCircleCues(
      { 星尘: "牛马" },
      [{ userId: "星尘", round: 4, circle: "老板" }],
      seen
    );
    assert.equal(replay.cues.length, 0);
  });

  it("新回合可以再演一次，降圈和中途加入不演", () => {
    const seen = new Set<string>();
    const again = detectCircleCues(
      { 星尘: "老板", 旅人: "牛马" },
      [
        { userId: "星尘", round: 8, circle: "核心" },
        { userId: "旅人", round: 2, circle: "牛马" },
        { userId: "新人", round: 2, circle: "老板" },
      ],
      seen
    );
    assert.deepEqual(
      again.cues.map((cue) => cue.userId),
      ["星尘"]
    );
    const down = detectCircleCues({ 星尘: "核心" }, [{ userId: "星尘", round: 9, circle: "老板" }], seen);
    assert.equal(down.cues.length, 0);
  });
});
