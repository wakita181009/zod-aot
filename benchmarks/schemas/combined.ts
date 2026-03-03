import { z } from "zod";
import { DiscriminatedUnionSchema } from "./composites.js";

// ─── Event Log (real-world scenario combining multiple type features) ────────

export const EventLogSchema = z.object({
  sessionId: z.uuid(),
  events: z.array(DiscriminatedUnionSchema).min(1),
  dimensions: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  tags: z.record(z.string(), z.string()),
  startedAt: z.date(),
  config: z.object({
    sampleRate: z.number().positive().default(1.0),
    debug: z.boolean().default(false),
  }),
});

export type EventLog = z.infer<typeof EventLogSchema>;

export const validEventLog = {
  sessionId: "550e8400-e29b-41d4-a716-446655440000",
  events: [
    { type: "click" as const, x: 100, y: 200, target: "button" },
    { type: "scroll" as const, direction: "down" as const, delta: 120 },
    { type: "keypress" as const, key: "Enter", modifiers: ["ctrl"] },
    { type: "click" as const, x: 50, y: 75, target: "link" },
    { type: "scroll" as const, direction: "up" as const, delta: 60 },
  ],
  dimensions: [1920, 1080] as [number, number],
  tags: { browser: "chrome", os: "macos", version: "120" },
  startedAt: new Date("2025-01-01T00:00:00Z"),
  config: { sampleRate: 0.5, debug: false },
};
