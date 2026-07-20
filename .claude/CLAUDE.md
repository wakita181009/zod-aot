# zod-aot: Zod AOT Compiler

Compile Zod schemas into zero-overhead validation functions at build time. Keeps
Zod's type inference and DX intact; only accelerates the validation hot path.

## Compatibility

- Runtimes (CI-tested): Node.js 22/24/26, Bun 1.3, Deno v2.x
- Zod: v4.0.0, v4.1.0, v4.2.0, v4.3.0, latest

## Architecture

Pipeline: `[Zod Schema] → extractSchema (_zod.def → SchemaIR) → generateValidator (codegen) → emit`.

**Single shared core across all entry points.** CLI, unplugin, and benchmarks all
funnel through `compileSchemas()` (`core/pipeline.ts`) → `extractSchema()` →
`generateValidator()`. The generated `safeParse_*` function is identical across
paths; only the output wrapper differs (CLI writes `.compiled.ts`, unplugin
rewrites source to an IIFE, benchmarks run the vite plugin). Benchmark numbers
therefore reflect real CLI/unplugin output.

**Module boundaries** (enforced by Biome `noRestrictedImports`):
- `core/` — pure extract + codegen. Depends on nothing else in `src/`.
- `cli/`, `unplugin/`, `discovery.ts`, `loader.ts` depend on `core/` only.
  `cli/` and `unplugin/` must not import each other.
- Cross-module imports use the `#src/` alias (e.g. `#src/core/codegen/index.js`);
  within-module imports are relative.

**Why runtime extraction (not static AST):** Zod v4's `_zod.def` is
JSON-serializable and `_zod.bag` holds aggregated check metadata (min/max/patterns).
Static analysis can't resolve dynamic schemas (variable refs, function calls) or
reliably detect transform/refine.

**Non-obvious facts before editing:**
- `compile()` is NOT the optimizer — it's a Zod passthrough plus a `COMPILED_MARKER`
  symbol for discovery. `createFallback()` keeps an own-property `.schema` ref used
  by the CLI emitter.
- The CLI emitter passes the original schema via `(__src_X as any).schema` into
  `__mkv`. `compile()`-wrapped schemas have that runtime `.schema`; plain Zod schemas
  (autoDiscover CLI) don't, so `__mkv(fn, undefined)` returns a plain result object
  with no prototype chain.

## Codegen Modes: `inline` vs `lean`

`generateValidator({ mode })` — IIFE structure is identical; only helper/issue
sourcing differs.

| | `inline` (CLI only) | `lean` (all unplugin bundlers) |
|---|---|---|
| `__mkv` / `__fin` | declared per-file | imported from runtime module |
| Issue objects | `{code:"too_small",...}` literal at each site | factory call `__zaTS(...)` |
| Well-known regexes | `new RegExp(...)` per IIFE | single imported copy |
| Cross-file dedup | none | bundler-level |

The `usedHelpers` Set is populated during lean codegen and drives the runtime
import; it stays empty in inline mode.

**Runtime-module sourcing (lean):** virtual-module bundlers (vite, rollup, rolldown,
esbuild, farm, bun) import from `virtual:zod-aot/runtime`. webpack, rspack, and
rsbuild reject the `virtual:` URI scheme, so they import the same module via the
bare-specifier alias `__zod-aot-runtime__` (`WP_RUNTIME_ID`). rsbuild is grouped
with rspack because it wraps the rspack plugin internally. Framework → mode/runtime
selection lives in `unplugin/index.ts`.

## Public API

```typescript
import { compile } from "zod-aot";
// Zod fallback in dev; generated function after build. Same interface as Zod.
export const validateUser = compile(UserSchema); // .parse / .safeParse
```

Exports: `compile`, `isCompiledSchema`, and types (`CompiledSchema`,
`SafeParseResult` / `SafeParseError` / `SafeParseSuccess`, `ZodErrorLike`,
`ZodIssueLike`, `ZodAotPluginOptions`).

### CLI

```bash
zod-aot generate <src> -o <out>   # [--watch]
zod-aot check <src>               # tree view / coverage / hints [--json --fail-under N]
```

### unplugin

Entries: `zod-aot/{vite,webpack,esbuild,rollup,rolldown,rspack,rsbuild,bun,farm}`.
Replaces `compile(Schema)` — and, in `autoDiscover` mode, plain exported Zod
schemas — with a `/* @__PURE__ */` IIFE.

Non-obvious implementation notes:
- `enforce: "pre"`. Quick bail-out before parsing: compile mode needs both
  `"zod-aot"` and `"compile"` in source; autoDiscover needs a runtime (non-type-only)
  `import` from `"zod"`.
- Schemas are discovered by *executing* the file (`loadSourceFile()`: jiti on Node,
  native import on Bun/Deno), not by static parsing. autoDiscover uses
  `acorn.parseExpressionAt()` for expression-boundary detection and a two-pass
  rewrite for mixed files.
- `cacheBust` (`?t=…`) enables HMR; `injectRuntime()` is idempotent across HMR re-runs.
- `compileSchemas({ onError })` isolates per-schema failures so one bad schema
  doesn't abort the file. `verbose` logs per-schema status + a `buildEnd` summary.
- Options: `include` / `exclude` (path substring match), `zodCompat`, `verbose`,
  `autoDiscover`.

## Schema Coverage & Compilation Rules

**Supported:** string, number (int32/uint32/float32/float64), int, boolean, object,
array, literal, enum, union, optional, nullable, null, undefined, tuple, record,
intersection, discriminatedUnion, date, any, unknown, default, readonly, bigint,
set, map, symbol, void, nan, never, pipe (non-transform), lazy (self-recursive via
recursiveRef), templateLiteral, catch, coerce (string/number/boolean/bigint/date).

**Effects (transform/refine):** only *zero-capture* inline arrow functions compile
(via `fn.toString()` + acorn), inlined as `(fn)(inputExpr)`. Rejected: external
captures, async, `this`, or 2+ params (ctx arg). `sortChecksPreservingEffects()`
reorders checks by cost but pins refine_effect entries in place. Files:
`core/extract/effects.ts`, `core/codegen/schemas/effect.ts`.

**Falls back to Zod:** superRefine, custom, preprocess, non-recursive lazy, and any
transform/refine with captures or a ctx parameter. **Partial fallback:** compilable
parts are still optimized; only the incompilable part delegates to Zod.

**Fast Path** (two-phase): eligible schemas emit a single boolean `&&` chain that
short-circuits on valid input with zero allocations, falling to the Slow Path
(error-collecting) on failure. All-or-nothing — any ineligible nested part
disqualifies the whole schema. Ineligible: coerce, default, catch, transform effect,
fallback. Eligible specials: date (non-coerce), set, map, zero-capture refine_effect.

Design choices that shape codegen: check ordering by cost (typeof → length → range →
regex) for earlier short-circuit; enums with 1–3 values use `===` instead of
`Set.has()`.

## Reference: Zod v4 internals

- `zod/src/v4/core/schemas.ts` — schema defs, `$ZodTypeDef`, `$ZodObjectJIT` (codegen ref)
- `zod/src/v4/core/checks.ts` — check defs
- `zod/src/v4/core/regexes.ts` — email/uuid/ip patterns
- `zod/src/v4/core/json-schema-processors.ts` — per-type processing (extractor ref)

## Tooling

```bash
pnpm build         # tsc across all packages
pnpm test          # vitest run
pnpm bench         # vitest bench (zod v3/v4 vs zod-aot vs ajv vs typia)
pnpm size:cli      # per-schema emitter size (raw + gzip)
pnpm size:unplugin # multi-file Vite bundle dedup check (each probe must appear once)
pnpm check[:fix]   # biome
pnpm -r typecheck  # tsc --noEmit
```

Biome (`biome.json`): errors on `noExplicitAny`, unused vars/imports,
`useImportType` / `useExportType`, floating/misused promises, and
`noRestrictedImports` (module boundaries); `noConsole` warns. Formatter: 2-space
indent, width 100, semicolons, trailing commas. A PostToolUse hook auto-runs
`typecheck` + `lint` after `.ts`/`.tsx` edits.

CI (`ci.yml`): lint → typecheck → build → test across the runtime + Zod-version
matrix. Release via release-please → npm publish with provenance.
