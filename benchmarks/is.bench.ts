import { bench, describe } from "vitest";
import { compileForBench } from "./helpers/compile.js";
import {
  ApiResponseSchema,
  DiscriminatedUnionSchema,
  EventLogSchema,
  FallbackArraySchema,
  NumberWithChecks,
  PartialFallbackObjectSchema,
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
  validFallbackArray10,
  validNumberWithChecks,
  validPartialFallbackObject,
  validRecord,
  validSimpleEnum,
  validSimpleString,
  validStringWithChecks,
  validTuple,
  validUser,
} from "./schemas/index.js";

// Pre-compile all AOT validators
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

// ─── Simple Types ─────────────────────────────────────────────────────────────

describe("is(): simple string", () => {
  bench("zod (safeParse().success)", () => {
    SimpleString.safeParse(validSimpleString).success;
  });
  bench("zod-aot", () => {
    aotSimpleString.is(validSimpleString);
  });
});

describe("is(): string with checks", () => {
  bench("zod (safeParse().success)", () => {
    StringWithChecks.safeParse(validStringWithChecks).success;
  });
  bench("zod-aot", () => {
    aotStringChecks.is(validStringWithChecks);
  });
});

describe("is(): number with checks", () => {
  bench("zod (safeParse().success)", () => {
    NumberWithChecks.safeParse(validNumberWithChecks).success;
  });
  bench("zod-aot", () => {
    aotNumberChecks.is(validNumberWithChecks);
  });
});

describe("is(): enum", () => {
  bench("zod (safeParse().success)", () => {
    SimpleEnum.safeParse(validSimpleEnum).success;
  });
  bench("zod-aot", () => {
    aotEnum.is(validSimpleEnum);
  });
});

// ─── Medium: User Object ──────────────────────────────────────────────────────

describe("is(): medium object — valid user", () => {
  bench("zod (safeParse().success)", () => {
    UserSchema.safeParse(validUser).success;
  });
  bench("zod-aot", () => {
    aotUser.is(validUser);
  });
});

// ─── Large: API Response ──────────────────────────────────────────────────────

describe("is(): large object — 10 items", () => {
  bench("zod (safeParse().success)", () => {
    ApiResponseSchema.safeParse(validApiResponse10).success;
  });
  bench("zod-aot", () => {
    aotApiResponse.is(validApiResponse10);
  });
});

describe("is(): large object — 100 items", () => {
  bench("zod (safeParse().success)", () => {
    ApiResponseSchema.safeParse(validApiResponse100).success;
  });
  bench("zod-aot", () => {
    aotApiResponse.is(validApiResponse100);
  });
});

// ─── Composite Types ─────────────────────────────────────────────────────────

describe("is(): tuple [string, int, boolean]", () => {
  bench("zod (safeParse().success)", () => {
    TupleSchema.safeParse(validTuple).success;
  });
  bench("zod-aot", () => {
    aotTuple.is(validTuple);
  });
});

describe("is(): record<string, number>", () => {
  bench("zod (safeParse().success)", () => {
    RecordSchema.safeParse(validRecord).success;
  });
  bench("zod-aot", () => {
    aotRecord.is(validRecord);
  });
});

describe("is(): discriminatedUnion (3 options)", () => {
  bench("zod (safeParse().success)", () => {
    DiscriminatedUnionSchema.safeParse(validClickEvent).success;
  });
  bench("zod-aot", () => {
    aotDiscUnion.is(validClickEvent);
  });
});

describe("is(): event log (combined)", () => {
  bench("zod (safeParse().success)", () => {
    EventLogSchema.safeParse(validEventLog).success;
  });
  bench("zod-aot", () => {
    aotEventLog.is(validEventLog);
  });
});

// ─── Partial Fallback ───────────────────────────────────────────────────────

describe("is(): partial fallback — object with transform", () => {
  bench("zod (safeParse().success)", () => {
    PartialFallbackObjectSchema.safeParse(validPartialFallbackObject).success;
  });
  bench("zod-aot", () => {
    aotPartialFallback.is(validPartialFallbackObject);
  });
});

describe("is(): partial fallback — array 10 items with transform", () => {
  bench("zod (safeParse().success)", () => {
    FallbackArraySchema.safeParse(validFallbackArray10).success;
  });
  bench("zod-aot", () => {
    aotFallbackArray.is(validFallbackArray10);
  });
});
