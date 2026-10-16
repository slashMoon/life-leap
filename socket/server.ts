import { createServer } from "http";
import { Server } from "socket.io";
import { advanceOnTrack } from "@/lib/game-engine/board";
import { rollDice } from "@/lib/game-engine/dice";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket";

const PORT = Number(process.env.SOCKET_PORT ?? 3001);

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: [
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "http://localhost:3002",
    ],
    methods: ["GET", "POST"],
  },
});

const roomSessions = new Map<
  string,
  {
    currentPlayerOrder: number;
    positions: Record<string, { track: "outer" | "inner"; index: number }>;
  }
>();

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.on("room:join", ({ roomId, userId }) => {
    socket.join(roomId);
    if (!roomSessions.has(roomId)) {
      roomSessions.set(roomId, {
        currentPlayerOrder: 0,
        positions: { [userId]: { track: "outer", index: 0 } },
      });
    } else {
      const session = roomSessions.get(roomId)!;
      if (!session.positions[userId]) {
        session.positions[userId] = { track: "outer", index: 0 };
      }
    }
    socket.to(roomId).emit("room:player-joined", { userId });
  });

  socket.on("game:roll-dice", ({ roomId, userId }) => {
    const session = roomSessions.get(roomId);
    if (!session) {
      socket.emit("error", { code: "ROOM_NOT_FOUND", message: "房间不存在" });
      return;
    }

    const value = rollDice();
    io.to(roomId).emit("game:dice-rolled", {
      playerId: userId,
      value,
      timestamp: Date.now(),
    });

    const pos = session.positions[userId] ?? {
      track: "outer" as const,
      index: 0,
    };
    const { index, tile } = advanceOnTrack(pos.track, pos.index, value);
    session.positions[userId] = { track: pos.track, index };

    if (tile) {
      io.to(roomId).emit("game:tile-landed", {
        userId,
        track: pos.track,
        index,
        tileType: tile.type,
        tileLabel: tile.label,
      });
    }
  });

  socket.on("chat:message", ({ roomId, userId, content }) => {
    io.to(roomId).emit("chat:message", {
      userId,
      nickname: userId,
      content,
      at: Date.now(),
    });
  });

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] Life Leap realtime server on :${PORT}`);
});
