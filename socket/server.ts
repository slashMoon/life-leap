import { startGameServer } from "./game-server";

const PORT = Number(process.env.SOCKET_PORT ?? 3001);

startGameServer(PORT).then(({ port }) => {
  console.log(`[socket] Life Leap realtime server on :${port}`);
});
