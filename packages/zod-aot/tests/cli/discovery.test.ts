import path from "node:path";
import { describe, expect, it } from "vitest";
import { discoverSchemas } from "../../src/cli/discovery.js";

const fixturesDir = path.resolve(import.meta.dirname, "fixtures");

describe("discoverSchemas()", () => {
  it("discovers compile() calls in a simple schema file", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "simple-schema.ts"));

    expect(schemas).toHaveLength(1);
    expect(schemas[0]?.exportName).toBe("validateUser");
    expect(schemas[0]?.schema).toBeDefined();
  });

  it("discovers multiple compile() calls in a single file", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "multi-schema.ts"));

    expect(schemas).toHaveLength(2);
    const names = schemas.map((s) => s.exportName).sort();
    expect(names).toEqual(["validateProduct", "validateUser"]);
  });

  it("returns empty array when no compile() calls exist", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "no-compile.ts"));

    expect(schemas).toHaveLength(0);
  });

  it("discovers schemas with fallback types (transform)", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "with-fallback.ts"));

    expect(schemas).toHaveLength(1);
    expect(schemas[0]?.exportName).toBe("validateTransform");
  });
});
