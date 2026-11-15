import { describe, expect, it } from "vitest";
import type { ZodSchema } from "#src/core/extract/types.js";
import { zodAtLeast } from "#src/core/extract/zod-version.js";

function schemaAt(version?: { major: number; minor: number }): ZodSchema {
  return { _zod: { def: {} as ZodSchema["_zod"]["def"], ...(version ? { version } : {}) } };
}

describe("zodAtLeast", () => {
  it.each([
    [{ major: 4, minor: 4 }, 4, 4, true],
    [{ major: 4, minor: 6 }, 4, 4, true],
    [{ major: 5, minor: 0 }, 4, 9, true],
    [{ major: 4, minor: 3 }, 4, 4, false],
    [{ major: 3, minor: 25 }, 4, 0, false],
  ])("%o >= %d.%d → %s", (version, major, minor, expected) => {
    expect(zodAtLeast(schemaAt(version), major, minor)).toBe(expected);
  });

  it("is undefined when the schema carries no version", () => {
    expect(zodAtLeast(schemaAt(), 4, 0)).toBeUndefined();
  });
});
