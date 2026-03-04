import { bench, describe } from "vitest";
import { compileForBench } from "./helpers/compile.js";
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
const aotBigInt = compileForBench(BigIntSchema, "bigint");
const aotSet = compileForBench(SetSchema, "set");
const aotMap = compileForBench(MapSchema, "map");
const aotPipe = compileForBench(PipeSchema, "pipe");

// ─── Primitives ──────────────────────────────────────────────────────────────

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

describe("is(): bigint with checks", () => {
  bench("zod (safeParse().success)", () => {
    BigIntSchema.safeParse(validBigInt).success;
  });
  bench("zod-aot", () => {
    aotBigInt.is(validBigInt);
  });
});

// ─── Objects ─────────────────────────────────────────────────────────────────

describe("is(): medium object — valid user", () => {
  bench("zod (safeParse().success)", () => {
    UserSchema.safeParse(validUser).success;
  });
  bench("zod-aot", () => {
    aotUser.is(validUser);
  });
});

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

// ─── Composites ──────────────────────────────────────────────────────────────

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

describe("is(): set<string> (5 items)", () => {
  bench("zod (safeParse().success)", () => {
    SetSchema.safeParse(validSet5).success;
  });
  bench("zod-aot", () => {
    aotSet.is(validSet5);
  });
});

describe("is(): map<string, number> (5 entries)", () => {
  bench("zod (safeParse().success)", () => {
    MapSchema.safeParse(validMap5).success;
  });
  bench("zod-aot", () => {
    aotMap.is(validMap5);
  });
});

describe("is(): pipe (string → string with max)", () => {
  bench("zod (safeParse().success)", () => {
    PipeSchema.safeParse(validPipe).success;
  });
  bench("zod-aot", () => {
    aotPipe.is(validPipe);
  });
});

// ─── Combined ────────────────────────────────────────────────────────────────

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
