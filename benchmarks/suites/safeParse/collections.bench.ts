import { bench, describe } from "vitest";
import {
  ajvRecord,
  ajvTuple,
  aotMap,
  aotPipe,
  aotRecord,
  aotSet,
  aotTuple,
  MapSchema,
  PipeSchema,
  RecordSchema,
  SetSchema,
  TupleSchema,
  typiaValidateRecord,
  typiaValidateTuple,
  validMap5,
  validMap20,
  validPipe,
  validRecord,
  validSet5,
  validSet20,
  validTuple,
} from "../../schemas/index.js";

describe("safeParse: tuple [string, int, boolean]", () => {
  bench("zod", () => {
    TupleSchema.safeParse(validTuple);
  });
  bench("zod-aot", () => {
    aotTuple.safeParse(validTuple);
  });
  bench("typia", () => {
    typiaValidateTuple(validTuple as [string, number, boolean]);
  });
  bench("ajv", () => {
    ajvTuple(validTuple);
  });
});

describe("safeParse: record<string, number>", () => {
  bench("zod", () => {
    RecordSchema.safeParse(validRecord);
  });
  bench("zod-aot", () => {
    aotRecord.safeParse(validRecord);
  });
  bench("typia", () => {
    typiaValidateRecord(validRecord);
  });
  bench("ajv", () => {
    ajvRecord(validRecord);
  });
});

describe("safeParse: set<string> (5 items)", () => {
  bench("zod", () => {
    SetSchema.safeParse(validSet5);
  });
  bench("zod-aot", () => {
    aotSet.safeParse(validSet5);
  });
  // ajv: no JS Set support in JSON Schema
  // typia: does not validate Set contents
});

describe("safeParse: set<string> (20 items)", () => {
  bench("zod", () => {
    SetSchema.safeParse(validSet20);
  });
  bench("zod-aot", () => {
    aotSet.safeParse(validSet20);
  });
  // ajv: no JS Set support in JSON Schema
  // typia: does not validate Set contents
});

describe("safeParse: map<string, number> (5 entries)", () => {
  bench("zod", () => {
    MapSchema.safeParse(validMap5);
  });
  bench("zod-aot", () => {
    aotMap.safeParse(validMap5);
  });
  // ajv: no JS Map support in JSON Schema
  // typia: does not validate Map contents
});

describe("safeParse: map<string, number> (20 entries)", () => {
  bench("zod", () => {
    MapSchema.safeParse(validMap20);
  });
  bench("zod-aot", () => {
    aotMap.safeParse(validMap20);
  });
  // ajv: no JS Map support in JSON Schema
  // typia: does not validate Map contents
});

describe("safeParse: pipe (string → string, non-transform)", () => {
  bench("zod", () => {
    PipeSchema.safeParse(validPipe);
  });
  bench("zod-aot", () => {
    aotPipe.safeParse(validPipe);
  });
  // ajv: no pipe equivalent in JSON Schema
  // typia: no pipe equivalent
});
