import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { FallbackEntry } from "#src/core/extract/index.js";
import { extractSchema } from "#src/core/extract/index.js";
import type { ArrayIR, FallbackIR, ObjectIR, OptionalIR, StringIR } from "#src/core/types.js";

// ─── Non-recursive lazy ─────────────────────────────────────────────────────

describe("extractSchema — lazy (non-recursive)", () => {
  it("resolves z.lazy(() => z.string()) to StringIR", () => {
    const ir = extractSchema(z.lazy(() => z.string()));
    expect(ir).toEqual<StringIR>({ type: "string", checks: [] });
  });

  it("resolves z.lazy(() => z.number()) to NumberIR", () => {
    const ir = extractSchema(z.lazy(() => z.number()));
    expect(ir.type).toBe("number");
  });

  it("resolves lazy wrapping an object schema", () => {
    const ir = extractSchema(z.lazy(() => z.object({ name: z.string() }))) as ObjectIR;
    expect(ir.type).toBe("object");
    expect(ir.properties["name"]?.type).toBe("string");
  });

  it("resolves nested lazy (lazy inside lazy)", () => {
    const ir = extractSchema(z.lazy(() => z.lazy(() => z.boolean())));
    expect(ir.type).toBe("boolean");
  });

  it("resolves lazy inside optional", () => {
    const ir = extractSchema(z.optional(z.lazy(() => z.string()))) as OptionalIR;
    expect(ir.type).toBe("optional");
    expect(ir.inner.type).toBe("string");
  });

  it("resolves lazy inside array", () => {
    const ir = extractSchema(z.array(z.lazy(() => z.number()))) as ArrayIR;
    expect(ir.type).toBe("array");
    expect(ir.element.type).toBe("number");
  });

  it("does not produce fallback entries for non-recursive lazy", () => {
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(
      z.lazy(() => z.string()),
      fallbacks,
    );
    expect(ir.type).toBe("string");
    expect(fallbacks).toHaveLength(0);
  });
});

// ─── Recursive lazy (cycle detection) ───────────────────────────────────────

describe("extractSchema — lazy (recursive / cycle detection)", () => {
  it("detects cycle in self-referencing tree node and falls back at recursion point", () => {
    const TreeNode: z.ZodType = z.object({
      value: z.string(),
      children: z.array(z.lazy(() => TreeNode)),
    });
    const ir = extractSchema(TreeNode) as ObjectIR;
    expect(ir.type).toBe("object");
    expect(ir.properties["value"]?.type).toBe("string");

    // children is an array whose element hits the cycle → fallback
    const childrenIR = ir.properties["children"] as ArrayIR;
    expect(childrenIR.type).toBe("array");
    expect(childrenIR.element.type).toBe("fallback");
    expect((childrenIR.element as FallbackIR).reason).toBe("lazy");
  });

  it("collects fallback entry for recursive reference point", () => {
    const TreeNode: z.ZodType = z.object({
      value: z.string(),
      children: z.array(z.lazy(() => TreeNode)),
    });
    const fallbacks: FallbackEntry[] = [];
    extractSchema(TreeNode, fallbacks);
    expect(fallbacks).toHaveLength(1);
    // The fallback schema should be the lazy wrapper's resolved schema (TreeNode itself)
    expect(fallbacks[0]?.schema).toBeDefined();
  });

  it("handles mutual recursion (A → lazy(B), B → lazy(A))", () => {
    const A: z.ZodType = z.object({
      b: z.lazy(() => B),
    });
    const B: z.ZodType = z.object({
      a: z.lazy(() => A),
    });
    const ir = extractSchema(A) as ObjectIR;
    expect(ir.type).toBe("object");

    // A.b resolves to B (object), but B.a hits cycle back to A → fallback
    const bIR = ir.properties["b"] as ObjectIR;
    expect(bIR.type).toBe("object");
    expect(bIR.properties["a"]?.type).toBe("fallback");
  });

  it("does not falsely detect cycle for DAG (same schema referenced from siblings)", () => {
    const Shared = z.object({ x: z.number() });
    const Parent = z.object({
      left: z.lazy(() => Shared),
      right: z.lazy(() => Shared),
    });
    const ir = extractSchema(Parent) as ObjectIR;
    // Both should resolve fully — no cycle
    expect((ir.properties["left"] as ObjectIR).type).toBe("object");
    expect((ir.properties["right"] as ObjectIR).type).toBe("object");
    expect((ir.properties["left"] as ObjectIR).properties["x"]?.type).toBe("number");
    expect((ir.properties["right"] as ObjectIR).properties["x"]?.type).toBe("number");
  });

  it("compiles non-recursive parts of a recursive schema", () => {
    const JsonValue: z.ZodType = z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(z.lazy(() => JsonValue)),
      z.record(
        z.string(),
        z.lazy(() => JsonValue),
      ),
    ]);
    const fallbacks: FallbackEntry[] = [];
    const ir = extractSchema(JsonValue, fallbacks);
    expect(ir.type).toBe("union");
    // Should have fallbacks only for the recursive references
    expect(fallbacks.length).toBeGreaterThan(0);
  });
});
