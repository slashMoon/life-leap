#!/usr/bin/env node
/**
 * 生产 / Render 入口。
 * Render 的 Web Service 只把 PORT 暴露到公网，因此这里监听 0.0.0.0:$PORT，
 * 把 /socket.io 转到容器内的 Socket.IO，其余请求转到 next start。
 * Mock 对局留在 Socket 进程内存里，不要求 Redis 或 MySQL。
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

export function isSocketIoPath(url = "") {
  const pathname = url.split("?")[0] || "/";
  return pathname === "/socket.io" || pathname.startsWith("/socket.io/");
}

export function internalPorts(env = process.env) {
  const publicPort = Number(env.PORT || 3000);
  const socketPort = Number(env.SOCKET_PORT || 3001);
  let nextPort = Number(env.NEXT_INTERNAL_PORT || 3010);
  if (!Number.isInteger(publicPort) || publicPort <= 0 || publicPort > 65535) {
    throw new Error("PORT 必须是 1 到 65535 的整数");
  }
  if (!Number.isInteger(socketPort) || socketPort <= 0 || socketPort > 65535) {
    throw new Error("SOCKET_PORT 必须是 1 到 65535 的整数");
  }
  if (!Number.isInteger(nextPort) || nextPort <= 0 || nextPort > 65535) {
    nextPort = 3010;
  }
  if (socketPort === publicPort) {
    throw new Error("SOCKET_PORT 不能与公网 PORT 相同");
  }
  if (nextPort === publicPort || nextPort === socketPort) {
    nextPort =
      [3010, 3011, 3020, 3021].find(
        (port) => port !== publicPort && port !== socketPort
      ) ?? nextPort + 1;
  }
  return { publicPort, socketPort, nextPort };
}

function probe(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const finish = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(800);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function copyHeaders(source, { stripHop = true } = {}) {
  const headers = {};
  for (const [key, value] of Object.entries(source)) {
    if (value == null) continue;
    if (stripHop && HOP_BY_HOP.has(key)) continue;
    headers[key] = value;
  }
  return headers;
}

function proxyRequest(req, res, port) {
  const headers = copyHeaders(req.headers);
  const forwarded = req.headers["x-forwarded-for"];
  const remote = req.socket.remoteAddress || "";
  headers["x-forwarded-for"] = forwarded ? `${forwarded}, ${remote}` : remote;
  if (!headers["x-forwarded-proto"]) headers["x-forwarded-proto"] = "http";
  if (req.headers.host) headers["x-forwarded-host"] = req.headers.host;

  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port,
      method: req.method,
      path: req.url,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, copyHeaders(upstreamRes.headers));
      upstreamRes.pipe(res);
    }
  );
  upstream.on("error", () => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end("上游服务暂时不可用");
  });
  req.on("aborted", () => upstream.destroy());
  req.pipe(upstream);
}

function proxyUpgrade(req, clientSocket, head, port) {
  const upstream = net.connect(port, "127.0.0.1");
  const fail = () => {
    clientSocket.destroy();
    upstream.destroy();
  };
  upstream.on("error", fail);
  clientSocket.on("error", () => upstream.destroy());
  upstream.once("connect", () => {
    const lines = [`${req.method || "GET"} ${req.url} HTTP/${req.httpVersion || "1.1"}`];
    for (const [key, value] of Object.entries(req.headers)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const item of value) lines.push(`${key}: ${item}`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head?.length) upstream.write(head);
    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });
}

export function createGateway({ port, host = "0.0.0.0", nextPort, socketPort }) {
  const server = http.createServer((req, res) => {
    const pathname = (req.url || "/").split("?")[0];
    if (req.method === "GET" && (pathname === "/api/health" || pathname === "/healthz")) {
      Promise.all([probe(nextPort), probe(socketPort)])
        .then(([nextUp, socketUp]) => {
          const ok = nextUp && socketUp;
          const body = JSON.stringify({
            ok,
            mock: process.env.USE_MOCK_DATA !== "false",
            next: nextUp,
            socket: socketUp,
          });
          res.writeHead(ok ? 200 : 503, {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          });
          res.end(body);
        })
        .catch(() => {
          if (res.headersSent) return;
          res.writeHead(503, { "content-type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: false }));
        });
      return;
    }
    const target = isSocketIoPath(req.url || "") ? socketPort : nextPort;
    proxyRequest(req, res, target);
  });

  server.on("upgrade", (req, socket, head) => {
    const target = isSocketIoPath(req.url || "") ? socketPort : nextPort;
    proxyUpgrade(req, socket, head, target);
  });

  return {
    server,
    listen() {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          const address = server.address();
          resolve(typeof address === "object" && address ? address.port : port);
        });
      });
    },
    close() {
      return new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      });
    },
  };
}

function bin(name) {
  const full = path.join(root, "node_modules", ".bin", name);
  if (!existsSync(full)) {
    throw new Error(`找不到 ${full}。请先在仓库根目录执行 pnpm install（需包含 devDependencies，tsx 用来启动 Socket）。`);
  }
  return full;
}

function runningAsCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

function main() {
  const { publicPort, socketPort, nextPort } = internalPorts(process.env);
  const children = [];
  let gateway;
  let stopping = false;

  const shutdown = (code) => {
    if (stopping) return;
    stopping = true;
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
      }
    }
    const finish = () => process.exit(code);
    const timer = setTimeout(finish, 10_000);
    timer.unref();
    const pending = gateway ? gateway.close() : Promise.resolve();
    pending.then(finish, finish);
  };

  const track = (child, name) => {
    children.push(child);
    child.on("exit", (code, signal) => {
      if (stopping) return;
      console.error(`[demo] ${name} exited code=${code} signal=${signal ?? ""}`);
      shutdown(typeof code === "number" ? code : 1);
    });
  };

  track(
    spawn(bin("next"), ["start", "-H", "127.0.0.1", "-p", String(nextPort)], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        PORT: String(nextPort),
        HOSTNAME: "127.0.0.1",
      },
    }),
    "next"
  );

  track(
    spawn(bin("tsx"), ["socket/server.ts"], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        SOCKET_PORT: String(socketPort),
        SOCKET_HOST: process.env.SOCKET_HOST?.trim() || "127.0.0.1",
      },
    }),
    "socket"
  );

  gateway = createGateway({
    port: publicPort,
    host: "0.0.0.0",
    nextPort,
    socketPort,
  });

  gateway
    .listen()
    .then((bound) => {
      console.log(
        `[demo] http://0.0.0.0:${bound}  next=127.0.0.1:${nextPort}  socket=127.0.0.1:${socketPort}`
      );
    })
    .catch((error) => {
      console.error("[demo] gateway failed", error);
      shutdown(1);
    });

  process.on("SIGTERM", () => shutdown(0));
  process.on("SIGINT", () => shutdown(0));
}

if (runningAsCli()) {
  try {
    main();
  } catch (error) {
    console.error("[demo] failed to start", error);
    process.exit(1);
  }
}
