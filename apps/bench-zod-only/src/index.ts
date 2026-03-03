import { performance } from "node:perf_hooks";
import {
  ApiResponseSchema,
  DiscriminatedUnionSchema,
  EventLogSchema,
  NumberWithChecks,
  RecordSchema,
  SimpleEnum,
  SimpleString,
  StringWithChecks,
  TupleSchema,
  UserSchema,
  validApiResponse10,
  validApiResponse100,
  validClickEvent,
  validEventLog,
  validNumberWithChecks,
  validRecord,
  validSimpleEnum,
  validSimpleString,
  validStringWithChecks,
  validTuple,
  validUser,
} from "@zod-aot/benchmarks/schemas";

function benchmark(name: string, fn: () => void, iterations = 100_000): void {
  // Warmup
  for (let i = 0; i < 1_000; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;

  const opsPerSec = Math.round((iterations / elapsed) * 1_000);
  // biome-ignore lint/suspicious/noConsole: benchmark output
  console.log(`  ${name}: ${opsPerSec.toLocaleString()} ops/sec (${elapsed.toFixed(2)}ms)`);
}

// biome-ignore lint/suspicious/noConsole: benchmark output
console.log("=== Zod Only Benchmark ===\n");

// biome-ignore lint/suspicious/noConsole: benchmark output
console.log("--- safeParse ---");
benchmark("simple string", () => SimpleString.safeParse(validSimpleString));
benchmark("string (min/max)", () => StringWithChecks.safeParse(validStringWithChecks));
benchmark("number (int+positive)", () => NumberWithChecks.safeParse(validNumberWithChecks));
benchmark("enum", () => SimpleEnum.safeParse(validSimpleEnum));
benchmark("medium object (user)", () => UserSchema.safeParse(validUser));
benchmark("large object (10 items)", () => ApiResponseSchema.safeParse(validApiResponse10));
benchmark(
  "large object (100 items)",
  () => ApiResponseSchema.safeParse(validApiResponse100),
  10_000,
);
benchmark("tuple [string, int, bool]", () => TupleSchema.safeParse(validTuple));
benchmark("record<string, number>", () => RecordSchema.safeParse(validRecord));
benchmark("discriminatedUnion (3)", () => DiscriminatedUnionSchema.safeParse(validClickEvent));
benchmark("event log (combined)", () => EventLogSchema.safeParse(validEventLog));

// biome-ignore lint/suspicious/noConsole: benchmark output
console.log("\n--- is (type guard) ---");
benchmark("simple string", () => SimpleString.safeParse(validSimpleString).success);
benchmark("string (min/max)", () => StringWithChecks.safeParse(validStringWithChecks).success);
benchmark("number (int+positive)", () => NumberWithChecks.safeParse(validNumberWithChecks).success);
benchmark("enum", () => SimpleEnum.safeParse(validSimpleEnum).success);
benchmark("medium object (user)", () => UserSchema.safeParse(validUser).success);
benchmark("large object (10 items)", () => ApiResponseSchema.safeParse(validApiResponse10).success);
benchmark(
  "large object (100 items)",
  () => ApiResponseSchema.safeParse(validApiResponse100).success,
  10_000,
);
benchmark("tuple [string, int, bool]", () => TupleSchema.safeParse(validTuple).success);
benchmark("record<string, number>", () => RecordSchema.safeParse(validRecord).success);
benchmark(
  "discriminatedUnion (3)",
  () => DiscriminatedUnionSchema.safeParse(validClickEvent).success,
);
benchmark("event log (combined)", () => EventLogSchema.safeParse(validEventLog).success);
