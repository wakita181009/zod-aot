import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckDiscriminatedUnion", () => {
  it("both branches work", () => {
    const fn = compileFastCheck({
      type: "discriminatedUnion",
      discriminator: "kind",
      options: [
        {
          type: "object",
          properties: {
            kind: { type: "literal", values: ["a"] },
            x: { type: "string", checks: [] },
          },
        },
        {
          type: "object",
          properties: {
            kind: { type: "literal", values: ["b"] },
            y: { type: "number", checks: [] },
          },
        },
      ],
      mapping: { a: 0, b: 1 },
    });
    expect(fn?.({ kind: "a", x: "hello" })).toBe(true);
    expect(fn?.({ kind: "b", y: 42 })).toBe(true);
    expect(fn?.({ kind: "a", x: 123 })).toBe(false);
  });

  it("any ineligible branch → returns null", () => {
    expect(
      compileFastCheck({
        type: "discriminatedUnion",
        discriminator: "type",
        options: [
          {
            type: "object",
            properties: {
              type: { type: "literal", values: ["ok"] },
              data: { type: "string", checks: [] },
            },
          },
          { type: "fallback", reason: "transform" },
        ],
        mapping: { ok: 0, bad: 1 },
      }),
    ).toBeNull();
  });
});
