# Zod AOT

**Compile Zod schemas into zero-overhead validation functions at build time.**

[![CI](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml/badge.svg)](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/wakita181009/zod-aot/graph/badge.svg)](https://codecov.io/gh/wakita181009/zod-aot)
[![npm](https://img.shields.io/npm/v/zod-aot)](https://www.npmjs.com/package/zod-aot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

No code changes required — keep your existing Zod schemas and get **2-80x faster** validation.

## Why

Zod v4 is already fast, but runtime schema traversal still costs ~10x compared to ahead-of-time (AOT) compiled approaches. Existing AOT solutions like [Typia](https://typia.io/) require rewriting your schemas as TypeScript types. **zod-aot** bridges this gap — it takes your existing Zod schemas and generates optimized, plain JavaScript validation functions at build time.

| | Zod AOT             | Typia | AJV standalone | Zod v3 | Zod v4 |
|---|---------------------|---|---|---|---|
| **Input** | Zod schemas         | TS types | JSON Schema | Zod schemas | Zod schemas |
| **Existing code changes** | None                | Full rewrite | Full rewrite | N/A | N/A |
| **Type inference** | Inherited from Zod  | Native | External | Native | Native |
| **Runtime dependency** | None (generated code) | Typia runtime | AJV runtime | Zod | Zod |

## Benchmarks

Measured with `vitest bench` on Node.js (Apple M-series). The benchmark suite compares **Zod v3**, **Zod v4**, **zod-aot**, **[ajv](https://ajv.js.org/)**, and **[typia](https://typia.io/)** across primitives, objects, collections, unions, recursive schemas, and real-world scenarios.

Run benchmarks locally:

```bash
pnpm bench
```

### safeParse

| Scenario | Zod v3 | Zod v4 | Zod AOT   | vs v3 | vs v4 |
|---|---|---|-----------|---|---|
| simple string | 8.2M ops/s | 9.6M ops/s | 10.4M ops/s | **1.3x** | **1.1x** |
| string (min/max) | 7.8M ops/s | 5.4M ops/s | 10.5M ops/s | **1.4x** | **2.0x** |
| number (int+positive) | 7.8M ops/s | 5.7M ops/s | 10.5M ops/s | **1.3x** | **1.8x** |
| enum | 7.5M ops/s | 9.1M ops/s | 10.0M ops/s | **1.3x** | **1.1x** |
| tuple [string, int, boolean] | 4.2M ops/s | 4.6M ops/s | 10.5M ops/s | **2.5x** | **2.3x** |
| record\<string, number\> (5 keys) | 2.3M ops/s | 1.9M ops/s | 5.6M ops/s | **2.4x** | **2.9x** |
| discriminatedUnion (3 variants) | 2.3M ops/s | 2.9M ops/s | 9.3M ops/s | **4.1x** | **3.3x** |
| medium object (7 props, valid) | 1.3M ops/s | 1.7M ops/s | 5.2M ops/s | **4.0x** | **3.0x** |
| medium object (7 props, invalid) | 346K ops/s | 62K ops/s | 467K ops/s | **1.4x** | **7.5x** |
| large object (10 nested items) | 83K ops/s | 110K ops/s | 4.0M ops/s | **48x** | **36x** |
| large object (100 nested items) | 8.5K ops/s | 11.3K ops/s | 680K ops/s | **80x** | **60x** |
| recursive tree (7 nodes) | 398K ops/s | 1.5M ops/s | 6.3M ops/s | **16x** | **4.2x** |
| recursive tree (121 nodes) | 23K ops/s | 101K ops/s | 749K ops/s | **33x** | **7.4x** |
| event log (combined) | 265K ops/s | 440K ops/s | 4.4M ops/s | **17x** | **10x** |
| partial fallback object (transform) | 822K ops/s | 1.4M ops/s | 3.5M ops/s | **4.2x** | **2.4x** |
| partial fallback array 10 (transform) | 85K ops/s | 144K ops/s | 1.1M ops/s | **13x** | **7.7x** |
| partial fallback array 50 (transform) | 18K ops/s | 30K ops/s | 237K ops/s | **13x** | **7.8x** |

Performance gains scale with schema complexity. The `discriminatedUnion` optimization uses an O(1) `switch` dispatch instead of Zod's sequential trial approach. Partial fallback schemas (containing `transform`/`refine`) still show 2-8x speedups by compiling the optimizable portions.

## Runtime Support

| Runtime | Version | Status |
|---------|---------|--------|
| Node.js | 20+     | Fully supported |
| Bun     | 1.3+    | Fully supported |
| Deno    | 2.0+    | Fully supported |

## Install

```bash
npm install zod-aot
# zod v4 is a peer dependency
npm install zod@^4
```

## Quick Start

### 1. Define schemas with `compile()`

```typescript
// src/schemas.ts
import { z } from "zod";
import { compile } from "zod-aot";

const UserSchema = z.object({
  name: z.string().min(3),
  age: z.number().int().positive(),
  email: z.email(),
  role: z.enum(["admin", "user"]),
});

// compile() falls back to Zod in dev, uses generated functions after build
export const validateUser = compile(UserSchema);
```

### 2. Use the compiled validator

```typescript
// Same interface as Zod — works in both dev and production
const user = validateUser.parse(data);          // throws on failure
const result = validateUser.safeParse(data);    // { success, data/error }
```

### 3. Generate optimized code

Choose one of these approaches:

**Option A: Build plugin (Vite / webpack / esbuild / Rollup / Rolldown / rspack)**

```typescript
// vite.config.ts
import zodAot from "zod-aot/vite";

export default defineConfig({
  plugins: [zodAot()],
});
```

Also available: `zod-aot/webpack`, `zod-aot/esbuild`, `zod-aot/rollup`, `zod-aot/rolldown`, `zod-aot/rspack`, `zod-aot/bun`

**Option B: CLI**

```bash
# Generate optimized validators
npx zod-aot generate src/schemas.ts -o src/schemas.compiled.ts

# Generate from a directory
npx zod-aot generate src/ -o src/compiled/

# Watch mode — regenerate on file changes
npx zod-aot generate src/ --watch

# Check if schemas are compilable (without generating)
npx zod-aot check src/schemas.ts
```

## Build Plugin (unplugin)

The build plugin automatically replaces `compile()` calls with optimized inline validators during the build step. No code changes needed — your source files stay the same.

```typescript
// vite.config.ts
import zodAot from "zod-aot/vite";
export default defineConfig({ plugins: [zodAot()] });

// webpack.config.js
const zodAot = require("zod-aot/webpack");
module.exports = { plugins: [zodAot()] };
```

### Options

```typescript
zodAot({
  include: ["src/schemas"],   // only process files matching these substrings
  exclude: ["test", "mock"],  // skip files matching these substrings
})
```

The plugin:
- Runs at build time (`enforce: "pre"`)
- Replaces `compile(Schema)` with optimized IIFE inline validators
- Adds `/* @__PURE__ */` annotations for tree-shaking
- Supports HMR in development

## Zod Ecosystem Compatibility

`compile()` returns a full Zod schema (`T & CompiledSchema<T>`) — it preserves all original Zod methods and only replaces validation methods (`safeParse`, `parse`, etc.) with AOT-optimized versions. This means compiled schemas work with any library that accepts Zod schemas.

### Hono

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { compile } from "zod-aot";

const UserSchema = z.object({
  name: z.string().min(3),
  age: z.number().int().positive(),
  email: z.email(),
});

// Still a Zod schema — but safeParse is AOT-optimized
const validateUser = compile(UserSchema);

const app = new Hono();

app.post("/users", zValidator("json", validateUser), (c) => {
  const user = c.req.valid("json");
  return c.json(user);
});
```

`@hono/zod-validator` internally calls `schema.safeParse()` — with zod-aot, this call is replaced by the generated optimized validator at build time, giving you faster request validation with zero code changes.

## How It Works

```
Zod Schema
    │
    ▼
┌─────────────────────┐
│  Extractor          │  Traverse _zod.def recursively
│  extractSchema()    │  → produce JSON-serializable IR
└─────────┬───────────┘
          │ SchemaIR
          ▼
┌─────────────────────┐
│  CodeGen            │  IR → optimized JS with:
│  generateValidator()│  • inline type checks
└─────────┬───────────┘  • pre-compiled RegExps
          │              • Set-based enum lookups
          ▼              • early returns
   Optimized JS function
   (no runtime dependencies)
```

### Why Runtime Extraction (not static analysis)

- Zod v4's `_zod.def` is JSON-serializable — perfect for IR extraction
- Static AST analysis cannot handle dynamic schemas (variable references, function calls, spread operators)
- `_zod.bag` contains aggregated metadata from checks (minimum, maximum, regex patterns, etc.)
- Reliable detection of `transform`/`refine` for automatic fallback

### Generated Code Example

**Input:**

```typescript
z.object({
  name: z.string().min(3).max(50),
  role: z.enum(["admin", "user"]),
})
```

**Output:**

```javascript
/* zod-aot */
var __set_0 = new Set(["admin", "user"]);

function safeParse_validate(input) {
  var __issues = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    __issues.push({ code: "invalid_type", expected: "object", path: [] });
  } else {
    // name: string().min(3).max(50)
    if (typeof input["name"] !== "string") {
      __issues.push({ code: "invalid_type", expected: "string", path: ["name"] });
    } else {
      if (input["name"].length < 3)
        __issues.push({ code: "too_small", minimum: 3, path: ["name"] });
      if (input["name"].length > 50)
        __issues.push({ code: "too_big", maximum: 50, path: ["name"] });
    }

    // role: enum(["admin", "user"])
    if (!__set_0.has(input["role"])) {
      __issues.push({ code: "invalid_enum_value", path: ["role"] });
    }
  }
  if (__issues.length > 0) return { success: false, error: { issues: __issues } };
  return { success: true, data: input };
}
```

Key optimizations in the generated code:

- **No schema traversal** — all validation logic is inlined
- **Pre-compiled RegExps** — regex patterns are compiled once, reused across calls
- **Set-based enum lookups** — O(1) membership tests instead of array iteration
- **Early type checks** — nested checks only run if the type is correct
- **Minimal allocations** — issues array is only created once per call

## API Reference

### `compile<T>(zodSchema): CompiledSchema<T>`

Wraps a Zod schema for AOT compilation. In development, it falls back to Zod's built-in validation. After build (via CLI or unplugin), it uses the generated optimized validator.

```typescript
import { z } from "zod";
import { compile } from "zod-aot";

const validateUser = compile(z.object({
  name: z.string().min(3),
  age: z.number().int().positive(),
}));
```

### `CompiledSchema<T>`

The interface returned by `compile()`:

```typescript
interface CompiledSchema<T> {
  parse(input: unknown): T;           // throws on failure
  safeParse(input: unknown): SafeParseResult<T>;  // { success, data/error }
  schema: unknown;                    // reference to original Zod schema
}
```

## Supported Types

| Type | Supported Checks |
|---|---|
| `string` | `min`, `max`, `length`, `email`, `url`, `uuid`, `regex`, `includes`, `startsWith`, `endsWith` |
| `number` | `int`, `positive`, `negative`, `nonnegative`, `nonpositive`, `min`, `max`, `multipleOf` |
| `bigint` | `min`, `max`, `positive`, `negative`, `nonnegative`, `nonpositive`, `multipleOf` |
| `boolean` | — |
| `null` | — |
| `undefined` | — |
| `any` | — (always passes) |
| `unknown` | — (always passes) |
| `literal` | single value, multi-value |
| `enum` | string enum values |
| `date` | `min`, `max` (timestamp comparison) |
| `object` | nested objects, mixed property types |
| `array` | `min`, `max`, `length`, element validation |
| `tuple` | per-element types, optional rest element |
| `record` | key and value type validation |
| `set` | `min`, `max` (size), element validation |
| `map` | key and value type validation |
| `union` | sequential trial of all options |
| `discriminatedUnion` | O(1) `switch` dispatch on discriminator field |
| `intersection` | validates both left and right schemas |
| `pipe` (non-transform) | sequential in→out validation |
| `optional` | wraps any supported type |
| `nullable` | wraps any supported type |
| `readonly` | validates inner type (TS-only concept) |
| `default` | replaces `undefined` with default value, then validates inner |
| `symbol` | — (typeof check) |
| `void` | — (accepts `undefined`) |
| `nan` | — (Number.isNaN check) |
| `never` | — (always fails) |
| `lazy` (self-recursive) | cycle detection → self-recursive codegen |

### Automatic Fallback to Zod

These schema types contain JavaScript closures or runtime-dependent logic that cannot be compiled to static code. They are detected during extraction and produce a `FallbackIR`:

- `transform` — runtime data transformation
- `refine` / `superRefine` — custom validation with closures
- `custom` — arbitrary validation logic
- `preprocess` — input preprocessing
- `lazy` (non-recursive) — deferred schema resolution where inner type cannot be resolved

#### Partial Fallback

When a schema contains a mix of compilable and non-compilable parts (e.g., an object where some properties use `transform`/`refine`), zod-aot compiles the optimizable parts and delegates only the non-compilable properties to Zod at runtime.

> **Note:** If a schema heavily relies on `transform`, `refine`, or other non-compilable features, the performance benefit from partial fallback will be minimal — most of the validation work is still delegated to Zod. Partial fallback is most effective when only a small portion of the schema uses these features.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run benchmarks (zod v3 vs zod v4 vs zod-aot vs ajv vs typia)
pnpm bench

# Lint (Biome)
pnpm lint

# Type check
pnpm -r typecheck

# Build
pnpm -r build
```

### Project Structure

```
zod-aot/
├── packages/zod-aot/        # Main npm package
│   ├── src/
│   │   ├── index.ts          # Public API exports (zod-aot)
│   │   ├── discovery.ts      # Schema discovery (shared by CLI & unplugin)
│   │   ├── loader.ts         # Runtime-aware file loader
│   │   ├── core/             # Pure logic (no CLI/unplugin deps)
│   │   │   ├── types.ts      # SchemaIR, CompiledSchema, CheckIR
│   │   │   ├── compile.ts    # compile() marker + isCompiledSchema()
│   │   │   ├── runtime.ts    # createFallback (dev-time)
│   │   │   ├── extract/      # _zod.def → SchemaIR (extractors per type)
│   │   │   └── codegen/      # SchemaIR → optimized JS
│   │   ├── cli/              # CLI commands (generate, check, watch)
│   │   └── unplugin/         # Build plugin (Vite/webpack/esbuild/Rollup/Rolldown/rspack/Bun)
│   └── tests/
├── benchmarks/               # vitest bench (zod v3 vs v4 vs zod-aot vs ajv vs typia)
└── .github/workflows/        # CI + release automation
```

## Contributing

Contributions are welcome! Please ensure your changes pass all checks before submitting a PR:

```bash
pnpm lint && pnpm -r typecheck && pnpm test
```

## License

[MIT](LICENSE)
