import { z } from "zod";

// ─── Tuple ───────────────────────────────────────────────────────────────────

export const TupleSchema = z.tuple([z.string(), z.number().int(), z.boolean()]);

export const validTuple = ["hello", 42, true] as const;

// ─── Record ──────────────────────────────────────────────────────────────────

export const RecordSchema = z.record(z.string(), z.number());

export const validRecord: Record<string, number> = {
  alpha: 1,
  beta: 2,
  gamma: 3,
  delta: 4,
  epsilon: 5,
};

// ─── Discriminated Union (O(1) switch optimization) ──────────────────────────

const ClickEvent = z.object({
  type: z.literal("click"),
  x: z.number().int(),
  y: z.number().int(),
  target: z.string().min(1),
});

const ScrollEvent = z.object({
  type: z.literal("scroll"),
  direction: z.enum(["up", "down"]),
  delta: z.number().positive(),
});

const KeypressEvent = z.object({
  type: z.literal("keypress"),
  key: z.string().min(1),
  modifiers: z.array(z.string()),
});

export const DiscriminatedUnionSchema = z.discriminatedUnion("type", [
  ClickEvent,
  ScrollEvent,
  KeypressEvent,
]);

export type UIEvent = z.infer<typeof DiscriminatedUnionSchema>;

export const validClickEvent: UIEvent = {
  type: "click",
  x: 100,
  y: 200,
  target: "button#submit",
};

export const validScrollEvent: UIEvent = {
  type: "scroll",
  direction: "down",
  delta: 120,
};

export const validKeypressEvent: UIEvent = {
  type: "keypress",
  key: "Enter",
  modifiers: ["ctrl", "shift"],
};
