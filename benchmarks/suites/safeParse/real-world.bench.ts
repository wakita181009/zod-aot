import { bench, describe } from "vitest";
import {
  aotEventLog,
  aotFallbackArray,
  aotPartialFallback,
  EventLogSchema,
  FallbackArraySchema,
  PartialFallbackObjectSchema,
  validEventLog,
  validFallbackArray10,
  validFallbackArray50,
  validPartialFallbackObject,
} from "../../schemas/index.js";

// ─── Multi-feature Scenario ─────────────────────────────────────────────────

describe("safeParse: event log (uuid + discUnion + tuple + record + date)", () => {
  bench("zod", () => {
    EventLogSchema.safeParse(validEventLog);
  });
  bench("zod-aot", () => {
    aotEventLog.safeParse(validEventLog);
  });
});

// ─── Partial Fallback (zod vs zod-aot) ──────────────────────────────────────
// These schemas contain transform(), so zod-aot uses partial fallback.
// ajv/typia are excluded: transforms are a Zod-specific feature.

describe("safeParse: partial fallback — object with transform", () => {
  bench("zod", () => {
    PartialFallbackObjectSchema.safeParse(validPartialFallbackObject);
  });
  bench("zod-aot", () => {
    aotPartialFallback.safeParse(validPartialFallbackObject);
  });
});

describe("safeParse: partial fallback — array 10 items with transform", () => {
  bench("zod", () => {
    FallbackArraySchema.safeParse(validFallbackArray10);
  });
  bench("zod-aot", () => {
    aotFallbackArray.safeParse(validFallbackArray10);
  });
});

describe("safeParse: partial fallback — array 50 items with transform", () => {
  bench("zod", () => {
    FallbackArraySchema.safeParse(validFallbackArray50);
  });
  bench("zod-aot", () => {
    aotFallbackArray.safeParse(validFallbackArray50);
  });
});
