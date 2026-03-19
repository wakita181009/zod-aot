import { bench, describe } from "vitest";
import {
  ApiResponseSchema,
  ajvApiResponse,
  ajvUser,
  aotApiResponse,
  aotUser,
  invalidUser,
  typiaValidateApiResponse,
  typiaValidateUser,
  UserSchema,
  v3ApiResponseSchema,
  v3UserSchema,
  validApiResponse10,
  validApiResponse100,
  validUser,
} from "../../schemas/index.js";

describe("safeParse: medium object — valid user", () => {
  bench("zod", () => {
    UserSchema.safeParse(validUser);
  });
  bench("zod v3", () => {
    v3UserSchema.safeParse(validUser);
  });
  bench("zod-aot", () => {
    aotUser.safeParse(validUser);
  });
  bench("typia", () => {
    typiaValidateUser(validUser);
  });
  bench("ajv", () => {
    ajvUser(validUser);
  });
});

describe("safeParse: medium object — invalid user", () => {
  bench("zod", () => {
    UserSchema.safeParse(invalidUser);
  });
  bench("zod v3", () => {
    v3UserSchema.safeParse(invalidUser);
  });
  bench("zod-aot", () => {
    aotUser.safeParse(invalidUser);
  });
  bench("typia", () => {
    typiaValidateUser(invalidUser);
  });
  bench("ajv", () => {
    ajvUser(invalidUser);
  });
});

describe("safeParse: large object — 10 items", () => {
  bench("zod", () => {
    ApiResponseSchema.safeParse(validApiResponse10);
  });
  bench("zod v3", () => {
    v3ApiResponseSchema.safeParse(validApiResponse10);
  });
  bench("zod-aot", () => {
    aotApiResponse.safeParse(validApiResponse10);
  });
  bench("typia", () => {
    typiaValidateApiResponse(validApiResponse10);
  });
  bench("ajv", () => {
    ajvApiResponse(validApiResponse10);
  });
});

describe("safeParse: large object — 100 items", () => {
  bench("zod", () => {
    ApiResponseSchema.safeParse(validApiResponse100);
  });
  bench("zod v3", () => {
    v3ApiResponseSchema.safeParse(validApiResponse100);
  });
  bench("zod-aot", () => {
    aotApiResponse.safeParse(validApiResponse100);
  });
  bench("typia", () => {
    typiaValidateApiResponse(validApiResponse100);
  });
  bench("ajv", () => {
    ajvApiResponse(validApiResponse100);
  });
});
