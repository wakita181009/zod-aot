import { describe, expect, it } from "vitest";
import type { DateIR } from "#src/types.js";
import { compileIR } from "./helpers.js";

describe("codegen — date", () => {
  it("accepts Date objects", () => {
    const ir: DateIR = { type: "date", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(new Date()).success).toBe(true);
    expect(safeParse(new Date("2024-01-01")).success).toBe(true);
  });

  it("rejects non-Date values", () => {
    const ir: DateIR = { type: "date", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse("2024-01-01").success).toBe(false);
    expect(safeParse(123).success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse(undefined).success).toBe(false);
  });

  it("rejects Invalid Date", () => {
    const ir: DateIR = { type: "date", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(new Date("invalid")).success).toBe(false);
  });

  it("validates min date check", () => {
    const minTs = new Date("2020-01-01T00:00:00.000Z").getTime();
    const ir: DateIR = {
      type: "date",
      checks: [
        {
          kind: "date_greater_than",
          value: "2020-01-01T00:00:00.000Z",
          timestamp: minTs,
          inclusive: true,
        },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(new Date("2020-01-01T00:00:00.000Z")).success).toBe(true);
    expect(safeParse(new Date("2025-01-01")).success).toBe(true);
    expect(safeParse(new Date("2019-12-31")).success).toBe(false);
  });

  it("validates max date check", () => {
    const maxTs = new Date("2030-01-01T00:00:00.000Z").getTime();
    const ir: DateIR = {
      type: "date",
      checks: [
        {
          kind: "date_less_than",
          value: "2030-01-01T00:00:00.000Z",
          timestamp: maxTs,
          inclusive: true,
        },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(new Date("2030-01-01T00:00:00.000Z")).success).toBe(true);
    expect(safeParse(new Date("2025-01-01")).success).toBe(true);
    expect(safeParse(new Date("2030-01-02")).success).toBe(false);
  });

  it("validates min date check with exclusive (inclusive: false)", () => {
    const minTs = new Date("2020-01-01T00:00:00.000Z").getTime();
    const ir: DateIR = {
      type: "date",
      checks: [
        {
          kind: "date_greater_than",
          value: "2020-01-01T00:00:00.000Z",
          timestamp: minTs,
          inclusive: false,
        },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(new Date("2020-01-01T00:00:00.001Z")).success).toBe(true);
    expect(safeParse(new Date("2025-01-01")).success).toBe(true);
    expect(safeParse(new Date("2020-01-01T00:00:00.000Z")).success).toBe(false);
    expect(safeParse(new Date("2019-12-31")).success).toBe(false);
  });

  it("validates max date check with exclusive (inclusive: false)", () => {
    const maxTs = new Date("2030-01-01T00:00:00.000Z").getTime();
    const ir: DateIR = {
      type: "date",
      checks: [
        {
          kind: "date_less_than",
          value: "2030-01-01T00:00:00.000Z",
          timestamp: maxTs,
          inclusive: false,
        },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse(new Date("2029-12-31T23:59:59.999Z")).success).toBe(true);
    expect(safeParse(new Date("2025-01-01")).success).toBe(true);
    expect(safeParse(new Date("2030-01-01T00:00:00.000Z")).success).toBe(false);
    expect(safeParse(new Date("2030-01-02")).success).toBe(false);
  });
});
