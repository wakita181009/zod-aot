# zod-aot: Zod AOT Compiler

**Tagline:** "Compile Zod schemas into zero-overhead validation functions at build time."

## Runtime Compatibility

zod-aot runs on Node.js, Bun, and Deno. All runtimes are tested in CI.

| Runtime | Tested Versions |
|---------|----------------|
| Node.js | 22, 24 |
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
- `core/compile.ts`: `compile()` is NOT the optimizer — it's a Zod fallback + `COMPILED_MARKER` symbol for discovery. `createFallback()` retains an own-property `.schema` reference for CLI emitter use
- `core/pipeline.ts`: `compileSchemas()` — shared extract → generate pipeline, `CompiledSchemaInfo` type, `CompileSchemasOptions` with `mode: "inline" | "lean"` and `onError` callback for graceful failure handling, `aggregateUsedHelpers()` collects per-file helper imports
- `core/diagnostic.ts`: `diagnoseSchema()` — single-pass SchemaIR walker producing `DiagnosticResult` (tree, coverage, Fast Path eligibility, hints)
- `core/codegen/fast-path.ts`: `generateFast()` — Fast Path dispatcher + typed `fastRegistry` with `FastGen` context
- `core/codegen/slow-path.ts`: `generateSlow()` — Slow Path dispatcher + typed `slowRegistry` with `SlowGen` context
- `core/codegen/schemas/effect.ts`: `slowEffect()` — transform effect codegen, `refineCheck()` — inline refine check codegen
- `core/codegen/context.ts`: `SlowGen`/`FastGen` context interfaces, `SlowGenerator`/`FastGenerator` function types, `CodeGenContext` (with `mode` + `usedHelpers`), `CodeGenResult` (with `usedHelpers: Set<string>`), `CodegenMode = "inline" | "lean"`, `sortChecksPreservingEffects()`, `hasMutation()`, `emitRegex()` (lean-mode well-known regex shortcut), shared constants
- `core/codegen/emit.ts`: `emit()` — tagged template for Slow Path code generation
- `core/codegen/emit-issue.ts`: `tooSmall()`/`tooBig()`/`invalidType()`/`invalidFormat()`/`invalidValue()` — issue emission helpers that branch on `ctx.mode`: inline emits `{code:"too_small",...}` literals, lean emits factory calls (`__zaTS(...)`) and registers helpers in `ctx.usedHelpers`
- `core/codegen/issue-decls.ts`: `ISSUE_DECLS` registry — issue factory function bodies (`__zaTS`/`__zaTSx`/`__zaTB`/`__zaTBx`/`__zaIT`/`__zaIF`/`__zaIV`) hosted in the virtual module
- `core/codegen/well-known-regex.ts`: `WELL_KNOWN_REGEXES` registry — bundle-wide dedup-eligible regex sources (email, uuid, cuid, cuid2, ulid, nanoid, xid, ksuid, ipv4, ipv6, base64, base64url, e164, guid). `lookupWellKnownRegex(source)` returns the virtual export name or null
- `core/iife.ts`: `generateIIFE()` — shared IIFE generation for CLI emitter and unplugin transform. `MK_VALIDATOR_DECL` (the `__mkv` factory: `Object.create(schema)`-based wrapper with `parse`/`safeParse`/`parseAsync`/`safeParseAsync`), `FIN_DECL` (the `__fin` finalizer: applies `__msg`, strips `input`, builds `SafeParseResult`), `ZOD_CONFIG_IMPORT`, `ZOD_MSG_DECLARATION`
- `discovery.ts`: `discoverSchemas()` loads file → scans exports with `isCompiledSchema()` or `isZodSchema()` (autoDiscover mode via `DiscoverOptions`)
- `cli/commands/generate.ts`: discovery → `compileSchemas({ mode: "inline" })` → `emitter.ts` writes `.compiled.ts` with file-level `__mkv`/`__fin` declarations
- `cli/commands/check.ts`: discovery → `extractSchema()` → `diagnoseSchema()` → tree view / JSON output
- `unplugin/transform.ts`: discovery → `compileSchemas({ mode })` → `rewriteSource()` (compile mode) or `rewriteSourceAutoDiscover()` (autoDiscover mode) replaces schemas with IIFE, then `injectRuntime()` prepends `import { __mkv, __fin, ... } from "virtual:zod-aot/runtime"` (lean) or file-level `function __mkv(...)`/`function __fin(...)` declarations (inline). Verbose logging + `BuildStats` tracking. Uses `acorn.parseExpressionAt()` for expression boundary detection in autoDiscover mode. Two-pass rewrite for mixed files (compile() + autoDiscover)
- `unplugin/virtual.ts`: `resolveVirtualId()`/`loadVirtual()` for the `virtual:zod-aot/runtime` module. Source built once at load time from `MK_VALIDATOR_DECL` + `FIN_DECL` + `ISSUE_DECLS` + `WELL_KNOWN_REGEXES` as `export function __mkv(...)` / `export const __zaReEmail=new RegExp(...)`. `ALL_HELPER_NAMES` lists every helper for tooling
- `unplugin/index.ts`: `createUnplugin()` factory. Selects `mode = "lean"` for frameworks in `VIRTUAL_MODULE_FRAMEWORKS = {vite, rollup, rolldown, esbuild, farm, bun}`, `"inline"` for webpack/rspack (which reject the `virtual:` URI scheme)
- `benchmarks/vitest.config.ts`: uses `zodAot()` vite plugin + `@typia/unplugin` for build-time compilation. `benchmarks/suites/size/cli.ts` measures per-schema CLI emitter output (`pnpm size:cli`), `benchmarks/suites/size/unplugin.ts` builds a 5-file Vite bundle to verify cross-file dedup probes (each well-known regex / `__mkv` must appear exactly once, `pnpm size:unplugin`)

The generated `safeParse_*` function is identical across all paths. Benchmark results accurately reflect CLI/unplugin output performance.

### Codegen Modes (`inline` vs `lean`)

`generateValidator()` accepts a `mode` option that controls how runtime helpers and issue objects are referenced. The IIFE structure (preamble + `safeParse_*` function + `return __mkv(...)`) is identical between modes; only the helper sourcing differs.

| | `inline` (CLI / webpack / rspack) | `lean` (Vite / Rollup / Rolldown / esbuild / Farm / Bun) |
|---|---|---|
| `__mkv` / `__fin` | declared once at file top | imported from `virtual:zod-aot/runtime` |
| Issue objects | `{code:"too_small",minimum,...}` literal at each check site | `__zaTS(min, origin, inclusive, input, path)` factory call |
| Well-known regexes | `var __re_email_N=new RegExp(...)` per IIFE | `__zaReEmail` import (one bundle-wide copy) |
| `usedHelpers` tracking | always empty | populated as codegen walks the IR |
| Cross-file dedup | none — every file is self-contained | bundler-level — single shared module |

Mode selection: CLI always uses `"inline"`. unplugin auto-selects per `meta.framework` (lean for virtual-module-friendly bundlers, inline for webpack/rspack).

Note: The CLI emitter (`emitter.ts`) uses `(__src_X as any).schema` to pass the original Zod schema into `__mkv`. `compile()`-wrapped schemas have a runtime own-property `.schema` set by `createFallback()`; plain Zod schemas (autoDiscover CLI) don't, so `__mkv(fn, undefined)` returns a plain `{parse, safeParse, ...}` object without the prototype chain.

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

### unplugin (Vite / webpack / esbuild / Rollup / Rolldown / rspack / Farm / Bun)

Build-time plugin that replaces `compile()` calls with optimized inline validators.

```typescript
// vite.config.ts
import zodAot from "zod-aot/vite";
export default { plugins: [zodAot()] };
```

Plugin entries: `zod-aot/vite`, `zod-aot/webpack`, `zod-aot/esbuild`, `zod-aot/rollup`, `zod-aot/rolldown`, `zod-aot/rspack`, `zod-aot/bun`, `zod-aot/farm`

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
- IIFE wraps preamble (regex/Set) + safeParse function + `return __mkv(safeParse_*, schemaArg)` call
- `loadSourceFile()` uses `jiti` on Node.js, native import on Bun/Deno
- `cacheBust: true` (`?t=${Date.now()}`) for HMR support
- Options: `include?: string[]`, `exclude?: string[]` (path substring matching), `zodCompat?: boolean`, `verbose?: boolean`, `autoDiscover?: boolean`
- `verbose: true` logs per-schema compilation status and build summary (`buildEnd`), resets stats each watch cycle
- `BuildStats` tracked in `transform.ts`: `{ files, schemas, optimized, failed }`
- `compileSchemas()` uses `onError` callback so a single schema failure doesn't abort the entire file
- `injectRuntime()` prepends helpers exactly once per file: a single `import { __mkv, __fin, __zaTS, __zaReEmail, ... } from "virtual:zod-aot/runtime"` line in lean mode, or file-level `function __mkv(...)`/`function __fin(...)` declarations in inline mode (idempotent — re-runs during HMR skip re-injection if markers already present)
- `aggregateUsedHelpers()` collects every helper referenced by the file's compiled schemas; `__mkv` and `__fin` are always added since every IIFE calls them

## Schema Coverage

string, number (int32, uint32, float32, float64), int, boolean, object, array, literal, enum, union, optional, nullable, null, undefined, tuple, record, intersection, discriminatedUnion, date, any, unknown, default, readonly, bigint, set, map, symbol, void, nan, never, pipe (non-transform), lazy (self-recursive via recursiveRef), templateLiteral, catch, coerce (string, number, boolean, bigint, date)

### Effect Compilation (transform/refine)
Zero-capture `.transform()` and `.refine()` (inline arrow functions with no external variable captures) are compiled into generated validators via `fn.toString()` + acorn AST analysis. The compiled code inlines the function call directly (e.g., `outputExpr = (v => v.toLowerCase())(inputExpr)`).

- `TransformEffectIR`: wraps inner schema validation + inlined transform function call
- `RefineEffectCheckIR`: inserted into `checks[]` arrays preserving Zod check ordering
- `sortChecksPreservingEffects()`: reorders compilable checks by cost while keeping refine_effect entries at their original position
- Zero-capture detection: acorn parses `fn.toString()`, collects identifier references, rejects functions with external captures, async, `this`, or 2+ parameters (ctx argument)
- Key files: `core/extract/effects.ts` (tryCompileEffect), `core/codegen/schemas/effect.ts` (slowEffect, refineCheck)

### Fallback to Zod
superRefine, custom, preprocess, lazy (non-recursive only — self-recursive lazy schemas are compiled via `recursiveRef`), transform/refine with external variable captures or ctx parameter

### Fast Path Eligibility
Schemas without coerce, default, catch, effect (transform), or fallback are eligible for Fast Path (two-phase validation). The Fast Path generates a single boolean `&&` expression chain. If any nested part of a schema is ineligible, the entire schema falls back to Slow Path only (all-or-nothing).

**Fast Path supported types:** date (non-coerce: `instanceof Date && !isNaN(getTime()) && range checks`), set (`instanceof Set + size checks + preamble helper for element iteration`), map (`instanceof Map + preamble helper for key/value iteration`), and refine_effect (zero-capture refine predicates inlined as `(source)(input)` in the `&&` chain).

**Partial fallback strategy:** Even schemas containing captured-variable transform etc. optimize compilable parts and delegate only incompilable parts to Zod.

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
│       │   │   │   ├── checks.ts # Check extraction (string/number/bigint/date), refine effect compilation
│       │   │   │   ├── effects.ts # tryCompileEffect() — fn.toString() + acorn capture classification
│       │   │   │   ├── fallback.ts # FallbackEntry tracking
│       │   │   │   ├── types.ts  # Extractor types
│       │   │   │   └── extractors/ # Per-type extractors (bigint, date, default, lazy (with cycle detection → recursiveRef), number, pipe, set, string, union)
│       │   │   └── codegen/
│       │   │       ├── index.ts            # generateValidator() — orchestrator (Fast Path + Slow Path)
│       │   │       ├── context.ts          # SlowGen, FastGen interfaces, CodeGenContext (mode + usedHelpers), CodeGenResult, CodegenMode = "inline"|"lean", emitRegex/emitSet/emitTemp, constants
│       │   │       ├── emit.ts             # emit() tagged template — Slow Path utility
│       │   │       ├── emit-issue.ts       # tooSmall/tooBig/invalidType/invalidFormat/invalidValue — mode-aware issue emission
│       │   │       ├── issue-decls.ts      # ISSUE_DECLS — issue factory bodies (__zaTS, __zaIT, ...) hosted in virtual module
│       │   │       ├── well-known-regex.ts # WELL_KNOWN_REGEXES + lookupWellKnownRegex() for cross-file dedup
│       │   │       ├── slow-path.ts        # slowRegistry + createSlowGen() + generateSlow()
│       │   │       ├── fast-path.ts        # fastRegistry + createFastGen() + generateFast()
│       │   │       └── schemas/            # 1 file per schema type (slow + fast generators together)
│       │   │           ├── string.ts, number.ts, ... # 34 per-type files
│       │   │           └── effect.ts # slowEffect(), refineCheck()
│       │   ├── cli/              # CLI-specific (no unplugin deps)
│       │   │   ├── index.ts      # CLI entry point (command parser, usage text)
│       │   │   ├── logger.ts     # Colored logging (info/success/warn/error/dim), TTY-aware
│       │   │   ├── emitter.ts    # .compiled.ts file generation (always mode: "inline")
│       │   │   ├── errors.ts     # Error message utility
│       │   │   └── commands/
│       │   │       ├── generate.ts
│       │   │       ├── watch.ts
│       │   │       └── check.ts   # diagnose schemas: tree view, coverage %, Fast Path, hints, --json, --fail-under
│       │   └── unplugin/         # Build plugin (no cli deps)
│       │       ├── index.ts      # createUnplugin() factory — selects mode from meta.framework
│       │       ├── transform.ts  # shouldTransform, transformCode, rewriteSource, rewriteSourceAutoDiscover, injectRuntime, findExpressionEnd
│       │       ├── virtual.ts    # virtual:zod-aot/runtime module — resolveVirtualId/loadVirtual + ALL_HELPER_NAMES
│       │       ├── types.ts      # ZodAotPluginOptions (includes autoDiscover), TransformOptions (includes mode)
│       │       └── vite.ts, webpack.ts, esbuild.ts, rollup.ts, rolldown.ts, rspack.ts, bun.ts, farm.ts
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
│       │   │       ├── index.test.ts, helpers.ts, shared-context.test.ts
│       │   │       ├── slow-path/ # slow-path generator tests + factory.test.ts
│       │   │       └── fast-path/ # fast-path generator tests + factory.test.ts
│       │   ├── cli/
│       │   │   ├── emitter.test.ts, logger.test.ts
│       │   │   └── commands/
│       │   │       └── check.test.ts, generate.test.ts, watch.test.ts
│       │   └── unplugin/
│       │       ├── transform.test.ts   # includes verbose/BuildStats + mode: "inline" tests
│       │       ├── virtual.test.ts     # virtual:zod-aot/runtime module unit tests
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
pnpm size:cli       # CLI emitter codegen size report (per-schema raw + gzip — mirrors `npx zod-aot generate` output)
pnpm size:unplugin  # Vite multi-file bundle dedup verification (probes must each appear exactly once)
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

- **CI** (`.github/workflows/ci.yml`): Runs on push to main and PRs. Lint → typecheck → build → test on Node 22/24, Bun 1.3, Deno v2.x. Also tests Zod v4.0.0–latest compatibility.
- **Release** (`.github/workflows/release-please.yml`): Triggered by push to main via [release-please](https://github.com/googleapis/release-please). Creates release PRs automatically, then publishes to npm with provenance on release creation.

## Verification

1. `pnpm test` — Vitest for extractor/codegen/integration tests
2. `pnpm bench` — vitest bench (zod v3 vs v4 vs zod-aot vs ajv vs typia, uses `benchmarks/vitest.config.ts`)
3. Integration test: schema → extract → generate → execute → compare results with Zod on same input
