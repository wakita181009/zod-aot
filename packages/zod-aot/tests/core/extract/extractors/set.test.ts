import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractSet } from "#src/core/extract/extractors/set.js";
import { extractSchema } from "#src/core/extract/index.js";
import type { SetIR } from "#src/core/types.js";

describe("extractSchema — set", () => {
  it("extracts plain set with no checks", () => {
    const ir = extractSchema(z.set(z.string())) as SetIR;
    expect(ir.type).toBe("set");
    expect(ir.valueType.type).toBe("string");
    expect(ir.checks).toBeUndefined();
  });

  it("extracts set with number value type", () => {
    const ir = extractSchema(z.set(z.number())) as SetIR;
    expect(ir.type).toBe("set");
    expect(ir.valueType.type).toBe("number");
  });

  it("extracts set with min size check", () => {
    const ir = extractSchema(z.set(z.string()).min(1)) as SetIR;
    expect(ir.type).toBe("set");
    expect(ir.checks).toContainEqual({ kind: "min_size", minimum: 1 });
  });

  it("extracts set with max size check", () => {
    const ir = extractSchema(z.set(z.string()).max(10)) as SetIR;
    expect(ir.type).toBe("set");
    expect(ir.checks).toContainEqual({ kind: "max_size", maximum: 10 });
  });

  it("extracts set with both min and max size checks", () => {
    const ir = extractSchema(z.set(z.number()).min(1).max(100)) as SetIR;
    expect(ir.type).toBe("set");
    expect(ir.checks).toHaveLength(2);
    expect(ir.checks).toContainEqual({ kind: "min_size", minimum: 1 });
    expect(ir.checks).toContainEqual({ kind: "max_size", maximum: 100 });
  });

  it("does not extract unsupported size_equals check", () => {
    // z.set().size() produces a size_equals check which the extractor does not handle yet
    const ir = extractSchema(z.set(z.string()).size(5)) as SetIR;
    expect(ir.type).toBe("set");
    expect(ir.checks).toBeUndefined();
  });

  it("recursively extracts inner value type", () => {
    const ir = extractSchema(z.set(z.object({ name: z.string() }))) as SetIR;
    expect(ir.type).toBe("set");
    expect(ir.valueType.type).toBe("object");
  });

  it("skips checks without _zod.def", () => {
    const ir = extractSet(
      {
        type: "set",
        checks: [{ _zod: undefined }],
        valueType: {},
      } as never,
      "test",
      undefined,
      () => ({ type: "string", checks: [] }),
    ) as SetIR;
    expect(ir.type).toBe("set");
    expect(ir.checks).toBeUndefined();
  });
});
