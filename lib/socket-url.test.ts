import assert from "node:assert/strict";
import test from "node:test";
import { resolveSocketUrl } from "./socket-url";

test("explicit socket url wins", () => {
  assert.equal(
    resolveSocketUrl(
      {
        NEXT_PUBLIC_SOCKET_URL: "https://sockets.example.com",
        NODE_ENV: "production",
      },
      "https://life-leap-demo.onrender.com"
    ),
    "https://sockets.example.com"
  );
});

test("blank production url uses the page origin", () => {
  assert.equal(
    resolveSocketUrl(
      { NEXT_PUBLIC_SOCKET_URL: "  ", NODE_ENV: "production" },
      "https://life-leap-demo.onrender.com"
    ),
    "https://life-leap-demo.onrender.com"
  );
});

test("development keeps the local socket port", () => {
  assert.equal(
    resolveSocketUrl(
      { NODE_ENV: "development" },
      "http://localhost:3000"
    ),
    "http://localhost:3001"
  );
});
