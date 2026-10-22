import { Hono } from "hono";

const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok" }));

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3001),
  fetch: app.fetch,
});

console.log(`API listening on http://localhost:${server.port}`);