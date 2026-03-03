import { performance } from "node:perf_hooks";
import {
  ApiResponseSchema,
  NumberWithChecks,
  SimpleEnum,
  SimpleString,
  StringWithChecks,
  UserSchema,
  validApiResponse10,
  validApiResponse100,
  validNumberWithChecks,
  validSimpleEnum,
  validSimpleString,
  validStringWithChecks,
  validUser,
} from "@zod-aot/benchmarks/schemas";
import type { SafeParseResult } from "zod-aot";
import { extractSchema, generateValidator } from "zod-aot";

function compileAot(schema: unknown, name: string) {
  const ir = extractSchema(schema);
  const result = generateValidator(ir, name);
  const safeParseFn = new Function(`${result.code}\nreturn ${result.functionName};`)() as (
    input: unknown,
  ) => SafeParseResult<unknown>;
  return {
    safeParse: safeParseFn,
    is: (input: unknown) => safeParseFn(input).success,
  };
}

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

// Pre-compile all validators
const aotSimpleString = compileAot(SimpleString, "simpleString");
const aotStringChecks = compileAot(StringWithChecks, "stringChecks");
const aotNumberChecks = compileAot(NumberWithChecks, "numberChecks");
const aotEnum = compileAot(SimpleEnum, "simpleEnum");
const aotUser = compileAot(UserSchema, "user");
const aotApiResponse = compileAot(ApiResponseSchema, "apiResponse");

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

// biome-ignore lint/suspicious/noConsole: benchmark output
console.log("\n--- is (type guard) ---");
benchmark("simple string", () => aotSimpleString.is(validSimpleString));
benchmark("string (min/max)", () => aotStringChecks.is(validStringWithChecks));
benchmark("number (int+positive)", () => aotNumberChecks.is(validNumberWithChecks));
benchmark("enum", () => aotEnum.is(validSimpleEnum));
benchmark("medium object (user)", () => aotUser.is(validUser));
benchmark("large object (10 items)", () => aotApiResponse.is(validApiResponse10));
benchmark("large object (100 items)", () => aotApiResponse.is(validApiResponse100), 10_000);
