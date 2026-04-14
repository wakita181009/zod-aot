import { describe, expect, it } from "vitest";
import type { FileIR } from "#src/core/types.js";
import { compileFastCheck, compileIR } from "../helpers.js";

describe("slow-path — file", () => {
  it("accepts File instances", () => {
    const ir: FileIR = { type: "file" };
    const safeParse = compileIR(ir);
    const file = new File(["hello"], "test.txt", { type: "text/plain" });
    expect(safeParse(file).success).toBe(true);
  });

  it("rejects non-File values", () => {
    const ir: FileIR = { type: "file" };
    const safeParse = compileIR(ir);
    expect(safeParse("hello").success).toBe(false);
    expect(safeParse(42).success).toBe(false);
    expect(safeParse(null).success).toBe(false);
    expect(safeParse(undefined).success).toBe(false);
    expect(safeParse({}).success).toBe(false);
  });

  it("validates min size", () => {
    const ir: FileIR = { type: "file", checks: [{ kind: "min_size", minimum: 10 }] };
    const safeParse = compileIR(ir);
    const small = new File(["hi"], "small.txt");
    const large = new File(["a".repeat(20)], "large.txt");
    expect(safeParse(small).success).toBe(false);
    expect(safeParse(large).success).toBe(true);
  });

  it("validates max size", () => {
    const ir: FileIR = { type: "file", checks: [{ kind: "max_size", maximum: 5 }] };
    const safeParse = compileIR(ir);
    const small = new File(["hi"], "small.txt");
    const large = new File(["a".repeat(20)], "large.txt");
    expect(safeParse(small).success).toBe(true);
    expect(safeParse(large).success).toBe(false);
  });

  it("validates mime type", () => {
    const ir: FileIR = { type: "file", checks: [{ kind: "mime_type", mime: ["image/png"] }] };
    const safeParse = compileIR(ir);
    const png = new File(["data"], "img.png", { type: "image/png" });
    const txt = new File(["data"], "doc.txt", { type: "text/plain" });
    expect(safeParse(png).success).toBe(true);
    expect(safeParse(txt).success).toBe(false);
  });

  it("validates multiple mime types", () => {
    const ir: FileIR = {
      type: "file",
      checks: [{ kind: "mime_type", mime: ["image/png", "image/jpeg"] }],
    };
    const safeParse = compileIR(ir);
    const png = new File(["data"], "img.png", { type: "image/png" });
    const jpg = new File(["data"], "img.jpg", { type: "image/jpeg" });
    const txt = new File(["data"], "doc.txt", { type: "text/plain" });
    expect(safeParse(png).success).toBe(true);
    expect(safeParse(jpg).success).toBe(true);
    expect(safeParse(txt).success).toBe(false);
  });

  it("validates combined checks", () => {
    const ir: FileIR = {
      type: "file",
      checks: [
        { kind: "min_size", minimum: 1 },
        { kind: "max_size", maximum: 1000 },
        { kind: "mime_type", mime: ["text/plain"] },
      ],
    };
    const safeParse = compileIR(ir);
    const valid = new File(["hello"], "test.txt", { type: "text/plain" });
    const wrongType = new File(["hello"], "test.png", { type: "image/png" });
    expect(safeParse(valid).success).toBe(true);
    expect(safeParse(wrongType).success).toBe(false);
  });
});

describe("fast-path — file", () => {
  it("plain file: instanceof check", () => {
    const fn = compileFastCheck({ type: "file" });
    expect(fn).not.toBeNull();
    const file = new File(["hello"], "test.txt");
    expect(fn?.(file)).toBe(true);
    expect(fn?.("hello")).toBe(false);
    expect(fn?.(null)).toBe(false);
  });

  it("file with size checks", () => {
    const fn = compileFastCheck({
      type: "file",
      checks: [
        { kind: "min_size", minimum: 3 },
        { kind: "max_size", maximum: 100 },
      ],
    });
    expect(fn).not.toBeNull();
    const small = new File(["h"], "s.txt");
    const ok = new File(["hello"], "ok.txt");
    expect(fn?.(small)).toBe(false);
    expect(fn?.(ok)).toBe(true);
  });

  it("file with single mime check", () => {
    const fn = compileFastCheck({
      type: "file",
      checks: [{ kind: "mime_type", mime: ["image/png"] }],
    });
    expect(fn).not.toBeNull();
    const png = new File(["data"], "img.png", { type: "image/png" });
    const txt = new File(["data"], "doc.txt", { type: "text/plain" });
    expect(fn?.(png)).toBe(true);
    expect(fn?.(txt)).toBe(false);
  });

  it("file with multiple mime types (Set path)", () => {
    const fn = compileFastCheck({
      type: "file",
      checks: [{ kind: "mime_type", mime: ["image/png", "image/jpeg", "image/webp"] }],
    });
    expect(fn).not.toBeNull();
    const png = new File(["data"], "img.png", { type: "image/png" });
    const jpg = new File(["data"], "img.jpg", { type: "image/jpeg" });
    const txt = new File(["data"], "doc.txt", { type: "text/plain" });
    expect(fn?.(png)).toBe(true);
    expect(fn?.(jpg)).toBe(true);
    expect(fn?.(txt)).toBe(false);
  });
});
