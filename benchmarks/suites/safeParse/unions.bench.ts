import { bench, describe } from "vitest";
import {
  ajvDiscriminatedUnion,
  aotDiscUnion,
  DiscriminatedUnionSchema,
  typiaValidateDiscriminatedUnion,
  v3DiscriminatedUnionSchema,
  validClickEvent,
} from "../../schemas/index.js";

describe("safeParse: discriminatedUnion (3 options)", () => {
  bench("zod", () => {
    DiscriminatedUnionSchema.safeParse(validClickEvent);
  });
  bench("zod v3", () => {
    v3DiscriminatedUnionSchema.safeParse(validClickEvent);
  });
  bench("zod-aot", () => {
    aotDiscUnion.safeParse(validClickEvent);
  });
  bench("typia", () => {
    typiaValidateDiscriminatedUnion(validClickEvent);
  });
  bench("ajv", () => {
    ajvDiscriminatedUnion(validClickEvent);
  });
});
