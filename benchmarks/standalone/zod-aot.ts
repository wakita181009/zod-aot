import { benchmark } from "../helpers/benchmark.js";
import { compileForBench } from "../helpers/compile.js";
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

// Pre-compile all validators
const aotSimpleString = compileForBench(SimpleString, "simpleString");
const aotStringChecks = compileForBench(StringWithChecks, "stringChecks");
const aotNumberChecks = compileForBench(NumberWithChecks, "numberChecks");
const aotEnum = compileForBench(SimpleEnum, "simpleEnum");
const aotUser = compileForBench(UserSchema, "user");
const aotApiResponse = compileForBench(ApiResponseSchema, "apiResponse");
const aotTuple = compileForBench(TupleSchema, "tuple");
const aotRecord = compileForBench(RecordSchema, "record");
const aotDiscUnion = compileForBench(DiscriminatedUnionSchema, "discUnion");
const aotEventLog = compileForBench(EventLogSchema, "eventLog");
const aotPartialFallback = compileForBench(PartialFallbackObjectSchema, "partialFallback");
const aotFallbackArray = compileForBench(FallbackArraySchema, "fallbackArray");
const aotBigInt = compileForBench(BigIntSchema, "bigint");
const aotSet = compileForBench(SetSchema, "set");
const aotMap = compileForBench(MapSchema, "map");
const aotPipe = compileForBench(PipeSchema, "pipe");

// biome-ignore lint/suspicious/noConsole: benchmark output
console.log("=== zod-aot Benchmark ===\n");

// biome-ignore lint/suspicious/noConsole: benchmark output
console.log("--- safeParse ---");
benchmark("simple string", () => aotSimpleString.safeParse(validSimpleString));
benchmark("string (min/max)", () => aotStringChecks.safeParse(validStringWithChecks));
benchmark("number (int+positive)", () => aotNumberChecks.safeParse(validNumberWithChecks));
benchmark("enum", () => aotEnum.safeParse(validSimpleEnum));
benchmark("medium object (user)", () => aotUser.safeParse(validUser));
benchmark("large object (10 items)", () => aotApiResponse.safeParse(validApiResponse10));
benchmark("large object (100 items)", () => aotApiResponse.safeParse(validApiResponse100), 10_000);
benchmark("tuple [string, int, bool]", () => aotTuple.safeParse(validTuple));
benchmark("record<string, number>", () => aotRecord.safeParse(validRecord));
benchmark("discriminatedUnion (3)", () => aotDiscUnion.safeParse(validClickEvent));
benchmark("event log (combined)", () => aotEventLog.safeParse(validEventLog));
benchmark("partial fallback object", () =>
  aotPartialFallback.safeParse(validPartialFallbackObject),
);
benchmark("partial fallback array (10)", () => aotFallbackArray.safeParse(validFallbackArray10));
benchmark("partial fallback array (50)", () => aotFallbackArray.safeParse(validFallbackArray50));
benchmark("bigint (min/max)", () => aotBigInt.safeParse(validBigInt));
benchmark("set<string> (5 items)", () => aotSet.safeParse(validSet5));
benchmark("map<string, number> (5)", () => aotMap.safeParse(validMap5));
benchmark("pipe (string→string)", () => aotPipe.safeParse(validPipe));

// biome-ignore lint/suspicious/noConsole: benchmark output
console.log("\n--- is (type guard) ---");
benchmark("simple string", () => aotSimpleString.is(validSimpleString));
benchmark("string (min/max)", () => aotStringChecks.is(validStringWithChecks));
benchmark("number (int+positive)", () => aotNumberChecks.is(validNumberWithChecks));
benchmark("enum", () => aotEnum.is(validSimpleEnum));
benchmark("medium object (user)", () => aotUser.is(validUser));
benchmark("large object (10 items)", () => aotApiResponse.is(validApiResponse10));
benchmark("large object (100 items)", () => aotApiResponse.is(validApiResponse100), 10_000);
benchmark("tuple [string, int, bool]", () => aotTuple.is(validTuple));
benchmark("record<string, number>", () => aotRecord.is(validRecord));
benchmark("discriminatedUnion (3)", () => aotDiscUnion.is(validClickEvent));
benchmark("event log (combined)", () => aotEventLog.is(validEventLog));
benchmark("partial fallback object", () => aotPartialFallback.is(validPartialFallbackObject));
benchmark("partial fallback array (10)", () => aotFallbackArray.is(validFallbackArray10));
benchmark("bigint (min/max)", () => aotBigInt.is(validBigInt));
benchmark("set<string> (5 items)", () => aotSet.is(validSet5));
benchmark("map<string, number> (5)", () => aotMap.is(validMap5));
benchmark("pipe (string→string)", () => aotPipe.is(validPipe));
