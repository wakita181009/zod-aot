# zod-aot

**Compile Zod schemas into zero-overhead validation functions at build time.**

[![CI](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml/badge.svg)](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/zod-aot)](https://www.npmjs.com/package/zod-aot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

No code changes required — keep your existing Zod schemas and get **2-64x faster** validation.

## Why

Zod v4 is already fast, but runtime schema traversal still costs ~10x compared to ahead-of-time (AOT) compiled approaches. Existing AOT solutions like [Typia](https://typia.io/) require rewriting your schemas as TypeScript types. **zod-aot** bridges this gap — it takes your existing Zod schemas and generates optimized, plain JavaScript validation functions at build time.

| | zod-aot | Typia | AJV standalone | Zod v4 |
|---|---|---|---|---|
| **Input** | Zod schemas | TS types | JSON Schema | Zod schemas |
| **Existing code changes** | None | Full rewrite | Full rewrite | N/A |
| **Type inference** | Inherited from Zod | Native | External | Native |
| **Runtime dependency** | None (generated code) | Typia runtime | AJV runtime | Zod |

## Benchmarks

Measured with `vitest bench` on Node.js (Apple M-series):

### safeParse

| Scenario | Zod v4 | zod-aot | Speedup |
|---|---|---|---|
| simple string | 10.4M ops/s | 17.9M ops/s | **1.7x** |
| string (min/max) | 5.3M ops/s | 17.6M ops/s | **3.3x** |
| number (int+positive) | 5.2M ops/s | 16.4M ops/s | **3.1x** |
| enum | 8.7M ops/s | 15.5M ops/s | **1.8x** |
| tuple [string, int, boolean] | 4.3M ops/s | 17.1M ops/s | **3.9x** |
| record\<string, number\> (5 keys) | 1.9M ops/s | 8.3M ops/s | **4.3x** |
| discriminatedUnion (3 variants) | 3.0M ops/s | 15.7M ops/s | **5.3x** |
| medium object (7 props, valid) | 1.7M ops/s | 6.6M ops/s | **4.0x** |
| medium object (7 props, invalid) | 65K ops/s | 1.5M ops/s | **23x** |
| large object (10 nested items) | 111K ops/s | 4.8M ops/s | **43x** |
| large object (100 nested items) | 11.9K ops/s | 713K ops/s | **60x** |
| event log (combined) | 431K ops/s | 5.0M ops/s | **12x** |
| partial fallback object (transform) | 1.2M ops/s | 3.0M ops/s | **2.5x** |
| partial fallback array 10 (transform) | 447K ops/s | 2.1M ops/s | **4.6x** |
| partial fallback array 50 (transform) | 100K ops/s | 467K ops/s | **4.7x** |

Performance gains scale with schema complexity. The `discriminatedUnion` optimization uses an O(1) `switch` dispatch instead of Zod's sequential trial approach. Partial fallback schemas (containing `transform`/`refine`) still show 2.5-4.7x speedups by compiling the optimizable portions.

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
const isUser = validateUser.is(data);           // type guard (boolean)
```

### 3. Generate optimized code

Choose one of these approaches:

**Option A: Build plugin (Vite / webpack / esbuild / Rollup)**

```typescript
// vite.config.ts
import zodAot from "zod-aot/vite";

export default defineConfig({
  plugins: [zodAot()],
});
```

Also available: `zod-aot/webpack`, `zod-aot/esbuild`, `zod-aot/rollup`

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

## Low-Level API

For custom build scripts or advanced use cases, you can use the extractor and code generator directly:

```typescript
import { z } from "zod";
import { extractSchema, generateValidator } from "zod-aot";

const UserSchema = z.object({
  name: z.string().min(3),
  age: z.number().int().positive(),
});

// Extract schema into intermediate representation (IR)
const ir = extractSchema(UserSchema);

// Generate optimized JavaScript validation code
const { code, functionName } = generateValidator(ir, "validateUser");

// Execute the generated code
const safeParse = new Function(`${code}\nreturn ${functionName};`)();
const result = safeParse({ name: "Alice", age: 30 });
```

### `createFallback(zodSchema)`

Wraps a Zod schema to provide the `CompiledSchema` interface, delegating to Zod at runtime. Useful for development or unsupported schema types:

```typescript
import { createFallback } from "zod-aot";

const validator = createFallback(UserSchema);
validator.parse(data);      // throws on failure
validator.safeParse(data);  // { success, data/error }
validator.is(data);         // type guard (boolean)
```

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
var __re_email_0 = new RegExp("...");
var __set_1 = new Set(["admin", "user"]);

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
    if (!__set_1.has(input["role"])) {
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

### `extractSchema(zodSchema): SchemaIR`

Extracts a JSON-serializable intermediate representation (IR) from a Zod schema by traversing its internal `_zod.def` structure.

```typescript
import { z } from "zod";
import { extractSchema } from "zod-aot";

const ir = extractSchema(z.string().min(3));
// { type: "string", checks: [{ kind: "min_length", minimum: 3 }] }
```

Schemas containing `transform`, `refine`, `superRefine`, or `custom` produce a `FallbackIR`:

```typescript
const ir = extractSchema(z.string().transform((s) => parseInt(s)));
// { type: "fallback", reason: "transform" }
```

### `generateValidator(ir, name): CodeGenResult`

Generates optimized JavaScript validation code from a SchemaIR.

```typescript
import { generateValidator } from "zod-aot";

const { code, functionName } = generateValidator(ir, "myValidator");
// code: preamble (var declarations for Sets, RegExps, etc.)
// functionName: full function expression string
```

To execute the generated code:

```typescript
const safeParse = new Function(`${code}\nreturn ${functionName};`)();
const result = safeParse({ name: "Alice", age: 30 });
```

### `createFallback<T>(zodSchema): CompiledSchema<T>`

Wraps a Zod schema to provide the `CompiledSchema` interface, delegating to Zod at runtime.

```typescript
import { createFallback } from "zod-aot";

const validator = createFallback<User>(UserSchema);
validator.parse(data);      // T — throws on failure
validator.safeParse(data);  // SafeParseResult<T>
validator.is(data);         // input is T (type guard)
validator.schema;           // reference to original Zod schema
```

### `CompiledSchema<T>`

The shared interface for both generated validators and runtime fallbacks:

```typescript
interface CompiledSchema<T> {
  parse(input: unknown): T;
  safeParse(input: unknown): SafeParseResult<T>;
  is(input: unknown): input is T;
  schema: unknown;
}
```

### `SchemaIR`

The intermediate representation — a discriminated union of all supported schema types:

| IR Type | Zod Equivalent |
|---|---|
| `StringIR` | `z.string()`, `z.email()`, `z.url()`, `z.uuid()` |
| `NumberIR` | `z.number()`, `z.int()` |
| `BooleanIR` | `z.boolean()` |
| `NullIR` | `z.null()` |
| `UndefinedIR` | `z.undefined()` |
| `LiteralIR` | `z.literal(...)` |
| `EnumIR` | `z.enum([...])` |
| `ObjectIR` | `z.object({...})` |
| `ArrayIR` | `z.array(...)` |
| `UnionIR` | `z.union([...])` |
| `OptionalIR` | `.optional()` |
| `NullableIR` | `.nullable()` |
| `AnyIR` | `z.any()` |
| `UnknownIR` | `z.unknown()` |
| `ReadonlyIR` | `.readonly()` |
| `DateIR` | `z.date()` |
| `TupleIR` | `z.tuple([...])` |
| `RecordIR` | `z.record(...)` |
| `DefaultIR` | `.default(...)` |
| `IntersectionIR` | `z.intersection(...)` / `.and(...)` |
| `DiscriminatedUnionIR` | `z.discriminatedUnion(...)` |
| `FallbackIR` | `transform`, `refine`, etc. |

## Supported Types

### Tier 1 — Primitives & Core

| Type | Supported Checks |
|---|---|
| `string` | `min`, `max`, `length`, `email`, `url`, `uuid`, `regex` |
| `number` | `int`, `positive`, `negative`, `nonnegative`, `nonpositive`, `min`, `max`, `multipleOf` |
| `boolean` | — |
| `null` | — |
| `undefined` | — |
| `literal` | single value, multi-value |
| `enum` | string enum values |
| `object` | nested objects, mixed property types |
| `array` | `min`, `max`, `length`, element validation |
| `union` | sequential trial of all options |
| `optional` | wraps any supported type |
| `nullable` | wraps any supported type |

### Tier 2 — Composites & Extended

| Type | Supported Checks |
|---|---|
| `any` | — (always passes) |
| `unknown` | — (always passes) |
| `readonly` | validates inner type (TS-only concept) |
| `date` | `min`, `max` (timestamp comparison) |
| `tuple` | per-element types, optional rest element |
| `record` | key and value type validation |
| `default` | replaces `undefined` with default value, then validates inner |
| `intersection` | validates both left and right schemas |
| `discriminatedUnion` | O(1) `switch` dispatch on discriminator field |

### Automatic Fallback to Zod

These schema types contain JavaScript closures that cannot be compiled to static code. They are detected during extraction and produce a `FallbackIR`:

- `transform` — runtime data transformation
- `refine` / `superRefine` — custom validation with closures
- `custom` — arbitrary validation logic
- `preprocess` — input preprocessing

#### Partial Fallback

When a schema contains a mix of compilable and non-compilable parts (e.g., an object where some properties use `transform`/`refine`), zod-aot compiles the optimizable parts and delegates only the non-compilable properties to Zod at runtime.

> **Note:** If a schema heavily relies on `transform`, `refine`, or other non-compilable features, the performance benefit from partial fallback will be minimal — most of the validation work is still delegated to Zod. Partial fallback is most effective when only a small portion of the schema uses these features.

### Planned (Tier 3)

| Tier | Types |
|---|---|
| Tier 3 | `lazy`, `pipe` (non-transform), `template_literal`, `bigint`, `map`, `set` |

## Roadmap

### Phase 1: Core Compiler — Complete

- [x] SchemaIR type definitions
- [x] Extractor: `_zod.def` → SchemaIR (Tier 1 types)
- [x] CodeGen: SchemaIR → optimized JS
- [x] Runtime fallback (`createFallback`)
- [x] Benchmarks (vitest bench + standalone scripts)
- [x] E2E compatibility tests (Zod ↔ generated code)
- [x] CI/CD (GitHub Actions + npm publish)

### Phase 2: Type Expansion + CLI + Build Plugin

- [x] Tier 2 type support (9 types: any, unknown, readonly, date, tuple, record, default, intersection, discriminatedUnion)
- [x] `discriminatedUnion` → O(1) switch statement optimization
- [x] CLI (`npx zod-aot generate` / `npx zod-aot check`)
- [x] Partial fallback (objects with some transform properties)
- [x] unplugin integration (Vite / webpack / esbuild / Rollup)
- [x] Watch mode (`--watch` / `-w`)

### Phase 3: Ecosystem

- [ ] Tier 3 type support
- [ ] Documentation site

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run benchmarks (Zod v4 vs zod-aot)
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
│   │   ├── index.ts          # Public API exports
│   │   ├── types.ts          # SchemaIR, CompiledSchema, CheckIR
│   │   ├── runtime.ts        # createFallback (dev-time)
│   │   ├── extractor/        # _zod.def → SchemaIR
│   │   └── codegen/          # SchemaIR → optimized JS
│   └── tests/
│       ├── integration.test.ts   # E2E: Zod ↔ generated code
│       ├── extractor/            # Extractor unit tests
│       ├── codegen/              # CodeGen unit tests
│       └── runtime.test.ts       # Fallback tests
├── benchmarks/               # vitest bench + standalone scripts
│   ├── standalone/
│   │   ├── zod-only.ts       # Standalone Zod benchmark
│   │   └── zod-aot.ts        # Standalone zod-aot benchmark
│   └── ...
└── .github/workflows/        # CI + release automation
```

## Contributing

Contributions are welcome! Please ensure your changes pass all checks before submitting a PR:

```bash
pnpm lint && pnpm -r typecheck && pnpm test
```

## License

[MIT](LICENSE)