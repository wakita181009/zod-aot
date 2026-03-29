# zod-aot: Zod AOT Compiler

**Tagline:** "Compile Zod schemas into zero-overhead validation functions at build time."

## Runtime Compatibility

zod-aot runs on Node.js, Bun, and Deno. All runtimes are tested in CI.

| Runtime | Tested Versions |
|---------|----------------|
| Node.js | 20, 22, 24 |
| Bun | 1.3 |
| Deno | v2.x |

Zod compatibility: v4.0.0, v4.1.0, v4.2.0, v4.3.0, latest

## Architecture

### Compilation Pipeline

```
[Zod Schema (TS)] → Extract (_zod.def) → SchemaIR → CodeGen → [Optimized JS/TS functions]
```

1. **Discovery**: Detection of `compile()` calls or plain Zod schema exports (`autoDiscover` mode) in source files
2. **Extraction**: Execute schema file in Node.js → recursively traverse `_zod.def` → produce SchemaIR
3. **CodeGen**: SchemaIR → JS/TS code with Fast Path (boolean expression chain) + Slow Path (error collecting), inline type checks, early returns, pre-compiled regexes
4. **Emit**: Write generated code to files

### Shared Pipeline across CLI / unplugin / Benchmark

All three entry points use the same core pipeline: `compileSchemas()` (which calls `extractSchema()` → `generateValidator()` internally).

```
                CLI (generate)              unplugin                 Benchmark
                ──────────────              ────────                 ─────────
Discovery       discoverSchemas()           discoverSchemas()        (direct schema ref)
                  └─ loadSourceFile()          └─ loadSourceFile()
                  └─ isCompiledSchema()        └─ isCompiledSchema()
                         ↓                           ↓                   ↓
Compile         compileSchemas(schemas)     compileSchemas(schemas)  zodAot() vite plugin
(extract+codegen) └─ extractSchema()          └─ extractSchema()       └─ (same as unplugin)
                   └─ generateValidator()      └─ generateValidator()
                         ↓                           ↓                   ↓
Output          emitter.ts                  rewriteSource()          IIFE inline via unplugin
                .compiled.ts file           IIFE inline in source    (vitest runs vite plugins)
```

Key files:
- `core/compile.ts`: `compile()` is NOT the optimizer — it's a Zod fallback + `COMPILED_MARKER` symbol for discovery
- `core/pipeline.ts`: `compileSchemas()` — shared extract → generate pipeline, `CompiledSchemaInfo` type, `CompileSchemasOptions` with `onError` callback for graceful failure handling
- `core/diagnostic.ts`: `diagnoseSchema()` — single-pass SchemaIR walker producing `DiagnosticResult` (tree, coverage, Fast Path eligibility, hints)
- `core/codegen/fast-check/index.ts`: `generateFastCheck()` — Fast Path dispatcher + trivial inline cases
- `core/codegen/generators/index.ts`: `generateValidation()` — Slow Path dispatcher
- `core/codegen/emit.ts`: `emit()` — tagged template for Slow Path code generation
- `core/iife.ts`: `generateIIFE()` — shared IIFE generation for CLI emitter and unplugin transform (owns `extractFunctionName()`)
- `discovery.ts`: `discoverSchemas()` loads file → scans exports with `isCompiledSchema()` or `isZodSchema()` (autoDiscover mode via `DiscoverOptions`)
- `cli/commands/generate.ts`: discovery → `compileSchemas()` → `emitter.ts` writes `.compiled.ts`
- `cli/commands/check.ts`: discovery → `extractSchema()` → `diagnoseSchema()` → tree view / JSON output
- `unplugin/transform.ts`: discovery → `compileSchemas()` → `rewriteSource()` (compile mode) or `rewriteSourceAutoDiscover()` (autoDiscover mode) replaces schemas with IIFE, verbose logging + `BuildStats` tracking. Uses `acorn.parseExpressionAt()` for expression boundary detection in autoDiscover mode. Two-pass rewrite for mixed files (compile() + autoDiscover).
- `benchmarks/vitest.config.ts`: uses `zodAot()` vite plugin + `@typia/unplugin` for build-time compilation

The generated `safeParse_*` function is identical across all paths. Benchmark results accurately reflect CLI/unplugin output performance.

Note: CLI emitter (`emitter.ts`) does not include `schema` property in the output wrapper, unlike unplugin which retains the original Zod schema reference.

### Why Runtime Extraction

- Zod v4's `_zod.def` is JSON-serializable
- Static AST analysis cannot handle dynamic schemas (variable references, function calls)
- `_zod.bag` contains aggregated metadata from checks (minimum, maximum, patterns, etc.)
- Reliable detection of transform/refine

## Public API (`zod-aot`)

```typescript
import { z } from "zod";
import { compile } from "zod-aot";

const UserSchema = z.object({
  name: z.string().min(3),
  age: z.number().int().positive(),
  email: z.email(),
});

// compile() falls back to Zod in dev, uses generated functions after build
export const validateUser = compile(UserSchema);

// Usage (same interface as Zod)
const user = validateUser.parse(data);          // throws ZodError on failure
const result = validateUser.safeParse(data);    // { success, data/error }
```

Exports: `compile`, `isCompiledSchema`, types (`CompiledSchema`, `SafeParseResult`, `SafeParseError`, `SafeParseSuccess`, `ZodErrorLike`, `ZodIssueLike`, `ZodAotPluginOptions`)

### CLI

```bash
npx zod-aot generate src/schemas.ts -o src/schemas.compiled.ts
npx zod-aot generate src/ -o src/compiled/
npx zod-aot generate src/ --watch   # watch for changes and regenerate
npx zod-aot check src/schemas.ts    # diagnose with tree view, coverage, hints
npx zod-aot check src/schemas.ts --json --fail-under 80  # JSON output + CI gate
```

### unplugin (Vite / webpack / esbuild / Rollup / Rolldown / rspack)

Build-time plugin that replaces `compile()` calls with optimized inline validators.

```typescript
// vite.config.ts
import zodAot from "zod-aot/unplugin/vite";
export default { plugins: [zodAot()] };
```

Plugin entries: `zod-aot/vite`, `zod-aot/webpack`, `zod-aot/esbuild`, `zod-aot/rollup`, `zod-aot/rolldown`, `zod-aot/rspack`, `zod-aot/bun`

**Transform flow (compile mode):**
1. `shouldTransform(id)` — file extension check, skip `node_modules`/`.d.ts`/`.compiled.ts`
2. Quick bail-out: source must contain both `"zod-aot"` and `"compile"`
3. `discoverSchemas(id)` — execute file via `loadSourceFile()`, scan exports with `isCompiledSchema()`
4. `compileSchemas()` — shared extract → generate pipeline (`core/pipeline.ts`)
5. `rewriteSource()` — replace `compile(Schema)` with `/* @__PURE__ */ (() => { ... })()` IIFE
6. `removeCompileImport()` — remove `compile` from import statement

**Transform flow (autoDiscover mode):**
1. `shouldTransform(id)` — same file extension check
2. Quick bail-out: source must contain a runtime (non-type-only) `import` from `"zod"`
3. `discoverSchemas(id, { autoDiscover: true })` — execute file, scan exports with `isCompiledSchema()` (priority) then `isZodSchema()` (detects `_zod.def`)
4. `compileSchemas()` — same shared pipeline
5. Two-pass rewrite for mixed files: `rewriteSource()` for compile() schemas, `rewriteSourceAutoDiscover()` for plain Zod schemas
6. `rewriteSourceAutoDiscover()` — match `export const X = <expr>` (with type annotation support), use `acorn.parseExpressionAt()` for expression boundary, replace with IIFE

**Key implementation details:**
- `enforce: "pre"` — runs before other plugins
- `/* @__PURE__ */` annotation enables tree-shaking
- IIFE wraps preamble (regex/Set) + safeParse function + CompiledSchema object
- `loadSourceFile()` uses `jiti` on Node.js, native import on Bun/Deno
- `cacheBust: true` (`?t=${Date.now()}`) for HMR support
- Options: `include?: string[]`, `exclude?: string[]` (path substring matching), `zodCompat?: boolean`, `verbose?: boolean`, `autoDiscover?: boolean`
- `verbose: true` logs per-schema compilation status and build summary (`buildEnd`), resets stats each watch cycle
- `BuildStats` tracked in `transform.ts`: `{ files, schemas, optimized, failed }`
- `compileSchemas()` uses `onError` callback so a single schema failure doesn't abort the entire file

## Schema Coverage

string, number (int32, uint32, float32, float64), int, boolean, object, array, literal, enum, union, optional, nullable, null, undefined, tuple, record, intersection, discriminatedUnion, date, any, unknown, default, readonly, bigint, set, map, symbol, void, nan, never, pipe (non-transform), lazy (self-recursive via recursiveRef), templateLiteral, catch, coerce (string, number, boolean, bigint, date)

### Fallback to Zod
transform, refine, superRefine, custom, preprocess, lazy (non-recursive only — self-recursive lazy schemas are compiled via `recursiveRef`)

### Fast Path Eligibility
Schemas without coerce, default, catch, date, set/map, transform, or refine are eligible for Fast Path (two-phase validation). The Fast Path generates a single boolean `&&` expression chain. If any nested part of a schema is ineligible, the entire schema falls back to Slow Path only (all-or-nothing).

**Partial fallback strategy:** Even schemas containing transform etc. optimize compilable parts and delegate only incompilable parts to Zod.

## Project Structure

```
zod-aot/
├── packages/
│   └── zod-aot/                  # Main npm package (published as "zod-aot")
│       ├── src/
│       │   ├── index.ts          # Public API exports (zod-aot)
│       │   ├── discovery.ts      # discoverSchemas() — shared by cli & unplugin
│       │   ├── loader.ts         # loadSourceFile() — runtime-aware file loader
│       │   ├── core/             # Pure logic (no cli/unplugin/discovery/loader deps)
│       │   │   ├── types.ts      # SchemaIR, CompiledSchema, DiscoveredSchema
│       │   │   ├── compile.ts    # compile() marker + isCompiledSchema() + createFallback()
│       │   │   ├── diagnostic.ts # diagnoseSchema() → DiagnosticResult (tree, coverage, Fast Path, hints)
│       │   │   ├── pipeline.ts   # compileSchemas() — shared extract→generate pipeline, onError callback
│       │   │   ├── extract/      # extractSchema() — _zod.def → SchemaIR
│       │   │   │   ├── index.ts  # extractSchema() main entry
│       │   │   │   ├── checks.ts # Check extraction (string/number/bigint/date)
│       │   │   │   ├── fallback.ts # FallbackEntry tracking
│       │   │   │   ├── types.ts  # Extractor types
│       │   │   │   └── extractors/ # Per-type extractors (bigint, date, default, lazy (with cycle detection → recursiveRef), number, pipe, set, string, union)
│       │   │   └── codegen/
│       │   │       ├── index.ts  # generateValidator() — orchestrator (Fast Path + Slow Path)
│       │   │       ├── context.ts # CodeGenContext, CodeGenResult, GenerateFastCheckFn, checkPriority(), shared constants
│       │   │       ├── emit.ts   # emit() tagged template — Slow Path utility
│       │   │       ├── fast-check/ # Fast Path (per-type boolean expression generators)
│       │   │       │   ├── index.ts # generateFastCheck() dispatcher + trivial inline cases
│       │   │       │   └── string.ts, number.ts, ... # 16 per-type fast-check helpers
│       │   │       └── generators/ # Slow Path (per-type error-collecting code generators)
│       │   │           ├── index.ts # generateValidation() dispatcher
│       │   │           └── string.ts, number.ts, ... # 33 per-type generators
│       │   ├── cli/              # CLI-specific (no unplugin deps)
│       │   │   ├── index.ts      # CLI entry point (command parser, usage text)
│       │   │   ├── logger.ts     # Colored logging (info/success/warn/error/dim), TTY-aware
│       │   │   ├── emitter.ts    # .compiled.ts file generation
│       │   │   ├── errors.ts     # Error message utility
│       │   │   └── commands/
│       │   │       ├── generate.ts
│       │   │       ├── watch.ts
│       │   │       └── check.ts   # diagnose schemas: tree view, coverage %, Fast Path, hints, --json, --fail-under
│       │   └── unplugin/         # Build plugin (no cli deps)
│       │       ├── index.ts      # createUnplugin() factory
│       │       ├── transform.ts  # shouldTransform, transformCode, rewriteSource, rewriteSourceAutoDiscover, findExpressionEnd
│       │       ├── types.ts      # ZodAotPluginOptions (includes autoDiscover)
│       │       └── vite.ts, webpack.ts, esbuild.ts, rollup.ts, rolldown.ts, rspack.ts, bun.ts
│       ├── tests/                # Mirrors src/ structure
│       │   ├── integration.test.ts
│       │   ├── compat.test.ts
│       │   ├── discovery.test.ts
│       │   ├── fixtures/         # Shared test fixtures (simple-schema, multi-schema, etc.)
│       │   ├── core/
│       │   │   ├── types.test.ts, compile.test.ts
│       │   │   ├── diagnostic.test.ts  # diagnoseSchema() coverage, Fast Path, hints
│       │   │   ├── pipeline.test.ts    # compileSchemas() + onError
│       │   │   ├── extract/
│       │   │   │   ├── index.test.ts
│       │   │   │   └── extractors/*.test.ts
│       │   │   └── codegen/
│       │   │       ├── index.test.ts, helpers.ts
│       │   │       └── generators/*.test.ts
│       │   ├── cli/
│       │   │   ├── emitter.test.ts, logger.test.ts
│       │   │   └── commands/
│       │   │       └── check.test.ts, generate.test.ts, watch.test.ts
│       │   └── unplugin/
│       │       ├── transform.test.ts   # includes verbose/BuildStats tests
│       │       └── index.test.ts
│       ├── package.json
│       └── tsconfig.json
├── benchmarks/                   # Workspace package (@zod-aot/benchmarks) — 5-way comparison: zod v3 vs v4 vs zod-aot vs ajv vs typia
├── apps/
│   └── sample/                   # Vite + unplugin demo app
├── .github/workflows/
│   ├── ci.yml                    # Lint + typecheck + test + build
│   └── release.yml               # npm publish on tag push (v*)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
└── biome.json
```

### Module Dependency Rules (enforced by Biome `noRestrictedImports`)

```
core/  ←── cli/  (cli depends on core, not vice versa)
core/  ←── unplugin/
core/  ←── discovery.ts, loader.ts
cli/   ✗── unplugin/  (no cross-dependency)
unplugin/ ✗── cli/
```

Cross-module imports use `#src/` path alias (e.g., `#src/core/codegen/index.js`).
Within-module imports use relative paths.

## Key Reference Files (Zod v4 internals)

Source files to reference during implementation:
- `zod/src/v4/core/schemas.ts` — All schema type definitions, `$ZodTypeDef`, `$ZodObjectJIT` (codegen reference)
- `zod/src/v4/core/checks.ts` — All check type definitions
- `zod/src/v4/core/regexes.ts` — email/uuid/ip regex patterns
- `zod/src/v4/core/json-schema-processors.ts` — Per-schema-type processing patterns (extractor reference)

## Design Decisions

1. **Don't replace Zod** — Keep Zod's type inference and DX intact. Only accelerate hot paths
2. **Runtime extraction** — Execute schema files to get `_zod.def` rather than static AST analysis
3. **transform/refine out of scope** — JS closures cannot be compiled. Fall back to Zod
4. **Pre-compiled regex + Set for enums** — These optimizations create the performance gap
5. **Two-phase validation (Fast Path)** — For eligible schemas, generate a boolean `&&` chain that short-circuits on valid input with zero allocations. Falls back to Slow Path (error collecting) on failure. Schemas containing coerce/default/catch/date/set/map are not eligible.
6. **Check ordering** — Sort validation checks by cost: typeof → length → range → regex. Cheapest checks run first for earlier short-circuit.
7. **Small enum inlining** — Enums with 1-3 values use direct `===` comparisons instead of `Set.has()` for both Fast Path and Slow Path

## Development Tools

### Scripts

```bash
# Root (monorepo)
pnpm build          # tsc across all packages
pnpm test           # vitest run
pnpm bench          # vitest bench
pnpm check          # biome check .
pnpm check:fix      # biome check --fix .
pnpm format         # biome format --write .

# packages/zod-aot
pnpm -r typecheck   # tsc --noEmit
pnpm -r build       # tsc
```

### Biome (Linter & Formatter)

Config: `biome.json` (v2.4.8+)

Key rules:
- `noUnusedVariables`, `noUnusedImports`, `noUndeclaredVariables`: error
- `noExplicitAny`: error
- `useImportType`, `useExportType`: error
- `noFloatingPromises`, `noMisusedPromises`: error (nursery)
- `noRestrictedImports`: error (module boundary enforcement via overrides)
- `noConsole`: warn
- Formatter: 2-space indent, 100 line width, semicolons, trailing commas

### Claude Code Integration

- **`.claude/agents/checker.md`**: Type checking + Biome lint agent (`model: haiku`, read-only)
- **`.claude/settings.json`**: PostToolUse hook — auto-runs `pnpm -r typecheck` + `pnpm lint` after `.ts`/`.tsx` file edits
- **Plugin**: `typescript-lsp@claude-plugins-official` enabled

## CI/CD

- **CI** (`.github/workflows/ci.yml`): Runs on push to main and PRs. Lint → typecheck → build → test on Node 20/22/24, Bun 1.3, Deno v2.x. Also tests Zod v4.0.0–latest compatibility.
- **Release** (`.github/workflows/release-please.yml`): Triggered by push to main via [release-please](https://github.com/googleapis/release-please). Creates release PRs automatically, then publishes to npm with provenance on release creation.

## Verification

1. `pnpm test` — Vitest for extractor/codegen/integration tests
2. `pnpm bench` — vitest bench (zod v3 vs v4 vs zod-aot vs ajv vs typia, uses `benchmarks/vitest.config.ts`)
3. Integration test: schema → extract → generate → execute → compare results with Zod on same input
