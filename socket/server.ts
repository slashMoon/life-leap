import { startGameServer } from "./game-server";

const PORT = Number(process.env.SOCKET_PORT ?? 3001);

startGameServer(PORT)
  .then(({ port }) => {
    const host = process.env.SOCKET_HOST?.trim() || "0.0.0.0";
    console.log(`[socket] Life Leap realtime server on ${host}:${port}`);
  })
  .catch((error: unknown) => {
    console.error("[socket] failed to start", error);
    process.exit(1);
  });
