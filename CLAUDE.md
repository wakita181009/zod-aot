# zod-aot

Compiles Zod v4 schemas into standalone validation functions at build time.

## Commands

```bash
pnpm test                 # vitest; resolves zod-aot from src via the "source" condition
pnpm build                # needed for apps/, benchmarks, and the CLI bin
pnpm -r typecheck
pnpm check[:fix]          # biome (lint + format); there is no `pnpm lint`
pnpm bench
pnpm size:cli | size:unplugin
```

## Architecture (non-obvious parts)

- One pipeline for every entry point: `compileSchemas()` (`core/pipeline.ts`) →
  `extractSchema()` → `generateValidator()`. CLI, unplugin, and benchmarks differ
  only in the output wrapper.
- Module boundaries are enforced by Biome `noRestrictedImports`: `core/` imports
  nothing else in `src/`; `cli/` and `unplugin/` never import each other.
  Cross-module imports use the `#src/` alias.
- Schemas are discovered by *executing* source files (jiti on Node, native import
  on Bun/Deno), not by static analysis: `_zod.def` is JSON-serializable and
  `_zod.bag` holds aggregated checks, which static analysis can't resolve.
- `compile()` is not the optimizer. It is a Zod passthrough plus `COMPILED_MARKER`
  for discovery; `createFallback()` keeps an own `.schema` ref that the CLI
  emitter passes to `__mkv`. Plain Zod schemas (autoDiscover) have no `.schema`.
- Codegen modes: `inline` (CLI; helpers declared per file) vs `lean` (unplugin;
  helpers imported from a runtime module, tracked via `usedHelpers`).
  webpack/rspack/rsbuild reject `virtual:` URIs, so they import the runtime via
  the bare alias `__zod-aot-runtime__` (`WP_RUNTIME_ID`) instead of
  `virtual:zod-aot/runtime`.
- CLI emitter import paths: keep a source path that already ends in `.js` and
  strip every other extension. Rewriting `.ts` to `.js` breaks webpack/rspack
  without `extensionAlias`, and getpaseo/paseo matches the
  `sourceRelPath.endsWith(".js")` text in dist.

## Compilation rules

- Only zero-capture inline arrow functions compile for transform/refine (via
  `fn.toString()` + acorn). Captures, async, `this`, or a ctx param fall back to Zod.
- superRefine, custom, preprocess, and non-recursive lazy always fall back.
  Fallback is partial: the rest of the schema is still compiled.
- Fast Path is all-or-nothing: any coerce/default/catch/transform/fallback
  anywhere in the schema disables it for the whole schema.

## Zod internals reference

Read Zod's own source rather than guessing: `zod/src/v4/core/schemas.ts`
(defs, `$ZodObjectJIT`), `checks.ts`, `regexes.ts`, `json-schema-processors.ts`.
