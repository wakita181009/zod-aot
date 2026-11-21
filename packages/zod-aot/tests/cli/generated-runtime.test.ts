import fs from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { generateFile } from "#src/cli/commands/generate.js";
import { loadSourceFile } from "#src/loader.js";

// Inside the package so the generated file resolves zod.
const tmpRoot = fs.mkdtempSync(path.join(import.meta.dirname, ".tmp-runtime-"));

afterAll(async () => {
  await fs.promises.rm(tmpRoot, { recursive: true, force: true });
});

// The refine captures `min`, so it cannot be compiled and is kept as a
// fallback the generated code reads from the source schema.
const SHAPE = `
const min = 3;
const UserShape = z.object({
  name: z.string(),
  age: z.number().refine((v) => v >= min),
});
`;

const SOURCES = {
  compile: [
    'import { z } from "zod";',
    // Like the other fixtures: a bare "zod-aot" import needs a build to load.
    'import { compile } from "#src/core/compile.js";',
    SHAPE,
    "export const User = compile(UserShape);",
  ].join("\n"),
  autoDiscover: ['import { z } from "zod";', SHAPE, "export const User = UserShape;"].join("\n"),
};

interface LoadedValidator {
  safeParse(input: unknown): { success: boolean };
  shape?: Record<string, unknown>;
}

describe("CLI output at runtime", () => {
  const cases = [
    { source: "compile", zodCompat: true },
    { source: "compile", zodCompat: false },
    { source: "autoDiscover", zodCompat: true },
    { source: "autoDiscover", zodCompat: false },
  ] as const;

  it.each(cases)(
    "loads and validates with a fallback ($source, zodCompat: $zodCompat)",
    async ({ source, zodCompat }) => {
      const dir = fs.mkdtempSync(path.join(tmpRoot, `${source}-${zodCompat}-`));
      const sourcePath = path.join(dir, "schema.ts");
      fs.writeFileSync(sourcePath, SOURCES[source]);
      const outputPath = path.join(dir, "schema.compiled.ts");

      const result = await generateFile(sourcePath, outputPath, {
        zodCompat,
        autoDiscover: source === "autoDiscover",
      });
      expect(result?.schemaCount).toBe(1);

      const mod = await loadSourceFile(outputPath, { cacheBust: true });
      const User = mod["User"] as LoadedValidator;

      expect(Object.hasOwn(User, "safeParse")).toBe(true);
      expect(User.safeParse({ name: "a", age: 5 }).success).toBe(true);
      expect(User.safeParse({ name: "a", age: 1 }).success).toBe(false);
      // zodCompat puts the validator on the source schema's prototype chain.
      expect(User.shape?.["name"] !== undefined).toBe(zodCompat);
    },
  );
});
