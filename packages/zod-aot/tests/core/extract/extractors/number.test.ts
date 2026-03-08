import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractSchema } from "#src/core/extract/index.js";
import type { NumberIR } from "#src/core/types.js";

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

  it("extracts int (safeint format) check", () => {
    const ir = extractSchema(z.number().int()) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "number_format", format: "safeint" });
  });

  it("extracts multipleOf check", () => {
    const ir = extractSchema(z.number().multipleOf(5)) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "multiple_of", value: 5 });
  });

  it("extracts combined int + positive checks", () => {
    const ir = extractSchema(z.number().int().positive()) as NumberIR;
    expect(ir.checks).toContainEqual({ kind: "number_format", format: "safeint" });
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 0, inclusive: false });
  });

  it("extracts min + max range checks", () => {
    const ir = extractSchema(z.number().min(1).max(100)) as NumberIR;
    expect(ir.checks).toHaveLength(2);
    expect(ir.checks).toContainEqual({ kind: "greater_than", value: 1, inclusive: true });
    expect(ir.checks).toContainEqual({ kind: "less_than", value: 100, inclusive: true });
  });
});
