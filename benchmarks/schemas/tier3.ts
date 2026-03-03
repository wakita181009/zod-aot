import { z } from "zod";

// ─── BigInt ──────────────────────────────────────────────────────────────────

export const BigIntSchema = z.bigint().min(0n).max(1000000n);

export const validBigInt = 42n;

// ─── Set ─────────────────────────────────────────────────────────────────────

export const SetSchema = z.set(z.string().min(1)).min(1).max(100);

export const validSet5 = new Set(["alpha", "beta", "gamma", "delta", "epsilon"]);

export const validSet20 = new Set(Array.from({ length: 20 }, (_, i) => `item_${i}`));

// ─── Map ─────────────────────────────────────────────────────────────────────

export const MapSchema = z.map(z.string().min(1), z.number().int().nonnegative());

export const validMap5 = new Map<string, number>([
  ["alpha", 1],
  ["beta", 2],
  ["gamma", 3],
  ["delta", 4],
  ["epsilon", 5],
]);

export const validMap20 = new Map<string, number>(
  Array.from({ length: 20 }, (_, i) => [`key_${i}`, i] as [string, number]),
);

// ─── Pipe (non-transform) ───────────────────────────────────────────────────

export const PipeSchema = z.string().min(1).pipe(z.string().max(100));

export const validPipe = "hello world";
