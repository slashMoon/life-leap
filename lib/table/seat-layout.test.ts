import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTableCash, orderAroundSelf, tableAnchors } from "./seat-layout";

const plaque = { w: 160, h: 80 };

describe("牌桌座位", () => {
  it("把自己固定在正下方，下一家在左手边，上一家在右手边", () => {
    const [self, next, opposite, previous] = tableAnchors(4, 1000, 800, plaque);
    assert.ok(Math.abs(self.left - 50) < 1);
    assert.ok(self.top > 70);
    assert.ok(next.left < 40);
    assert.ok(previous.left > 60);
    assert.ok(opposite.top < self.top);
    assert.ok(opposite.top < 30);
  });

  it("两人对坐时对手在对面", () => {
    const [self, other] = tableAnchors(2, 1000, 800, plaque);
    assert.ok(Math.abs(self.left - other.left) < 1);
    assert.ok(other.top < 30);
    assert.ok(self.top > 70);
  });

  it("名牌中心落在桌面内", () => {
    for (const count of [1, 3, 6, 8]) {
      for (const anchor of tableAnchors(count, 1000, 800, plaque)) {
        assert.ok(anchor.left > 4 && anchor.left < 96, `left ${anchor.left}`);
        assert.ok(anchor.top > 2 && anchor.top < 98, `top ${anchor.top}`);
      }
    }
  });

  it("自己不在座位序首位时仍然排到下方那一格", () => {
    const ordered = orderAroundSelf(
      [
        { userId: "a", order: 2 },
        { userId: "me", order: 0 },
        { userId: "b", order: 1 },
      ],
      "me"
    );
    assert.deepEqual(
      ordered.map((seat) => seat.userId),
      ["me", "b", "a"]
    );
  });

  it("找不到自己时保持回合顺序", () => {
    const ordered = orderAroundSelf(
      [
        { userId: "b", order: 1 },
        { userId: "a", order: 0 },
      ],
      "viewer"
    );
    assert.deepEqual(
      ordered.map((seat) => seat.userId),
      ["a", "b"]
    );
  });
});

describe("座位金额", () => {
  it("万元以下保留元，万元以上收成万", () => {
    assert.equal(formatTableCash(3870), "3,870");
    assert.equal(formatTableCash(10000), "1万");
    assert.equal(formatTableCash(15500), "1.6万");
    assert.equal(formatTableCash(-800), "-800");
  });
});
