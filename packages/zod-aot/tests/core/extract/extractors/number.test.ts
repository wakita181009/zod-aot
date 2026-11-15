import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractSchema } from "#src/core/extract/index.js";
import type { FallbackIR, NumberIR } from "#src/core/types.js";
import { zodAtLeast } from "../../../zod-version.js";

/** A minimal schema object, for def shapes the public Zod API can't produce. */
const fakeSchema = (def: Record<string, unknown>) => ({ _zod: { def } });

describe("extractSchema — number checks", () => {
  it("extracts min (inclusive) check", () => {
    const ir = extractSchema(z.number().min(0)) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: true });
  });

  it("extracts max (inclusive) check", () => {
    const ir = extractSchema(z.number().max(100)) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "less_than", value: 100, inclusive: true });
  });

  it("extracts positive (exclusive > 0) check", () => {
    const ir = extractSchema(z.number().positive()) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: false });
  });

  it("extracts negative (exclusive < 0) check", () => {
    const ir = extractSchema(z.number().negative()) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "less_than", value: 0, inclusive: false });
  });

  it("extracts nonnegative (inclusive >= 0) check", () => {
    const ir = extractSchema(z.number().nonnegative()) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: true });
  });

  it("extracts nonpositive (inclusive <= 0) check", () => {
    const ir = extractSchema(z.number().nonpositive()) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "less_than", value: 0, inclusive: true });
  });

  it("extracts int (safeint format) check", () => {
    const ir = extractSchema(z.number().int()) as NumberIR;
    expect(ir.checks).toContainEqual(
      expect.objectContaining({ kind: "number_format", format: "safeint" }),
    );
  });

  it("extracts multipleOf check", () => {
    const ir = extractSchema(z.number().multipleOf(5)) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "multiple_of", value: 5 });
  });

  it("extracts int32 format check", () => {
    const ir = extractSchema(z.int32()) as NumberIR;
    expect(ir.checks).toContainEqual(
      expect.objectContaining({ kind: "number_format", format: "int32" }),
    );
  });

  it("extracts uint32 format check", () => {
    const ir = extractSchema(z.uint32()) as NumberIR;
    expect(ir.checks).toContainEqual(
      expect.objectContaining({ kind: "number_format", format: "uint32" }),
    );
  });

  it("extracts float32 format check", () => {
    const ir = extractSchema(z.float32()) as NumberIR;
    expect(ir.checks).toContainEqual(
      expect.objectContaining({ kind: "number_format", format: "float32" }),
    );
  });

  it("extracts float64 format check", () => {
    const ir = extractSchema(z.float64()) as NumberIR;
    expect(ir.checks).toContainEqual(
      expect.objectContaining({ kind: "number_format", format: "float64" }),
    );
  });

  it("extracts combined int + positive checks", () => {
    const ir = extractSchema(z.number().int().positive()) as NumberIR;
    expect(ir.checks).toContainEqual(
      expect.objectContaining({ kind: "number_format", format: "safeint" }),
    );
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: false });
  });

  it("extracts min + max range checks", () => {
    const ir = extractSchema(z.number().min(1).max(100)) as NumberIR;
    expect(ir.checks).toHaveLength(2);
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 1, inclusive: true });
    expect(ir.checks).toContainEqual({ kind: "less_than", value: 100, inclusive: true });
  });
});

describe("extractNumber — branch coverage", () => {
  it("extracts plain number with no checks", () => {
    const ir = extractSchema(z.number()) as NumberIR;
    expect(ir).toEqual({ type: "number", checks: [] });
  });

  it("extracts number with coerce", () => {
    const ir = extractSchema(z.coerce.number()) as NumberIR;
    expect(ir.type).toBe("number");
    expect(ir.coerce).toBe(true);
    expect(ir.checks).toEqual([]);
  });

  it("extracts coerce + checks combined", () => {
    const ir = extractSchema(z.coerce.number().min(0)) as NumberIR;
    expect(ir.coerce).toBe(true);
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: true });
  });

  it("falls back for number with non-compilable refine", () => {
    const captured = "external";
    const schema = z.number().refine((v) => String(v) === captured);
    const refs: { schema: unknown; accessPath: string }[] = [];
    const ir = extractSchema(schema, refs);
    expect(ir.type).toBe("fallback");
    expect((ir as FallbackIR).reason).toBe("refine");
  });

  it("treats a format schema's own def.check as its first check", () => {
    const ir = extractSchema(
      fakeSchema({ type: "number", check: "number_format", format: "int32", coerce: true }),
    ) as NumberIR;
    expect(ir.type).toBe("number");
    expect(ir.coerce).toBe(true);
    expect(ir.checks).toContainEqual(
      expect.objectContaining({ kind: "number_format", format: "int32" }),
    );
  });

  it("returns empty checks when def.checks is undefined or empty", () => {
    for (const checks of [undefined, []]) {
      expect(extractSchema(fakeSchema({ type: "number", checks }))).toEqual({
        type: "number",
        checks: [],
      });
    }
  });
});

describe("extractSchema — number format legacy probe", () => {
  // Zod < 4.3 omits `inclusive` on range issues and aborts on the range too_big.
  const legacy = !zodAtLeast("4.3");
  for (const [name, schema] of [
    ["int", z.int()],
    ["int32", z.int32()],
    ["uint32", z.uint32()],
    ["float32", z.float32()],
  ] as const) {
    it(`${name} legacy flag matches the installed Zod`, () => {
      const ir = extractSchema(schema) as NumberIR;
      expect(ir.checks[0]).toMatchObject({ kind: "number_format" });
      expect((ir.checks[0] as { legacy?: true }).legacy === true).toBe(legacy);
    });
  }

  it("float64 is never legacy", () => {
    const ir = extractSchema(z.float64()) as NumberIR;
    expect(ir.checks[0]).toEqual({ kind: "number_format", format: "float64" });
  });
});

describe("extractSchema — number format probe on the live check", () => {
  type Payload = { value: unknown; issues: Record<string, unknown>[] };
  const withCheck = (check: (p: Payload) => void) => ({
    _zod: { def: { type: "number", check: "number_format", format: "int32" }, check },
  });

  it("marks legacy when the range issue lacks inclusive/continue", () => {
    const ir = extractSchema(
      withCheck((p) => {
        p.issues.push({ code: "too_big" });
      }),
    ) as NumberIR;
    expect(ir.checks).toEqual([{ kind: "number_format", format: "int32", legacy: true }]);
  });

  it("is not legacy when the issue has inclusive and continue", () => {
    const ir = extractSchema(
      withCheck((p) => {
        p.issues.push({ code: "too_big", inclusive: true, continue: true });
      }),
    ) as NumberIR;
    expect(ir.checks).toEqual([{ kind: "number_format", format: "int32" }]);
  });

  it("is not legacy when the probe throws or reports nothing", () => {
    for (const check of [
      () => {
        throw new Error("boom");
      },
      () => undefined,
    ]) {
      expect((extractSchema(withCheck(check)) as NumberIR).checks).toEqual([
        { kind: "number_format", format: "int32" },
      ]);
    }
  });
});
