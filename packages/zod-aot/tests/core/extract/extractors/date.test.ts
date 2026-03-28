import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractDate } from "#src/core/extract/extractors/date.js";
import { extractSchema } from "#src/core/extract/index.js";
import type { DateIR } from "#src/core/types.js";

describe("extractSchema — date", () => {
  it("extracts plain date", () => {
    const ir = extractSchema(z.date());
    expect(ir).toEqual<DateIR>({ type: "date", checks: [] });
  });

  it("extracts date with min check", () => {
    const minDate = new Date("2020-01-01T00:00:00.000Z");
    const ir = extractSchema(z.date().min(minDate)) as DateIR;
    expect(ir.type).toBe("date");
    expect(ir.checks).toHaveLength(1);
    expect(ir.checks[0]?.kind).toBe("date_greater_than");
    expect(ir.checks[0]).toMatchObject({ inclusive: true });
  });

  it("extracts date with max check", () => {
    const maxDate = new Date("2030-01-01T00:00:00.000Z");
    const ir = extractSchema(z.date().max(maxDate)) as DateIR;
    expect(ir.type).toBe("date");
    expect(ir.checks).toHaveLength(1);
    expect(ir.checks[0]?.kind).toBe("date_less_than");
    expect(ir.checks[0]).toMatchObject({ inclusive: true });
  });

  it("extracts date with both min and max", () => {
    const ir = extractSchema(
      z.date().min(new Date("2020-01-01")).max(new Date("2030-01-01")),
    ) as DateIR;
    expect(ir.checks).toHaveLength(2);
  });

  // H2: Date checks should not produce NaN timestamps
  it("extracted date check timestamps are never NaN", () => {
    const minDate = new Date("2020-01-01T00:00:00.000Z");
    const maxDate = new Date("2030-12-31T23:59:59.999Z");
    const ir = extractSchema(z.date().min(minDate).max(maxDate)) as DateIR;
    for (const check of ir.checks) {
      expect(Number.isNaN(check.timestamp)).toBe(false);
    }
  });

  it("skips checks without _zod.def", () => {
    const ir = extractDate({
      type: "date",
      checks: [{ _zod: undefined }],
    } as never) as DateIR;
    expect(ir).toEqual({ type: "date", checks: [] });
  });

  it("skips greater_than check with NaN timestamp", () => {
    const ir = extractDate({
      type: "date",
      checks: [
        { _zod: { def: { check: "greater_than", value: "invalid-date", inclusive: true } } },
      ],
    } as never) as DateIR;
    expect(ir).toEqual({ type: "date", checks: [] });
  });

  it("skips less_than check with NaN timestamp", () => {
    const ir = extractDate({
      type: "date",
      checks: [{ _zod: { def: { check: "less_than", value: "invalid-date", inclusive: true } } }],
    } as never) as DateIR;
    expect(ir).toEqual({ type: "date", checks: [] });
  });

  it("extracts coerce flag", () => {
    const ir = extractSchema(z.coerce.date()) as DateIR;
    expect(ir.type).toBe("date");
    expect(ir.coerce).toBe(true);
  });

  it("skips unrecognized check types", () => {
    const ir = extractDate({
      type: "date",
      checks: [{ _zod: { def: { check: "unknown_check" } } }],
    } as never) as DateIR;
    expect(ir).toEqual({ type: "date", checks: [] });
  });
});
