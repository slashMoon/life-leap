import assert from "node:assert/strict";
import { after, test } from "node:test";
import { io as ioClient, type Socket } from "socket.io-client";
import { ensureSessionBackend, resetSessions } from "@/lib/game-session/store";
import { clearRoomTiming, setRoomTiming } from "@/lib/game-session/timing";
import type { GameSnapshot } from "@/lib/game-session/types";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket";
import { resolveSocketCorsOrigins, startGameServer } from "./game-server";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

function waitFor(predicate: () => boolean, label: string, ms = 8000) {
  const started = Date.now();
  return new Promise<void>((resolve, reject) => {
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - started > ms) {
        reject(new Error(`timeout: ${label}`));
        return;
      }
      setTimeout(tick, 20);
    };
    tick();
  });
}

function once<T>(socket: Client, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout waiting for ${event}`));
    }, 5000);
    const listener = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event as "error", listener as (payload: { code: string; message: string }) => void);
  });
}

function seat(snap: GameSnapshot, userId: string) {
  const found = snap.seats.find((item) => item.userId === userId);
  assert.ok(found, `missing seat ${userId}`);
  return found;
}

function fingerprint(snap: GameSnapshot) {
  return {
    currentUserId: snap.currentUserId,
    turnOrder: snap.turnOrder,
    lastActorUserId: snap.lastActorUserId,
    chat: snap.chat.map((line) => ({
      userId: line.userId,
      nickname: line.nickname,
      content: line.content,
    })),
    seats: snap.seats
      .map((item) => ({
        userId: item.userId,
        role: item.role,
        cash: item.state.cash,
        boardIndex: item.state.boardIndex,
        track: item.state.track,
        circle: item.state.circle,
        round: item.state.round,
        holdings: item.state.holdings,
        liabilities: item.state.cashFlow.totalLiabilities,
        netWorth: item.state.cashFlow.netWorth,
        pending: item.state.pendingDecision,
        log: item.state.eventLog,
        lastDice: item.state.lastDice,
      }))
      .sort((a, b) => a.userId.localeCompare(b.userId)),
  };
}

test("two sockets share one authoritative game", async () => {
  resetSessions();
  const backend = await ensureSessionBackend();
  if (!process.env.REDIS_URL) {
    assert.equal(backend, "memory");
  }

  const server = await startGameServer(0);
  const url = `http://127.0.0.1:${server.port}`;
  const roomId = `dual-${Date.now()}`;
  const aliceStates: GameSnapshot[] = [];
  const bobStates: GameSnapshot[] = [];
  const dice: Array<{ playerId: string; value: number }> = [];

  const alice = ioClient(url, { reconnection: false }) as Client;
  const bob = ioClient(url, { reconnection: false }) as Client;
  alice.on("game:state", (state) => aliceStates.push(state));
  bob.on("game:state", (state) => bobStates.push(state));
  bob.on("game:dice-rolled", (result) => dice.push(result));

  try {
    const connected = (socket: Client) =>
      socket.connected ? Promise.resolve() : once(socket, "connect");
    await Promise.all([connected(alice), connected(bob)]);

    const bobPresent = once<{ userId: string }>(bob, "room:player-joined");
    bob.emit("room:join", {
      roomId,
      userId: "bob",
      nickname: "Bob",
      playing: false,
    });
    assert.equal((await bobPresent).userId, "bob");

    const alicePresent = once<{ userId: string }>(bob, "room:player-joined");
    alice.emit("room:join", {
      roomId,
      userId: "alice",
      nickname: "Alice",
      playing: false,
    });
    assert.equal((await alicePresent).userId, "alice");
    assert.equal(aliceStates.length, 0);
    assert.equal(bobStates.length, 0);

    alice.emit("room:join", {
      roomId,
      userId: "alice",
      nickname: "Alice",
      playing: true,
      role: "player",
      order: 0,
      identityId: "doctor",
    });
    await waitFor(
      () => aliceStates.some((state) => state.currentUserId === "alice"),
      "alice seated"
    );

    bob.emit("room:join", {
      roomId,
      userId: "bob",
      nickname: "Bob",
      playing: true,
      role: "player",
      order: 1,
      identityId: "security_guard",
    });
    await waitFor(
      () => bobStates.some((state) => state.seats.length === 2),
      "bob seated"
    );

    const seated = bobStates.at(-1)!;
    assert.deepEqual(seated.turnOrder, ["alice", "bob"]);
    assert.equal(seated.currentUserId, "alice");
    assert.equal(seat(seated, "alice").state.cash, 3870);

    const rejectedRoll = once<{ code: string }>(bob, "error");
    bob.emit("game:roll-dice", { roomId, userId: "bob" });
    assert.equal((await rejectedRoll).code, "NOT_YOUR_TURN");

    const rejectedRepay = once<{ code: string }>(bob, "error");
    bob.emit("game:repay", { roomId, userId: "bob", amount: 1000 });
    assert.equal((await rejectedRepay).code, "NOT_YOUR_TURN");
    assert.equal(dice.length, 0);
    assert.equal(seat(aliceStates.at(-1)!, "alice").state.cash, 3870);

    const beforeRepay = aliceStates.at(-1)!.revision;
    alice.emit("game:repay", { roomId, userId: "alice", amount: 1000 });
    await waitFor(
      () =>
        aliceStates.some(
          (state) =>
            state.revision > beforeRepay &&
            seat(state, "alice").state.cash === 2870
        ),
      "alice repay"
    );
    assert.equal(aliceStates.at(-1)!.currentUserId, "alice");

    const play = async (socket: Client, states: GameSnapshot[], userId: string) => {
      const before = states.at(-1)!;
      assert.equal(before.currentUserId, userId);
      const diceBefore = dice.length;
      socket.emit("game:roll-dice", { roomId, userId });
      await waitFor(() => {
        const last = states.at(-1);
        return (
          !!last &&
          last.revision > before.revision &&
          last.lastActorUserId === userId
        );
      }, `${userId} roll`);
      assert.equal(dice.length, diceBefore + 1);
      const rolled = states.at(-1)!;
      if (seat(rolled, userId).state.pendingDecision) {
        const rev = rolled.revision;
        socket.emit("game:decide", { roomId, userId, accept: false });
        await waitFor(
          () => {
            const last = states.at(-1);
            return !!last && last.revision > rev && last.currentUserId !== userId;
          },
          `${userId} decline`
        );
      } else {
        assert.notEqual(states.at(-1)!.currentUserId, userId);
      }
    };

    await play(alice, aliceStates, "alice");
    assert.equal(aliceStates.at(-1)!.currentUserId, "bob");
    await play(bob, bobStates, "bob");
    assert.equal(bobStates.at(-1)!.currentUserId, "alice");

    const aliceMoved = seat(aliceStates.at(-1)!, "alice").state.boardIndex;
    const bobMoved = seat(bobStates.at(-1)!, "bob").state.boardIndex;
    assert.ok(aliceMoved > 0 && aliceMoved <= 6);
    assert.ok(bobMoved > 0 && bobMoved <= 6);

    assert.equal(bobStates.at(-1)!.currentUserId, "alice");
    const diceBeforeSteal = dice.length;
    const bobBlocked = once<{ code: string }>(bob, "error");
    bob.emit("game:roll-dice", { roomId, userId: "bob" });
    assert.equal((await bobBlocked).code, "NOT_YOUR_TURN");
    assert.equal(dice.length, diceBeforeSteal);

    const chat = once<{ content: string; nickname: string }>(bob, "chat:message");
    alice.emit("chat:message", {
      roomId,
      userId: "alice",
      nickname: "Alice",
      content: "你好，轮到我了",
    });
    const heard = await chat;
    assert.equal(heard.content, "你好，轮到我了");
    assert.equal(heard.nickname, "Alice");
    await waitFor(
      () => aliceStates.at(-1)?.chat.some((line) => line.content === "你好，轮到我了") === true,
      "chat stored"
    );

    const before = fingerprint(aliceStates.at(-1)!);
    alice.disconnect();
    const aliceAgain = ioClient(url, { reconnection: false }) as Client;
    const replay: GameSnapshot[] = [];
    aliceAgain.on("game:state", (state) => replay.push(state));
    await once(aliceAgain, "connect");
    aliceAgain.emit("room:join", {
      roomId,
      userId: "alice",
      nickname: "Alice",
      playing: true,
      role: "player",
      order: 0,
      identityId: "doctor",
    });
    await waitFor(() => replay.length > 0, "reconnect replay");
    const restored = fingerprint(replay.at(-1)!);
    assert.deepEqual(restored, before);

    console.log(
      JSON.stringify({
        backend,
        roomId,
        turnOrder: restored.turnOrder,
        currentUserId: restored.currentUserId,
        diceRolls: dice,
        alice: restored.seats.find((item) => item.userId === "alice"),
        bob: restored.seats.find((item) => item.userId === "bob"),
        chat: restored.chat,
        reconnectMatched: true,
      })
    );

    aliceAgain.disconnect();
  } finally {
    alice.disconnect();
    bob.disconnect();
    await server.close();
  }
});

test("bot rolls on its own turn and returns the dice to the human", async () => {
  resetSessions();
  const server = await startGameServer(0);
  const url = `http://127.0.0.1:${server.port}`;
  const roomId = `bot-${Date.now()}`;
  setRoomTiming(roomId, { botDelayMs: 40, disconnectMs: 30_000 });
  const states: GameSnapshot[] = [];
  const dice: Array<{ playerId: string; value: number; reason?: string }> = [];
  const alice = ioClient(url, { reconnection: false }) as Client;
  alice.on("game:state", (state) => states.push(state));
  alice.on("game:dice-rolled", (result) => dice.push(result));

  try {
    if (!alice.connected) await once(alice, "connect");
    alice.emit("room:join", {
      roomId,
      userId: "alice",
      nickname: "星尘",
      playing: true,
      role: "player",
      order: 0,
      identityId: "doctor",
      companions: [
        {
          userId: "practice_bot",
          nickname: "旅人",
          order: 1,
          identityId: "security_guard",
        },
      ],
    });
    await waitFor(
      () => states.some((state) => state.turnOrder.length === 2),
      "bot seated"
    );
    const seated = states.at(-1)!;
    assert.deepEqual(seated.turnOrder, ["alice", "practice_bot"]);
    assert.equal(seated.currentUserId, "alice");
    assert.equal(seat(seated, "practice_bot").bot, true);

    const before = states.at(-1)!;
    alice.emit("game:roll-dice", { roomId, userId: "alice" });
    await waitFor(() => {
      const last = states.at(-1);
      return !!last && last.revision > before.revision && last.lastActorUserId === "alice";
    }, "alice roll");
    const cursor = states.at(-1)!;
    if (seat(cursor, "alice").state.pendingDecision) {
      const rev = cursor.revision;
      alice.emit("game:decide", { roomId, userId: "alice", accept: false });
      await waitFor(
        () => states.some((state) => state.revision > rev && state.currentUserId === "practice_bot"),
        "hand off to bot"
      );
    }
    assert.ok(states.some((state) => state.currentUserId === "practice_bot"));

    await waitFor(() => {
      const last = states.at(-1);
      if (!last || last.currentUserId !== "alice") return false;
      const bot = seat(last, "practice_bot");
      return bot.state.lastDice != null && bot.state.boardIndex > 0 && !bot.state.pendingDecision;
    }, "bot finished");

    const done = states.at(-1)!;
    const bot = seat(done, "practice_bot");
    assert.equal(done.currentUserId, "alice");
    assert.ok((bot.state.lastDice ?? 0) >= 1);
    assert.ok(bot.state.boardIndex > 0 && bot.state.boardIndex < 24);
    assert.equal(bot.state.pendingDecision, null);
    assert.ok(dice.some((roll) => roll.playerId === "practice_bot" && roll.reason === "bot"));
    assert.ok(states.filter((state) => state.currentUserId === "alice").length >= 2);
  } finally {
    clearRoomTiming(roomId);
    alice.disconnect();
    await server.close();
  }
});

test("a disconnected human is rolled after the timeout", async () => {
  resetSessions();
  const server = await startGameServer(0);
  const url = `http://127.0.0.1:${server.port}`;
  const roomId = `away-${Date.now()}`;
  setRoomTiming(roomId, { botDelayMs: 40, disconnectMs: 120 });
  const states: GameSnapshot[] = [];
  const dice: Array<{ playerId: string; reason?: string }> = [];
  const alice = ioClient(url, { reconnection: false }) as Client;
  const bob = ioClient(url, { reconnection: false }) as Client;
  alice.on("game:state", (state) => states.push(state));
  alice.on("game:dice-rolled", (result) => dice.push(result));

  try {
    await Promise.all([
      alice.connected ? Promise.resolve() : once(alice, "connect"),
      bob.connected ? Promise.resolve() : once(bob, "connect"),
    ]);
    alice.emit("room:join", {
      roomId,
      userId: "alice",
      nickname: "Alice",
      playing: true,
      role: "player",
      order: 0,
      identityId: "doctor",
    });
    bob.emit("room:join", {
      roomId,
      userId: "bob",
      nickname: "Bob",
      playing: true,
      role: "player",
      order: 1,
      identityId: "security_guard",
    });
    await waitFor(() => states.some((state) => state.seats.length === 2), "both seated");

    const before = states.at(-1)!;
    alice.emit("game:roll-dice", { roomId, userId: "alice" });
    await waitFor(() => {
      const last = states.at(-1);
      return !!last && last.revision > before.revision && last.lastActorUserId === "alice";
    }, "alice roll");
    if (seat(states.at(-1)!, "alice").state.pendingDecision) {
      const rev = states.at(-1)!.revision;
      alice.emit("game:decide", { roomId, userId: "alice", accept: false });
      await waitFor(
        () => states.some((state) => state.revision > rev && state.currentUserId === "bob"),
        "bob's turn"
      );
    }
    assert.equal(states.at(-1)!.currentUserId, "bob");

    bob.disconnect();
    await waitFor(
      () => states.some((state) => state.currentUserId === "bob" && state.turnDeadlineAt != null),
      "countdown"
    );
    await waitFor(() => {
      const last = states.at(-1);
      if (!last || last.currentUserId !== "alice") return false;
      const away = seat(last, "bob");
      return away.state.lastDice != null && away.state.boardIndex > 0 && !away.state.pendingDecision;
    }, "timeout roll");

    const done = seat(states.at(-1)!, "bob");
    assert.ok(done.state.eventLog.some((line) => line.includes("等待超时")));
    assert.ok(dice.some((roll) => roll.playerId === "bob" && roll.reason === "timeout"));
    assert.equal(states.at(-1)!.currentUserId, "alice");
  } finally {
    clearRoomTiming(roomId);
    alice.disconnect();
    bob.disconnect();
    await server.close();
  }
});

test("solo mode stays on the session when the human reconnects", async () => {
  resetSessions();
  const server = await startGameServer(0);
  const url = `http://127.0.0.1:${server.port}`;
  const roomId = `solo-mode-${Date.now()}`;
  const states: GameSnapshot[] = [];
  const alice = ioClient(url, { reconnection: false }) as Client;
  alice.on("game:state", (state) => states.push(state));

  try {
    if (!alice.connected) await once(alice, "connect");
    alice.emit("room:join", {
      roomId,
      userId: "alice",
      nickname: "星尘",
      playing: true,
      role: "player",
      order: 0,
      identityId: "doctor",
      mode: "solo",
      companions: [
        { userId: "practice_bot", nickname: "旅人", order: 1, identityId: "security_guard" },
        { userId: "practice_bot_2", nickname: "阿宁", order: 2, identityId: "driver" },
      ],
    });
    await waitFor(
      () => states.some((state) => state.mode === "solo" && state.turnOrder.length === 3),
      "solo seated"
    );
    const seated = states.at(-1)!;
    assert.equal(seated.mode, "solo");
    assert.deepEqual(seated.turnOrder, ["alice", "practice_bot", "practice_bot_2"]);
    const before = fingerprint(seated);

    alice.disconnect();
    const again = ioClient(url, { reconnection: false }) as Client;
    const replay: GameSnapshot[] = [];
    again.on("game:state", (state) => replay.push(state));
    await once(again, "connect");
    again.emit("room:join", {
      roomId,
      userId: "alice",
      nickname: "星尘",
      playing: true,
      role: "player",
      order: 0,
      identityId: "doctor",
      mode: "solo",
      companions: [
        { userId: "practice_bot", nickname: "旅人", order: 1, identityId: "security_guard" },
        { userId: "practice_bot_2", nickname: "阿宁", order: 2, identityId: "driver" },
      ],
    });
    await waitFor(() => replay.length > 0, "solo reconnect");
    assert.equal(replay.at(-1)!.mode, "solo");
    assert.deepEqual(fingerprint(replay.at(-1)!), before);
    again.disconnect();
  } finally {
    alice.disconnect();
    await server.close();
  }
});

test("socket cors includes the render demo origin", () => {
  const origins = resolveSocketCorsOrigins({
    RENDER_EXTERNAL_URL: "https://life-leap-demo.onrender.com",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000/",
    SOCKET_CORS_ORIGINS: "https://play.example.com, http://127.0.0.1:3000",
  });
  assert.ok(origins.includes("https://life-leap-demo.onrender.com"));
  assert.ok(origins.includes("https://play.example.com"));
  assert.equal(origins.filter((item) => item === "http://localhost:3000").length, 1);
  assert.ok(origins.includes("http://127.0.0.1:3000"));
});

test("SOCKET_HOST binds the realtime server to that address", async () => {
  const previous = process.env.SOCKET_HOST;
  process.env.SOCKET_HOST = "127.0.0.1";
  const server = await startGameServer(0);
  try {
    const address = server.httpServer.address();
    assert.equal(typeof address === "object" && address && address.address, "127.0.0.1");
  } finally {
    if (previous === undefined) delete process.env.SOCKET_HOST;
    else process.env.SOCKET_HOST = previous;
    await server.close();
  }
});

after(() => {
  clearRoomTiming();
  resetSessions();
});
