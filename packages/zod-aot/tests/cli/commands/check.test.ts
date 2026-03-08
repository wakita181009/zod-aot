import path from "node:path";
import { describe, expect, it } from "vitest";
import { hasFallback } from "#src/cli/fallback.js";
import { extractSchema } from "#src/core/extractor.js";
import { discoverSchemas } from "#src/discovery.js";

const fixturesDir = path.resolve(import.meta.dirname, "../../fixtures");

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

    for (const s of schemas) {
      const ir = extractSchema(s.schema);
      const reason = hasFallback(ir);
      expect(reason).not.toBeNull();
      expect(reason).toContain("transform");
    }
  });

  it("no-compile file has no schemas", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "no-compile.ts"));
    expect(schemas.length).toBe(0);
  });
});
