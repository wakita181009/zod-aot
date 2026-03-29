import { describe, expect, it } from "vitest";
import { compileFastCheck } from "./helpers.js";

describe("fastCheckString", () => {
  it("plain string: accepts 'hello', rejects 42", () => {
    const fn = compileFastCheck({ type: "string", checks: [] });
    expect(fn?.("hello")).toBe(true);
    expect(fn?.(42)).toBe(false);
  });

  it("with coerce: returns null", () => {
    expect(compileFastCheck({ type: "string", checks: [], coerce: true })).toBeNull();
  });

  it("min_length: 'abc' passes, 'ab' fails for min 3", () => {
    const fn = compileFastCheck({ type: "string", checks: [{ kind: "min_length", minimum: 3 }] });
    expect(fn?.("abc")).toBe(true);
    expect(fn?.("ab")).toBe(false);
  });

  it("max_length: 'abcde' passes, 'abcdef' fails for max 5", () => {
    const fn = compileFastCheck({ type: "string", checks: [{ kind: "max_length", maximum: 5 }] });
    expect(fn?.("abcde")).toBe(true);
    expect(fn?.("abcdef")).toBe(false);
  });

  it("length_equals: exact length", () => {
    const fn = compileFastCheck({ type: "string", checks: [{ kind: "length_equals", length: 4 }] });
    expect(fn?.("abcd")).toBe(true);
    expect(fn?.("abc")).toBe(false);
  });

  it("includes: without position", () => {
    const fn = compileFastCheck({
      type: "string",
      checks: [{ kind: "includes", includes: "foo" }],
    });
    expect(fn?.("hello foo bar")).toBe(true);
    expect(fn?.("hello bar")).toBe(false);
  });

  it("includes: with position", () => {
    const fn = compileFastCheck({
      type: "string",
      checks: [{ kind: "includes", includes: "foo", position: 6 }],
    });
    expect(fn?.("hello foo")).toBe(true);
    expect(fn?.("foo hello")).toBe(false);
  });

  it("starts_with", () => {
    const fn = compileFastCheck({
      type: "string",
      checks: [{ kind: "starts_with", prefix: "hi" }],
    });
    expect(fn?.("hi there")).toBe(true);
    expect(fn?.("oh hi")).toBe(false);
  });

  it("ends_with", () => {
    const fn = compileFastCheck({
      type: "string",
      checks: [{ kind: "ends_with", suffix: "!" }],
    });
    expect(fn?.("hello!")).toBe(true);
    expect(fn?.("hello")).toBe(false);
  });

  it("string_format email: valid/invalid", () => {
    const fn = compileFastCheck({
      type: "string",
      checks: [{ kind: "string_format", format: "email" }],
    });
    expect(fn?.("user@example.com")).toBe(true);
    expect(fn?.("not-an-email")).toBe(false);
  });

  it("string_format url: returns null", () => {
    expect(
      compileFastCheck({
        type: "string",
        checks: [{ kind: "string_format", format: "url" }],
      }),
    ).toBeNull();
  });

  it("string_format uuid: valid/invalid", () => {
    const fn = compileFastCheck({
      type: "string",
      checks: [{ kind: "string_format", format: "uuid" }],
    });
    expect(fn?.("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(fn?.("not-a-uuid")).toBe(false);
  });

  it("string_format regex: matches/doesn't match", () => {
    const fn = compileFastCheck({
      type: "string",
      checks: [{ kind: "string_format", format: "regex", pattern: "^\\d+$" }],
    });
    expect(fn?.("12345")).toBe(true);
    expect(fn?.("abc")).toBe(false);
  });

  it("string_format uuid with custom pattern", () => {
    const fn = compileFastCheck({
      type: "string",
      checks: [
        {
          kind: "string_format",
          format: "uuid",
          pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        },
      ],
    });
    expect(fn?.("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(fn?.("not-a-uuid")).toBe(false);
  });

  it("non-regex format with pattern: uses pattern as regex", () => {
    const fn = compileFastCheck({
      type: "string",
      checks: [{ kind: "string_format", format: "ipv4", pattern: "^\\d+\\.\\d+\\.\\d+\\.\\d+$" }],
    });
    expect(fn?.("192.168.1.1")).toBe(true);
    expect(fn?.("not-an-ip")).toBe(false);
  });

  it("unknown format without pattern: returns null", () => {
    expect(
      compileFastCheck({
        type: "string",
        checks: [{ kind: "string_format", format: "custom_unknown" }],
      }),
    ).toBeNull();
  });
});
