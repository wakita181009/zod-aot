import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractSchema } from "#src/core/extract/index.js";
import type { SetIR } from "#src/core/types.js";

/** A minimal schema object, for def shapes the public Zod API can't produce. */
const fakeSchema = (def: Record<string, unknown>) => ({ _zod: { def } });

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

  it("falls back on unsupported size_equals check", () => {
    const ir = extractSchema(z.set(z.string()).size(5));
    expect(ir).toMatchObject({ type: "fallback", reason: "unsupported" });
  });

  it("recursively extracts inner value type", () => {
    const ir = extractSchema(z.set(z.array(z.string()))) as SetIR;
    expect(ir.type).toBe("set");
    expect(ir.valueType.type).toBe("array");
  });

  it("falls back for a set of objects, whose elements are rebuilt", () => {
    const ir = extractSchema(z.set(z.object({ name: z.string() })));
    expect(ir).toMatchObject({ type: "fallback", reason: "unsupported" });
  });

  it("skips checks without _zod.def", () => {
    const ir = extractSchema(
      fakeSchema({ type: "set", checks: [{ _zod: undefined }], valueType: z.string() }),
    ) as SetIR;
    expect(ir.type).toBe("set");
    expect(ir.checks).toBeUndefined();
  });
});
