import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io } from "socket.io-client";
import { createGateway, internalPorts, isSocketIoPath } from "./start-demo.mjs";

function listen(server, host = "127.0.0.1") {
  return new Promise((resolve) => {
    server.listen(0, host, () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
}

test("socket.io paths stay distinct from the web app", () => {
  assert.equal(isSocketIoPath("/socket.io/?EIO=4&transport=polling"), true);
  assert.equal(isSocketIoPath("/socket.io/"), true);
  assert.equal(isSocketIoPath("/lobby"), false);
  assert.equal(isSocketIoPath("/socket.iofoo"), false);
});

test("internal ports do not collide with the public port", () => {
  assert.deepEqual(internalPorts({ PORT: "10000" }), {
    publicPort: 10000,
    socketPort: 3001,
    nextPort: 3010,
  });
  assert.deepEqual(internalPorts({ PORT: "3010", SOCKET_PORT: "3001" }), {
    publicPort: 3010,
    socketPort: 3001,
    nextPort: 3011,
  });
  assert.throws(() => internalPorts({ PORT: "3001", SOCKET_PORT: "3001" }));
});

test("gateway proxies the site, socket.io, and health", async () => {
  const nextServer = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end(`next ${req.url}`);
  });
  const socketHttp = http.createServer();
  const ioServer = new Server(socketHttp, {
    cors: { origin: ["https://life-leap-demo.onrender.com"] },
    pingInterval: 1000,
    pingTimeout: 500,
  });
  ioServer.on("connection", (socket) => {
    socket.on("room:join", (payload) => {
      socket.emit("room:player-joined", {
        userId: payload.userId,
        nickname: payload.nickname,
        playing: false,
      });
    });
  });

  const nextPort = await listen(nextServer);
  const socketPort = await listen(socketHttp);
  const gateway = createGateway({
    port: 0,
    host: "127.0.0.1",
    nextPort,
    socketPort,
  });
  const port = await gateway.listen();
  const base = `http://127.0.0.1:${port}`;
  const clients = [];

  try {
    const page = await fetch(`${base}/lobby`);
    assert.equal(page.status, 200);
    assert.equal(await page.text(), "next /lobby");

    const notSocket = await fetch(`${base}/socket.iofoo`);
    assert.equal(await notSocket.text(), "next /socket.iofoo");

    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    const body = await health.json();
    assert.equal(body.ok, true);
    assert.equal(body.next, true);
    assert.equal(body.socket, true);

    const polling = await fetch(
      `${base}/socket.io/?EIO=4&transport=polling`,
      { headers: { Origin: "https://life-leap-demo.onrender.com" } }
    );
    assert.equal(polling.status, 200);
    assert.equal(
      polling.headers.get("access-control-allow-origin"),
      "https://life-leap-demo.onrender.com"
    );
    assert.match(await polling.text(), /^0\{/);

    const denied = await fetch(`${base}/socket.io/?EIO=4&transport=polling`, {
      headers: { Origin: "https://evil.example" },
    });
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
    await denied.body?.cancel();

    for (const transports of [["polling"], ["websocket"]]) {
      const client = io(base, {
        transports,
        upgrade: false,
        reconnection: false,
        extraHeaders: { Origin: "https://life-leap-demo.onrender.com" },
      });
      clients.push(client);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${transports[0]} connect timeout`)), 5000);
        client.once("connect", () => {
          clearTimeout(timer);
          resolve();
        });
        client.once("connect_error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
      const joined = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${transports[0]} join timeout`)), 4000);
        client.once("room:player-joined", (payload) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });
      client.emit("room:join", {
        roomId: "demo",
        userId: "guest",
        nickname: "游客",
        playing: false,
      });
      const payload = await joined;
      assert.equal(payload.nickname, "游客");
    }
  } finally {
    for (const client of clients) client.disconnect();
    await gateway.close();
    await new Promise((resolve) => ioServer.close(() => resolve()));
    await new Promise((resolve) => socketHttp.close(() => resolve()));
    await new Promise((resolve) => nextServer.close(() => resolve()));
  }
});
