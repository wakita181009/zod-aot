import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { compile } from "zod-aot";
import { CreateUserSchema } from "./schemas.js";

export const app = new Hono();

// POST /zod — Zod native validation
app.post("/zod", async (c) => {
  const body = await c.req.json();
  const result = CreateUserSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: "Validation failed", issues: result.error.issues }, 400);
  }
  return c.json({ validator: "zod", data: result.data });
});

// POST /zod-aot — zod-aot compiled validation
app.post("/zod-aot", async (c) => {
  const body = await c.req.json();
  const result = compile(CreateUserSchema).safeParse(body);
  if (!result.success) {
    return c.json({ error: "Validation failed", issues: result.error.issues }, 400);
  }
  return c.json({ validator: "zod-aot", data: result.data });
});

if (!process.env["VITEST"]) {
  const port = 3000;
  // biome-ignore lint/suspicious/noConsole: app startup log
  console.log(`Server running on http://localhost:${port}`);
  serve({ fetch: app.fetch, port });
}
