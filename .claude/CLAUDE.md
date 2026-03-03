# zod-aot: Zod AOT Compiler

**Tagline:** "Compile Zod schemas into zero-overhead validation functions at build time."

## Status

**Phase 1: Core Compiler — COMPLETE**
**Phase 2: Tier 2 Type Support — COMPLETE**
**Phase 3: Tier 3 Type Support — IN PROGRESS**

Benchmark results (vitest bench, Node.js):
- Simple types: 1.7-3.1x faster than Zod v4
- Medium objects (valid): 4.1x faster
- Medium objects (invalid): ~23x faster
- Large objects (10-100 nested items): **44-60x faster**
- Tier 2 types: tuple 4.2x, record 4.2x, discriminatedUnion 5.4x
- Combined (event log): 11.5x faster
- Partial fallback (transform): object 2.5x, array 4.6-4.7x faster
- Performance gains scale with schema complexity

Phase 1 success criteria (is() 10x+, safeParse() 5x+) met for large/complex schemas. Primitives and small objects show moderate gains due to Zod v4's already-optimized fast path.

Phase 2 adds Tier 2 types: tuple, record, intersection, discriminatedUnion (with O(1) switch optimization), date, any, unknown, default, readonly. Partial fallback compiles optimizable parts of schemas containing transform/refine.

Phase 3 adds Tier 3 types: bigint, set, map, pipe (non-transform). Lazy schemas fall back to Zod (getter functions are not serializable). 517 tests passing.

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

1. **Discovery**: AST detection of `compile()` calls in source files
2. **Extraction**: Execute schema file in Node.js → recursively traverse `_zod.def` → produce SchemaIR
3. **CodeGen**: SchemaIR → JS/TS code with inline type checks, early returns, pre-compiled regexes
4. **Emit**: Write generated code to files

### Shared Pipeline across CLI / unplugin / Benchmark

All three entry points use the same core pipeline: `extractSchema()` → `generateValidator()`.

```
                CLI (generate)              unplugin                 Benchmark
                ──────────────              ────────                 ─────────
Discovery       discoverSchemas()           discoverSchemas()        (direct schema ref)
                  └─ loadSourceFile()          └─ loadSourceFile()
                  └─ isCompiledSchema()        └─ isCompiledSchema()
                         ↓                           ↓                   ↓
Extract         extractSchema(s.schema)     extractSchema(s.schema)  extractSchema(zodSchema)
                         ↓                           ↓                   ↓
CodeGen         generateValidator(ir, name) generateValidator(ir, name) generateValidator(ir, name)
                         ↓                           ↓                   ↓
Output          emitter.ts                  rewriteSource()          new Function()
                .compiled.ts file           IIFE inline in source    runtime eval
```

Key files:
- `core/compile.ts`: `compile()` is NOT the optimizer — it's a Zod fallback + `COMPILED_MARKER` symbol for discovery
- `discovery.ts`: `discoverSchemas()` loads file → scans exports with `isCompiledSchema()`
- `cli/commands/generate.ts`: discovery → extract → generate → `emitter.ts` writes `.compiled.ts`
- `unplugin/transform.ts`: discovery → extract → generate → `rewriteSource()` replaces `compile()` with IIFE
- `benchmarks/helpers/compile.ts`: `compileForBench()` directly calls extract → generate → `new Function()`

The generated `safeParse_*` function is identical across all paths. Benchmark results accurately reflect CLI/unplugin output performance.

Note: CLI emitter (`emitter.ts`) does not include `schema` property in the output wrapper, unlike unplugin and benchmark which retain the original Zod schema reference.

### Why Runtime Extraction

- Zod v4's `_zod.def` is JSON-serializable
- Static AST analysis cannot handle dynamic schemas (variable references, function calls)
- `_zod.bag` contains aggregated metadata from checks (minimum, maximum, patterns, etc.)
- Reliable detection of transform/refine

## Public API

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
const isUser = validateUser.is(data);           // type guard (boolean)
```

### CLI

```bash
npx zod-aot generate src/schemas.ts -o src/schemas.compiled.ts
npx zod-aot generate src/ -o src/compiled/
npx zod-aot generate src/ --watch   # watch for changes and regenerate
npx zod-aot check src/schemas.ts    # check if compilable
```

### unplugin (Vite / webpack / esbuild / Rollup)

Build-time plugin that replaces `compile()` calls with optimized inline validators.

```typescript
// vite.config.ts
import zodAot from "zod-aot/unplugin/vite";
export default { plugins: [zodAot()] };
```

Plugin entries: `zod-aot/vite`, `zod-aot/webpack`, `zod-aot/esbuild`, `zod-aot/rollup`

**Transform flow:**
1. `shouldTransform(id)` — file extension check, skip `node_modules`/`.d.ts`/`.compiled.ts`
2. Quick bail-out: source must contain both `"zod-aot"` and `"compile"`
3. `discoverSchemas(id)` — execute file via `loadSourceFile()`, scan exports with `isCompiledSchema()`
4. `extractSchema()` → `generateValidator()` (shared pipeline)
5. `rewriteSource()` — replace `compile(Schema)` with `/* @__PURE__ */ (() => { ... })()` IIFE
6. `removeCompileImport()` — remove `compile` from import statement

**Key implementation details:**
- `enforce: "pre"` — runs before other plugins
- `/* @__PURE__ */` annotation enables tree-shaking
- IIFE wraps preamble (regex/Set) + safeParse function + CompiledSchema object
- `loadSourceFile()` uses `tsx` on Node.js, native import on Bun/Deno
- `cacheBust: true` (`?t=${Date.now()}`) for HMR support
- Options: `include?: string[]`, `exclude?: string[]` (path substring matching)

## Schema Coverage

### Tier 1 (Phase 1 — COMPLETE)
string, number, int, boolean, object, array, literal, enum, union, optional, nullable, null, undefined

### Tier 2 (Phase 2 — COMPLETE)
tuple, record, intersection, discriminatedUnion, date, any, unknown, default, readonly

### Tier 3 (Phase 3 — IN PROGRESS)
bigint, set, map, pipe (non-transform) — DONE
template_literal — pending (requires Zod v4 API verification)

### Fallback to Zod
transform, refine, superRefine, custom, preprocess, lazy

**Partial fallback strategy:** Even schemas containing transform etc. optimize compilable parts and delegate only incompilable parts to Zod.

## Project Structure

```
zod-aot/
├── packages/
│   └── zod-aot/                  # Main npm package (published as "zod-aot")
│       ├── src/
│       │   ├── index.ts          # Public API exports
│       │   ├── discovery.ts      # discoverSchemas() — shared by cli & unplugin
│       │   ├── loader.ts         # loadSourceFile() — runtime-aware file loader
│       │   ├── core/             # Pure logic (no cli/unplugin/discovery/loader deps)
│       │   │   ├── types.ts      # SchemaIR, CompiledSchema, CheckIR
│       │   │   ├── compile.ts    # compile() marker + isCompiledSchema()
│       │   │   ├── runtime.ts    # Dev-time fallback (createFallback)
│       │   │   ├── extractor.ts  # extractSchema() — _zod.def → SchemaIR
│       │   │   └── codegen/
│       │   │       ├── index.ts  # generateValidator() — SchemaIR → JS code
│       │   │       ├── context.ts # CodeGenContext, CodeGenResult, utils
│       │   │       └── generators/ # 25 type-specific code generators
│       │   ├── cli/              # CLI-specific (no unplugin deps)
│       │   │   ├── index.ts      # CLI entry point (command parser)
│       │   │   ├── logger.ts     # Logging utility
│       │   │   ├── emitter.ts    # .compiled.ts file generation
│       │   │   └── commands/
│       │   │       ├── generate.ts
│       │   │       ├── watch.ts
│       │   │       └── check.ts
│       │   └── unplugin/         # Build plugin (no cli deps)
│       │       ├── index.ts      # createUnplugin() factory
│       │       ├── transform.ts  # shouldTransform, transformCode, rewriteSource
│       │       ├── types.ts      # ZodAotPluginOptions
│       │       └── vite.ts, webpack.ts, esbuild.ts, rollup.ts
│       ├── tests/                # Mirrors src/ structure
│       │   ├── integration.test.ts
│       │   ├── discovery.test.ts
│       │   ├── core/
│       │   │   ├── types.test.ts, compile.test.ts, runtime.test.ts
│       │   │   ├── extractor.test.ts
│       │   │   └── codegen/
│       │   │       ├── index.test.ts, helpers.ts
│       │   │       └── generators/*.test.ts
│       │   ├── cli/
│       │   │   ├── check.test.ts, emitter.test.ts, generate.test.ts
│       │   │   └── fixtures/
│       │   └── unplugin/
│       │       ├── transform.test.ts
│       │       └── fixtures/
│       ├── package.json
│       └── tsconfig.json
├── benchmarks/                   # Workspace package (@zod-aot/benchmarks)
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

## Implementation Phases

### Phase 2: Type Expansion + CLI + unplugin

- [x] Tier 2 type support (tuple, record, intersection, discriminatedUnion, date, any, unknown, default, readonly)
- [x] discriminatedUnion switch statement optimization (O(1) vs O(n))
- [x] CLI (`generate` + `check` commands)
- [x] Partial fallback (e.g., object with some transform properties)
- [x] unplugin integration for Vite/webpack/esbuild/Rollup
- [x] Watch mode

### Phase 3: Ecosystem

- [x] Tier 3 type support: bigint, set, map, pipe (non-transform)
- [x] Lazy schema fallback (explicit reason: "lazy")
- [ ] template_literal type support (pending Zod v4 API verification)
- [ ] Documentation site

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
4. **Phase 1 benchmarks first** — Pivot if 10x is not achieved. Data-driven decisions
5. **Pre-compiled regex + Set for enums** — These optimizations create the performance gap

## Development Tools

### Scripts

```bash
# Root (monorepo)
pnpm build          # tsc across all packages
pnpm test           # vitest run
pnpm bench          # vitest bench
pnpm lint           # biome check .
pnpm lint:fix       # biome check --fix .
pnpm format         # biome format --write .

# packages/zod-aot
pnpm -r typecheck   # tsc --noEmit
pnpm -r build       # tsc
```

### Biome (Linter & Formatter)

Config: `biome.json` (v2.4.5)

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

- **CI** (`.github/workflows/ci.yml`): Runs on push to main and PRs. Lint → typecheck → test → build on Node 20/22/24, Bun 1.3, Deno v2.x. Also tests Zod v4.0.0–latest compatibility.
- **Release** (`.github/workflows/release.yml`): Triggered by `v*` tags. Runs full checks, then publishes to npm with provenance.

## Verification

1. `pnpm test` — Vitest for extractor/codegen/integration tests
2. `pnpm bench` — vitest bench for Zod v4 performance comparison
3. `pnpm --filter @zod-aot/benchmarks bench:zod-only` / `pnpm --filter @zod-aot/benchmarks bench:zod-aot` — Standalone benchmark scripts
4. Integration test: schema → extract → generate → execute → compare results with Zod on same input
