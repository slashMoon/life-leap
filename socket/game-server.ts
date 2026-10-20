import { createServer, type Server as HttpServer } from "http";
import { Server } from "socket.io";
import {
  appendChat,
  decideForSeat,
  joinSeat,
  markDisconnected,
  repayForSeat,
  rollForSeat,
  toSnapshot,
} from "@/lib/game-session/engine";
import { mutateSession, readSession } from "@/lib/game-session/store";
import type { SessionCommandResult } from "@/lib/game-session/types";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket";

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

type GameSocket = Parameters<Parameters<GameServer["on"]>[1]>[0];

function broadcast(
  io: GameServer,
  roomId: string,
  result: SessionCommandResult
) {
  if (!result.ok) return;
  io.to(roomId).emit("game:state", result.snapshot);
  if (result.dice) io.to(roomId).emit("game:dice-rolled", result.dice);
  if (result.tile) io.to(roomId).emit("game:tile-landed", result.tile);
  if (result.circle) io.to(roomId).emit("game:circle-changed", result.circle);
  if (result.chat) io.to(roomId).emit("chat:message", result.chat);
}

async function run(
  io: GameServer,
  socket: GameSocket,
  roomId: string,
  action: (session: Parameters<typeof rollForSeat>[0]) => SessionCommandResult
) {
  const result = await mutateSession(roomId, action);
  if (!result.ok) {
    socket.emit("error", {
      code: result.code ?? "REJECTED",
      message: result.message ?? "操作被拒绝",
    });
    return;
  }
  broadcast(io, roomId, result);
}

export function attachGameServer(io: GameServer) {
  io.on("connection", (socket) => {
    socket.on("room:join", (payload) => {
      const roomId = payload?.roomId;
      const userId = payload?.userId;
      if (!roomId || !userId) {
        socket.emit("error", { code: "BAD_JOIN", message: "缺少房间或玩家" });
        return;
      }
      socket.join(roomId);
      const rooms = (socket.data.rooms ??= new Set<string>());
      rooms.add(roomId);
      socket.data.userId = userId;

      if (!payload.playing) {
        io.to(roomId).emit("room:player-joined", {
          userId,
          nickname: payload.nickname,
          playing: false,
        });
        return;
      }

      void mutateSession(roomId, (session) =>
        joinSeat(session, {
          userId,
          nickname: payload.nickname,
          role: payload.role,
          order: payload.order,
          identityId: payload.identityId,
          coreNetWorthThreshold: payload.coreNetWorthThreshold,
          corePassiveIncomeMultiplier: payload.corePassiveIncomeMultiplier,
        })
      )
        .then((result) => {
          broadcast(io, roomId, result);
          if (result.createdSeat) {
            io.to(roomId).emit("room:player-joined", {
              userId,
              nickname: payload.nickname,
              playing: true,
            });
          }
        })
        .catch((error: unknown) => {
          socket.emit("error", {
            code: "INTERNAL",
            message: error instanceof Error ? error.message : "加入对局失败",
          });
        });
    });

    socket.on("room:leave", ({ roomId, userId }) => {
      socket.leave(roomId);
      void mutateSession(roomId, (session) => {
        markDisconnected(session, userId);
        return toSnapshot(session);
      }).catch(() => undefined);
      socket.to(roomId).emit("room:player-left", { userId });
    });

    socket.on("game:roll-dice", ({ roomId, userId }) => {
      void run(io, socket, roomId, (session) => rollForSeat(session, userId));
    });

    socket.on("game:decide", ({ roomId, userId, accept }) => {
      void run(io, socket, roomId, (session) =>
        decideForSeat(session, userId, accept)
      );
    });

    socket.on("game:repay", ({ roomId, userId, amount }) => {
      void run(io, socket, roomId, (session) =>
        repayForSeat(session, userId, amount)
      );
    });

    socket.on("chat:message", ({ roomId, userId, nickname, content }) => {
      void run(io, socket, roomId, (session) =>
        appendChat(session, { userId, nickname, content })
      );
    });

    socket.on("disconnect", () => {
      const userId = socket.data.userId as string | undefined;
      const rooms = socket.data.rooms as Set<string> | undefined;
      if (!userId || !rooms) return;
      for (const roomId of rooms) {
        void readSession(roomId)
          .then((session) => {
            if (!session?.seats.some((seat) => seat.userId === userId)) return;
            return mutateSession(roomId, (current) => {
              markDisconnected(current, userId);
              return current;
            });
          })
          .catch(() => undefined);
      }
    });
  });
}

export function startGameServer(port = 0, corsOrigin?: string | string[]) {
  const httpServer: HttpServer = createServer();
  const origin =
    corsOrigin ??
    [
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3002",
    ];
  const io: GameServer = new Server(httpServer, {
    cors: { origin, methods: ["GET", "POST"] },
  });
  attachGameServer(io);

  return new Promise<{
    io: GameServer;
    httpServer: HttpServer;
    port: number;
    close: () => Promise<void>;
  }>((resolve) => {
    httpServer.listen(port, () => {
      const address = httpServer.address();
      const bound = typeof address === "object" && address ? address.port : port;
      resolve({
        io,
        httpServer,
        port: bound,
        close: () =>
          new Promise((done) => {
            io.close();
            httpServer.close(() => done());
          }),
      });
    });
  });
}
