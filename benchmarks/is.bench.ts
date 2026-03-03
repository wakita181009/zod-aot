import { bench, describe } from "vitest";
import { compileForBench } from "./helpers/compile.js";
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
} from "./schemas";

// Pre-compile all AOT validators
const aotSimpleString = compileForBench(SimpleString, "simpleString");
const aotStringChecks = compileForBench(StringWithChecks, "stringChecks");
const aotNumberChecks = compileForBench(NumberWithChecks, "numberChecks");
const aotEnum = compileForBench(SimpleEnum, "simpleEnum");
const aotUser = compileForBench(UserSchema, "user");
const aotApiResponse = compileForBench(ApiResponseSchema, "apiResponse");

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
