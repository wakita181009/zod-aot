import { describe, expect, it } from "vitest";
import { assertNever } from "#src/core/assert-never.js";

describe("assertNever", () => {
  it("throws with the unhandled value", () => {
    expect(() => assertNever({ kind: "nope" } as never)).toThrow(
      'zod-aot: unhandled case {"kind":"nope"}',
    );
  });
});
