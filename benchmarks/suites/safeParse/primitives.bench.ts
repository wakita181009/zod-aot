import { bench, describe } from "vitest";
import {
  ajvNumberWithChecks,
  ajvSimpleEnum,
  ajvSimpleString,
  ajvStringWithChecks,
  aotBigInt,
  aotEnum,
  aotNumberChecks,
  aotSimpleString,
  aotStringChecks,
  BigIntSchema,
  NumberWithChecks,
  SimpleEnum,
  SimpleString,
  StringWithChecks,
  typiaValidateNumberWithChecks,
  typiaValidateSimpleEnum,
  typiaValidateSimpleString,
  typiaValidateStringWithChecks,
  validBigInt,
  validNumberWithChecks,
  validSimpleEnum,
  validSimpleString,
  validStringWithChecks,
} from "../../schemas/index.js";

describe("safeParse: simple string", () => {
  bench("zod", () => {
    SimpleString.safeParse(validSimpleString);
  });
  bench("zod-aot", () => {
    aotSimpleString.safeParse(validSimpleString);
  });
  bench("typia", () => {
    typiaValidateSimpleString(validSimpleString);
  });
  bench("ajv", () => {
    ajvSimpleString(validSimpleString);
  });
});

describe("safeParse: string with checks (min/max)", () => {
  bench("zod", () => {
    StringWithChecks.safeParse(validStringWithChecks);
  });
  bench("zod-aot", () => {
    aotStringChecks.safeParse(validStringWithChecks);
  });
  bench("typia", () => {
    typiaValidateStringWithChecks(validStringWithChecks);
  });
  bench("ajv", () => {
    ajvStringWithChecks(validStringWithChecks);
  });
});

describe("safeParse: number with checks (int + positive)", () => {
  bench("zod", () => {
    NumberWithChecks.safeParse(validNumberWithChecks);
  });
  bench("zod-aot", () => {
    aotNumberChecks.safeParse(validNumberWithChecks);
  });
  bench("typia", () => {
    typiaValidateNumberWithChecks(validNumberWithChecks);
  });
  bench("ajv", () => {
    ajvNumberWithChecks(validNumberWithChecks);
  });
});

describe("safeParse: enum", () => {
  bench("zod", () => {
    SimpleEnum.safeParse(validSimpleEnum);
  });
  bench("zod-aot", () => {
    aotEnum.safeParse(validSimpleEnum);
  });
  bench("typia", () => {
    typiaValidateSimpleEnum(validSimpleEnum);
  });
  bench("ajv", () => {
    ajvSimpleEnum(validSimpleEnum);
  });
});

describe("safeParse: bigint with checks (min/max)", () => {
  bench("zod", () => {
    BigIntSchema.safeParse(validBigInt);
  });
  bench("zod-aot", () => {
    aotBigInt.safeParse(validBigInt);
  });
  // typia: tags (Minimum/Maximum) don't target bigint
  // ajv: no bigint support in JSON Schema
});
