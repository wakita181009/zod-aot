import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mapRefineCheck } from "#src/core/extract/checks.js";
import { extractSchema } from "#src/core/extract/index.js";
import type { ZodCheckDef } from "#src/core/extract/types.js";

const refine = (error?: unknown) =>
  ({ check: "custom", fn: (v: unknown) => v !== 0, error }) as unknown as ZodCheckDef;

describe("mapRefineCheck", () => {
  it("keeps a string message from the error function", () => {
    expect(mapRefineCheck(refine(() => "must not be zero"))).toEqual({
      kind: "refine_effect",
      source: "(v) => v !== 0",
      message: "must not be zero",
    });
  });

  it("omits the message when the error function returns a non-string or throws", () => {
    for (const error of [
      () => ({ message: "obj" }),
      () => {
        throw new Error("boom");
      },
      undefined,
    ]) {
      expect(mapRefineCheck(refine(error))).toEqual({
        kind: "refine_effect",
        source: "(v) => v !== 0",
      });
    }
  });

  it("falls back with reason refine when fn captures variables", () => {
    const captured = 0;
    const def = { check: "custom", fn: (v: unknown) => v !== captured } as unknown as ZodCheckDef;
    expect(mapRefineCheck(def)).toBe("refine");
  });

  it("rejects non-custom checks", () => {
    expect(mapRefineCheck({ check: "min_length" } as ZodCheckDef)).toBe("unsupported");
  });

  it("carries a .refine() message end to end", () => {
    const ir = extractSchema(z.number().refine((v) => v > 0, "positive please"));
    expect(ir).toEqual({
      type: "number",
      checks: [{ kind: "refine_effect", source: "(v) => v > 0", message: "positive please" }],
    });
  });
});
