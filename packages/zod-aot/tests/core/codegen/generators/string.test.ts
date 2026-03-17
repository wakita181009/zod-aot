import { describe, expect, it } from "vitest";
import { generateValidator } from "#src/core/codegen/index.js";
import type { StringIR } from "#src/core/types.js";
import { compileIR } from "../helpers.js";

describe("codegen — string", () => {
  it("generates code that accepts a string", () => {
    const ir: StringIR = { type: "string", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse("hello")).toEqual({ success: true, data: "hello" });
  });

  it("generates code that rejects non-string", () => {
    const ir: StringIR = { type: "string", checks: [] };
    const safeParse = compileIR(ir);
    const result = safeParse(42);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      code: "invalid_type",
      expected: "string",
    });
  });

  it("generates code that rejects null", () => {
    const ir: StringIR = { type: "string", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(null).success).toBe(false);
  });

  it("generates code that rejects undefined", () => {
    const ir: StringIR = { type: "string", checks: [] };
    const safeParse = compileIR(ir);
    expect(safeParse(undefined).success).toBe(false);
  });

  it("generates min_length check", () => {
    const ir: StringIR = { type: "string", checks: [{ kind: "min_length", minimum: 3 }] };
    const safeParse = compileIR(ir);
    expect(safeParse("abc").success).toBe(true);
    expect(safeParse("ab").success).toBe(false);
    expect(safeParse("").success).toBe(false);
  });

  it("generates max_length check", () => {
    const ir: StringIR = { type: "string", checks: [{ kind: "max_length", maximum: 5 }] };
    const safeParse = compileIR(ir);
    expect(safeParse("abcde").success).toBe(true);
    expect(safeParse("abcdef").success).toBe(false);
  });

  it("generates length_equals check", () => {
    const ir: StringIR = { type: "string", checks: [{ kind: "length_equals", length: 3 }] };
    const safeParse = compileIR(ir);
    expect(safeParse("abc").success).toBe(true);
    expect(safeParse("ab").success).toBe(false);
    expect(safeParse("abcd").success).toBe(false);
  });

  it("generates combined min + max check", () => {
    const ir: StringIR = {
      type: "string",
      checks: [
        { kind: "min_length", minimum: 2 },
        { kind: "max_length", maximum: 5 },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("ab").success).toBe(true);
    expect(safeParse("abcde").success).toBe(true);
    expect(safeParse("a").success).toBe(false);
    expect(safeParse("abcdef").success).toBe(false);
  });

  it("generates regex check", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "string_format", format: "regex", pattern: "^[a-z]+$" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("abc").success).toBe(true);
    expect(safeParse("ABC").success).toBe(false);
    expect(safeParse("abc123").success).toBe(false);
  });

  it("generates email format check", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "string_format", format: "email" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("user@example.com").success).toBe(true);
    expect(safeParse("not-an-email").success).toBe(false);
    expect(safeParse("").success).toBe(false);
  });

  it("collects multiple issues for min_length violation on string with checks", () => {
    const ir: StringIR = {
      type: "string",
      checks: [
        { kind: "min_length", minimum: 5 },
        { kind: "string_format", format: "regex", pattern: "^[A-Z]" },
      ],
    };
    const safeParse = compileIR(ir);
    const result = safeParse("ab");
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(1);
  });

  it("generates url format check", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "string_format", format: "url" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("https://example.com").success).toBe(true);
    expect(safeParse("http://localhost:3000/path").success).toBe(true);
    expect(safeParse("not-a-url").success).toBe(false);
    expect(safeParse("").success).toBe(false);
  });

  it("generates uuid format check", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "string_format", format: "uuid" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
    expect(safeParse("not-a-uuid").success).toBe(false);
    expect(safeParse("").success).toBe(false);
  });

  it("generates validation for unknown format with pattern", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "string_format", format: "custom_format", pattern: "^[0-9]+$" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("12345").success).toBe(true);
    expect(safeParse("abc").success).toBe(false);
  });

  it("skips unknown format without pattern", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "string_format", format: "unknown_format" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("anything").success).toBe(true);
    expect(safeParse("").success).toBe(true);
  });

  it("generates includes check", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "includes", includes: "foo" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("foobar").success).toBe(true);
    expect(safeParse("barfoo").success).toBe(true);
    expect(safeParse("bar").success).toBe(false);
    expect(safeParse("FOO").success).toBe(false);
  });

  it("generates includes check with position", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "includes", includes: "bar", position: 3 }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("foobar").success).toBe(true);
    expect(safeParse("foobaz").success).toBe(false);
    expect(safeParse("bar").success).toBe(false);
  });

  it("generates starts_with check", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "starts_with", prefix: "http" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("https://example.com").success).toBe(true);
    expect(safeParse("http://localhost").success).toBe(true);
    expect(safeParse("ftp://example.com").success).toBe(false);
    expect(safeParse("").success).toBe(false);
  });

  it("generates ends_with check", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "ends_with", suffix: ".ts" }],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("index.ts").success).toBe(true);
    expect(safeParse("main.ts").success).toBe(true);
    expect(safeParse("index.js").success).toBe(false);
    expect(safeParse("ts").success).toBe(false);
  });

  it("generates combined includes + starts_with + ends_with checks", () => {
    const ir: StringIR = {
      type: "string",
      checks: [
        { kind: "starts_with", prefix: "http" },
        { kind: "includes", includes: "example" },
        { kind: "ends_with", suffix: ".com" },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("https://example.com").success).toBe(true);
    expect(safeParse("ftp://example.com").success).toBe(false);
    expect(safeParse("https://other.com").success).toBe(false);
    expect(safeParse("https://example.org").success).toBe(false);
  });

  // H1: URL validation should not produce unused preamble variables (dead code)
  it("url format does not produce unused preamble variables", () => {
    const ir: StringIR = {
      type: "string",
      checks: [{ kind: "string_format", format: "url" }],
    };
    const { code } = generateValidator(ir, "urlTest");
    // The preamble should not contain a dead try-catch variable for URL
    // Currently produces: var __re_url_0;try{__re_url_0=true;}catch(e){__re_url_0=false;}
    // This is dead code since the try block never throws
    const preambleLines = code
      .split("\n")
      .filter((l) => l.trim() !== "" && l.trim() !== "/* zod-aot */");
    for (const line of preambleLines) {
      expect(line).not.toMatch(/try\{.*=true;\}catch/);
    }
  });

  // H1: URL format combined with other checks should still work correctly
  it("url format combined with other checks works correctly", () => {
    const ir: StringIR = {
      type: "string",
      checks: [
        { kind: "min_length", minimum: 10 },
        { kind: "string_format", format: "url" },
      ],
    };
    const safeParse = compileIR(ir);
    expect(safeParse("https://example.com").success).toBe(true);
    expect(safeParse("https://x.co").success).toBe(true);
    // Too short
    expect(safeParse("http://x").success).toBe(false);
    // Not a URL
    expect(safeParse("not-a-url-but-long-enough").success).toBe(false);
  });
});
