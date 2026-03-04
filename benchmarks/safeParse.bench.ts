import { bench, describe } from "vitest";
import { compileForBench } from "./helpers/compile.js";
import {
  ApiResponseSchema,
  BigIntSchema,
  DiscriminatedUnionSchema,
  EventLogSchema,
  FallbackArraySchema,
  invalidUser,
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
  validMap20,
  validNumberWithChecks,
  validPartialFallbackObject,
  validPipe,
  validRecord,
  validSet5,
  validSet20,
  validSimpleEnum,
  validSimpleString,
  validStringWithChecks,
  validTuple,
  validUser,
} from "./schemas/index.js";

// Pre-compile all AOT validators (build-time cost, not measured)
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

describe("safeParse: simple string", () => {
  bench("zod", () => {
    SimpleString.safeParse(validSimpleString);
  });
  bench("zod-aot", () => {
    aotSimpleString.safeParse(validSimpleString);
  });
});

describe("safeParse: string with checks (min/max)", () => {
  bench("zod", () => {
    StringWithChecks.safeParse(validStringWithChecks);
  });
  bench("zod-aot", () => {
    aotStringChecks.safeParse(validStringWithChecks);
  });
});

describe("safeParse: number with checks (int + positive)", () => {
  bench("zod", () => {
    NumberWithChecks.safeParse(validNumberWithChecks);
  });
  bench("zod-aot", () => {
    aotNumberChecks.safeParse(validNumberWithChecks);
  });
});

describe("safeParse: enum", () => {
  bench("zod", () => {
    SimpleEnum.safeParse(validSimpleEnum);
  });
  bench("zod-aot", () => {
    aotEnum.safeParse(validSimpleEnum);
  });
});

describe("safeParse: bigint with checks (min/max)", () => {
  bench("zod", () => {
    BigIntSchema.safeParse(validBigInt);
  });
  bench("zod-aot", () => {
    aotBigInt.safeParse(validBigInt);
  });
});

// ─── Objects ─────────────────────────────────────────────────────────────────

describe("safeParse: medium object — valid user", () => {
  bench("zod", () => {
    UserSchema.safeParse(validUser);
  });
  bench("zod-aot", () => {
    aotUser.safeParse(validUser);
  });
});

describe("safeParse: medium object — invalid user", () => {
  bench("zod", () => {
    UserSchema.safeParse(invalidUser);
  });
  bench("zod-aot", () => {
    aotUser.safeParse(invalidUser);
  });
});

describe("safeParse: large object — 10 items", () => {
  bench("zod", () => {
    ApiResponseSchema.safeParse(validApiResponse10);
  });
  bench("zod-aot", () => {
    aotApiResponse.safeParse(validApiResponse10);
  });
});

describe("safeParse: large object — 100 items", () => {
  bench("zod", () => {
    ApiResponseSchema.safeParse(validApiResponse100);
  });
  bench("zod-aot", () => {
    aotApiResponse.safeParse(validApiResponse100);
  });
});

// ─── Composites ──────────────────────────────────────────────────────────────

describe("safeParse: tuple [string, int, boolean]", () => {
  bench("zod", () => {
    TupleSchema.safeParse(validTuple);
  });
  bench("zod-aot", () => {
    aotTuple.safeParse(validTuple);
  });
});

describe("safeParse: record<string, number>", () => {
  bench("zod", () => {
    RecordSchema.safeParse(validRecord);
  });
  bench("zod-aot", () => {
    aotRecord.safeParse(validRecord);
  });
});

describe("safeParse: discriminatedUnion (3 options)", () => {
  bench("zod", () => {
    DiscriminatedUnionSchema.safeParse(validClickEvent);
  });
  bench("zod-aot", () => {
    aotDiscUnion.safeParse(validClickEvent);
  });
});

describe("safeParse: set<string> (5 items)", () => {
  bench("zod", () => {
    SetSchema.safeParse(validSet5);
  });
  bench("zod-aot", () => {
    aotSet.safeParse(validSet5);
  });
});

describe("safeParse: set<string> (20 items)", () => {
  bench("zod", () => {
    SetSchema.safeParse(validSet20);
  });
  bench("zod-aot", () => {
    aotSet.safeParse(validSet20);
  });
});

describe("safeParse: map<string, number> (5 entries)", () => {
  bench("zod", () => {
    MapSchema.safeParse(validMap5);
  });
  bench("zod-aot", () => {
    aotMap.safeParse(validMap5);
  });
});

describe("safeParse: map<string, number> (20 entries)", () => {
  bench("zod", () => {
    MapSchema.safeParse(validMap20);
  });
  bench("zod-aot", () => {
    aotMap.safeParse(validMap20);
  });
});

describe("safeParse: pipe (string → string with max)", () => {
  bench("zod", () => {
    PipeSchema.safeParse(validPipe);
  });
  bench("zod-aot", () => {
    aotPipe.safeParse(validPipe);
  });
});

// ─── Combined ────────────────────────────────────────────────────────────────

describe("safeParse: event log (combined)", () => {
  bench("zod", () => {
    EventLogSchema.safeParse(validEventLog);
  });
  bench("zod-aot", () => {
    aotEventLog.safeParse(validEventLog);
  });
});

// ─── Partial Fallback ───────────────────────────────────────────────────────

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
