import assert from "node:assert/strict";
import { after, test } from "node:test";
import { io as ioClient, type Socket } from "socket.io-client";
import { ensureSessionBackend, resetSessions } from "@/lib/game-session/store";
import type { GameSnapshot } from "@/lib/game-session/types";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket";
import { startGameServer } from "./game-server";

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

after(() => {
  resetSessions();
});
