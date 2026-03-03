import { bench, describe } from "vitest";
import { compileForBench } from "./helpers/compile.js";
import {
  ApiResponseSchema,
  invalidUser,
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
} from "./schemas";

// Pre-compile all AOT validators (build-time cost, not measured)
const aotSimpleString = compileForBench(SimpleString, "simpleString");
const aotStringChecks = compileForBench(StringWithChecks, "stringChecks");
const aotNumberChecks = compileForBench(NumberWithChecks, "numberChecks");
const aotEnum = compileForBench(SimpleEnum, "simpleEnum");
const aotUser = compileForBench(UserSchema, "user");
const aotApiResponse = compileForBench(ApiResponseSchema, "apiResponse");

// ─── Simple Types ─────────────────────────────────────────────────────────────

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

// ─── Medium: User Object ──────────────────────────────────────────────────────

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

// ─── Large: API Response ──────────────────────────────────────────────────────

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
