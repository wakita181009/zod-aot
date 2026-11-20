import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { generateFile } from "#src/cli/commands/generate.js";

// Inside the package so the generated file resolves zod and zod-aot.
const tmpRoot = fs.mkdtempSync(path.join(import.meta.dirname, ".tmp-typecheck-"));

afterAll(async () => {
  await fs.promises.rm(tmpRoot, { recursive: true, force: true });
});

const SHAPES = `
const min = 1;
const UserShape = z.object({
  name: z.string().min(1),
  tags: z.array(z.string()).default([]),
  age: z.number().refine((v) => v >= min),
});
const EventShape = z.discriminatedUnion("t", [
  z.object({ t: z.literal("a") }),
  z.object({ t: z.literal("b"), n: z.number() }),
]);
`;

const SOURCES = {
  compile: [
    'import { z } from "zod";',
    // Like the other fixtures: a bare "zod-aot" import needs a build to load.
    'import { compile } from "#src/core/compile.js";',
    SHAPES,
    "export const User = compile(UserShape);",
    "export const Event = compile(EventShape);",
  ].join("\n"),
  autoDiscover: [
    'import { z } from "zod";',
    SHAPES,
    "export const User = UserShape;",
    "export const Event = EventShape;",
  ].join("\n"),
};

const USAGE = `
import { Event, User } from "./schema.compiled";

const user = User.parse({});
export const name: string = user.name;
export const tags: string[] = user.tags;
// @ts-expect-error name is a string, so the export must not be typed any
export const wrong: number = user.name;

const event = Event.safeParse({});
export const kind: "a" | "b" | undefined = event.success ? event.data.t : undefined;
`;

const ZOD_API_USAGE = `
import { User } from "./schema.compiled";
export const shape = User.shape.name;
`;

// The strictest settings a consumer is likely to compile the output under.
// "source" resolves zod-aot to src/, so the check needs no prior build.
const COMPILER_OPTIONS = {
  strict: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noImplicitReturns: true,
  verbatimModuleSyntax: true,
  module: "esnext",
  moduleResolution: "bundler",
  target: "es2022",
  customConditions: ["source"],
  skipLibCheck: true,
  noEmit: true,
  types: [],
};

const require = createRequire(import.meta.url);
const tscBin = path.join(path.dirname(require.resolve("typescript/package.json")), "bin/tsc");

/** Runs tsc over `files`; returns its diagnostics, empty when the check passes. */
function typecheck(dir: string, files: string[]): string {
  const tsconfig = path.join(dir, "tsconfig.json");
  fs.writeFileSync(tsconfig, JSON.stringify({ compilerOptions: COMPILER_OPTIONS, files }));
  const run = spawnSync(process.execPath, [tscBin, "-p", tsconfig, "--pretty", "false"], {
    encoding: "utf8",
  });
  if (run.error) throw run.error;
  const output = `${run.stdout}${run.stderr}`.trim();
  // A tsc that exits non-zero without printing must not read as a pass.
  return run.status === 0 || output !== "" ? output : `tsc exited with status ${run.status}`;
}

describe("CLI TypeScript output under a strict tsconfig", () => {
  const cases = [
    { source: "compile", zodCompat: true },
    { source: "compile", zodCompat: false },
    { source: "autoDiscover", zodCompat: true },
    { source: "autoDiscover", zodCompat: false },
  ] as const;

  it.each(cases)(
    "typechecks with real export types ($source, zodCompat: $zodCompat)",
    async ({ source, zodCompat }) => {
      const dir = fs.mkdtempSync(path.join(tmpRoot, `${source}-${zodCompat}-`));
      const sourcePath = path.join(dir, "schema.ts");
      fs.writeFileSync(sourcePath, SOURCES[source]);
      const usagePath = path.join(dir, "usage.ts");
      fs.writeFileSync(usagePath, USAGE);
      const files = ["usage.ts"];
      if (zodCompat) {
        fs.writeFileSync(path.join(dir, "zod-api.ts"), ZOD_API_USAGE);
        files.push("zod-api.ts");
      }

      const result = await generateFile(sourcePath, path.join(dir, "schema.compiled.ts"), {
        zodCompat,
        autoDiscover: source === "autoDiscover",
      });
      expect(result?.schemaCount).toBe(2);

      expect(typecheck(dir, files)).toBe("");
    },
  );
});
