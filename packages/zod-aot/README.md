# Zod AOT

**Compile Zod schemas into zero-overhead validation functions at build time.**

[![CI](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml/badge.svg)](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/wakita181009/zod-aot/graph/badge.svg)](https://codecov.io/gh/wakita181009/zod-aot)
[![npm](https://img.shields.io/npm/v/zod-aot)](https://www.npmjs.com/package/zod-aot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

No code changes required — keep your existing Zod schemas and get **2-64x faster** validation.

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

| Scenario | Zod v3 | Zod v4 | **Zod AOT** | Typia | AJV | vs Zod v4 |
|---|---|---|---|---|---|---|
| simple string | 8.7M | 10.0M | **11.0M** | 11.0M | 11.1M | 1.1x |
| string (min/max) | 8.3M | 6.0M | **11.1M** | 11.3M | 9.5M | 1.8x |
| number (int+positive) | 8.2M | 5.8M | **10.9M** | 10.7M | 10.9M | 1.9x |
| enum | 8.0M | 9.5M | **10.6M** | 10.6M | 10.5M | 1.1x |
| bigint (min/max) | 8.0M | 6.0M | **10.9M** | — | — | 1.8x |
| tuple [string, int, bool] | 4.0M | 4.4M | **10.5M** | 10.8M | 10.5M | 2.4x |
| record\<string, number\> | 2.3M | 1.9M | **5.4M** | 7.5M | 9.4M | 2.8x |
| set\<string\> (5 items) | 2.7M | 1.6M | **9.8M** | — | — | 6.3x |
| set\<string\> (20 items) | 1.0M | 475K | **7.7M** | — | — | **16x** |
| map\<string, number\> (5 entries) | 1.5M | 946K | **8.5M** | — | — | 9.0x |
| map\<string, number\> (20 entries) | 490K | 238K | **5.2M** | — | — | **22x** |
| pipe (non-transform) | 6.3M | 3.8M | **10.8M** | — | — | 2.8x |
| discriminatedUnion (3 variants) | 2.3M | 2.9M | **9.8M** | 10.4M | 5.6M | 3.4x |
| medium object (valid) | 1.3M | 1.7M | **5.4M** | 7.3M | 5.0M | 3.1x |
| medium object (invalid) | 351K | 65K | **471K** | 2.1M | 5.6M | 7.3x |
| large object (10 items) | 82K | 111K | **4.0M** | 4.1M | 834K | **36x** |
| large object (100 items) | 9.0K | 11.6K | **676K** | 808K | 89K | **58x** |
| recursive tree (7 nodes) | 424K | 1.5M | **6.4M** | 8.1M | 3.1M | 4.1x |
| recursive tree (121 nodes) | 24K | 101K | **741K** | 1.4M | 250K | 7.4x |
| event log (combined) | 260K | 479K | **4.5M** | — | — | 9.4x |
| partial fallback obj (transform) | 817K | 1.4M | **3.3M** | — | — | 2.3x |
| partial fallback arr 10 (transform) | 88K | 139K | **841K** | — | — | 6.1x |
| partial fallback arr 50 (transform) | 18K | 28K | **175K** | — | — | 6.3x |

*ops/s, higher is better. "—" = not supported by the library. Measured with `vitest bench` on Apple M-series.*

Performance gains scale with schema complexity. The `discriminatedUnion` optimization uses an O(1) `switch` dispatch instead of Zod's sequential trial approach. Partial fallback schemas (containing `transform`/`refine`) still show 2-6x speedups by compiling the optimizable portions. Set/Map/BigInt are only benchmarked among Zod variants as AJV and Typia lack native support for these types.

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

# Diagnose schemas — tree view, coverage, Fast Path, hints
npx zod-aot check src/schemas.ts

# JSON output for CI integration
npx zod-aot check src/schemas.ts --json

# Fail CI if coverage < 80%
npx zod-aot check src/schemas.ts --json --fail-under 80
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
  verbose: true,              // log per-schema compilation status and build summary
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

## Schema Diagnostics (`check`)

The `check` command analyzes schemas for compilation coverage, Fast Path eligibility, and actionable hints — without generating code.

```bash
npx zod-aot check src/schemas.ts
```

**Output includes:**

- **Tree view** — hierarchical visualization of schema structure with compile/fallback status per node
- **Coverage** — percentage of schema nodes that are compiled (e.g. `85% compiled (17/20 nodes)`)
- **Fast Path eligibility** — whether the schema qualifies for two-phase validation, with the specific blocker if ineligible
- **Hints** — actionable suggestions (e.g. "Replace `.refine()` with built-in checks")

### Options

| Flag | Description |
|---|---|
| `--json` | Output structured JSON (for CI/CD integration) |
| `--fail-under <pct>` | Exit with code 1 if any schema's coverage is below the threshold |
| `--no-color` | Disable colored output |

### JSON output

```bash
npx zod-aot check src/schemas.ts --json
```

```json
[
  {
    "file": "src/schemas.ts",
    "schemas": [
      {
        "exportName": "validateUser",
        "coverage": { "total": 5, "compilable": 5, "percent": 100 },
        "fastPath": { "eligible": true },
        "fallbacks": []
      }
    ]
  }
]
```

### CI gate

```bash
npx zod-aot check src/schemas.ts --json --fail-under 80
```

Exits with code 1 if any schema's compilation coverage drops below 80%.

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
| `number` | `int`, `positive`, `negative`, `nonnegative`, `nonpositive`, `min`, `max`, `multipleOf`, `int32`, `uint32`, `float32`, `float64` |
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
