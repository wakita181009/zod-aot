import { benchmark } from "../helpers/benchmark.js";
import {
  ApiResponseSchema,
  BigIntSchema,
  DiscriminatedUnionSchema,
  EventLogSchema,
  FallbackArraySchema,
  MapSchema,
  NumberWithChecks,
  PartialFallbackObjectSchema,
  PipeSchema,
  RecordSchema,
  SetSchema,
  SimpleEnum,
  SimpleString,
  StringWithChecks,
  TupleSchema,
  UserSchema,
  validApiResponse10,
  validApiResponse100,
  validBigInt,
  validClickEvent,
  validEventLog,
  validFallbackArray10,
  validFallbackArray50,
  validMap5,
  validNumberWithChecks,
  validPartialFallbackObject,
  validPipe,
  validRecord,
  validSet5,
  validSimpleEnum,
  validSimpleString,
  validStringWithChecks,
  validTuple,
  validUser,
} from "../schemas/index.js";

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
benchmark("partial fallback object", () =>
  PartialFallbackObjectSchema.safeParse(validPartialFallbackObject),
);
benchmark("partial fallback array (10)", () => FallbackArraySchema.safeParse(validFallbackArray10));
benchmark("partial fallback array (50)", () => FallbackArraySchema.safeParse(validFallbackArray50));
benchmark("bigint (min/max)", () => BigIntSchema.safeParse(validBigInt));
benchmark("set<string> (5 items)", () => SetSchema.safeParse(validSet5));
benchmark("map<string, number> (5)", () => MapSchema.safeParse(validMap5));
benchmark("pipe (string→string)", () => PipeSchema.safeParse(validPipe));

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
benchmark(
  "partial fallback object",
  () => PartialFallbackObjectSchema.safeParse(validPartialFallbackObject).success,
);
benchmark(
  "partial fallback array (10)",
  () => FallbackArraySchema.safeParse(validFallbackArray10).success,
);
benchmark("bigint (min/max)", () => BigIntSchema.safeParse(validBigInt).success);
benchmark("set<string> (5 items)", () => SetSchema.safeParse(validSet5).success);
benchmark("map<string, number> (5)", () => MapSchema.safeParse(validMap5).success);
benchmark("pipe (string→string)", () => PipeSchema.safeParse(validPipe).success);
