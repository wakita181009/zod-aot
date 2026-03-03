import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractSchema } from "#src/core/extractor.js";
import type { SchemaIR } from "#src/core/types.js";
import { discoverSchemas } from "#src/discovery.js";

const fixturesDir = path.resolve(import.meta.dirname, "fixtures");

function hasFallback(ir: SchemaIR): string | null {
  if (ir.type === "fallback") return ir.reason;
  if (ir.type === "object") {
    for (const [key, prop] of Object.entries(ir.properties)) {
      const reason = hasFallback(prop);
      if (reason) return `${reason} at .${key}`;
    }
  }
  if (ir.type === "array") return hasFallback(ir.element);
  if (ir.type === "optional" || ir.type === "nullable" || ir.type === "readonly") {
    return hasFallback(ir.inner);
  }
  if (ir.type === "union" || ir.type === "discriminatedUnion") {
    for (const opt of ir.options) {
      const reason = hasFallback(opt);
      if (reason) return reason;
    }
  }
  if (ir.type === "tuple") {
    for (const item of ir.items) {
      const reason = hasFallback(item);
      if (reason) return reason;
    }
  }
  if (ir.type === "record") return hasFallback(ir.keyType) ?? hasFallback(ir.valueType);
  if (ir.type === "intersection") return hasFallback(ir.left) ?? hasFallback(ir.right);
  return null;
}

describe("check (schema compilability)", () => {
  it("simple schema is fully compilable", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "simple-schema.ts"));

    for (const s of schemas) {
      const ir = extractSchema(s.schema);
      expect(hasFallback(ir)).toBeNull();
    }
  });

  it("multi schema is fully compilable", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "multi-schema.ts"));
    expect(schemas.length).toBe(2);

    for (const s of schemas) {
      const ir = extractSchema(s.schema);
      expect(hasFallback(ir)).toBeNull();
    }
  });

  it("transform schema has fallback", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "with-fallback.ts"));
    expect(schemas.length).toBe(1);

    const ir = extractSchema(schemas[0]!.schema);
    const reason = hasFallback(ir);
    expect(reason).not.toBeNull();
    expect(reason).toContain("transform");
  });

  it("no-compile file has no schemas", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "no-compile.ts"));
    expect(schemas.length).toBe(0);
  });
});
