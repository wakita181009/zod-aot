# zod-aot

**Compile Zod schemas into zero-overhead validation functions at build time.**

[![CI](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml/badge.svg)](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/zod-aot)](https://www.npmjs.com/package/zod-aot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

No code changes required — keep your existing Zod schemas and get **3-47x faster** validation.

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

| Scenario | Zod v4 | zod-aot | Speedup |
|---|---|---|---|
| simple string | 11.8M ops/s | 18.6M ops/s | **1.6x** |
| string (min/max) | 7.4M ops/s | 17.9M ops/s | **2.4x** |
| number (int+positive) | 6.7M ops/s | 18.0M ops/s | **2.7x** |
| enum | 9.6M ops/s | 15.9M ops/s | **1.7x** |
| medium object (7 props, valid) | 1.9M ops/s | 6.5M ops/s | **3.4x** |
| medium object (7 props, invalid) | 65K ops/s | 1.5M ops/s | **23x** |
| large object (10 nested items) | 147K ops/s | 4.8M ops/s | **32x** |
| large object (100 nested items) | 15.6K ops/s | 714K ops/s | **46x** |

Performance gains scale with schema complexity. Larger, nested schemas with arrays see the biggest improvements.

## Runtime Support

| Runtime | Version | Status |
|---------|---------|--------|
| Node.js | 20+     | Fully supported |
| Bun     | 1.2+    | Fully supported |
| Deno    | 2.0+    | Fully supported |

## Install

```bash
npm install zod-aot
# zod v4 is a peer dependency
npm install zod@^4
```

## Quick Start

```typescript
import { z } from "zod";
import { extractSchema, generateValidator } from "zod-aot";

// 1. Define your Zod schema as usual
const UserSchema = z.object({
  name: z.string().min(3),
  age: z.number().int().positive(),
  email: z.email(),
  role: z.enum(["admin", "user"]),
});

// 2. Extract the schema into an intermediate representation (IR)
const ir = extractSchema(UserSchema);

// 3. Generate an optimized validator function
const { code, functionName } = generateValidator(ir, "validateUser");

// 4. The generated code is a self-contained JS function
//    In production, write this to a file at build time
console.log(code);         // preamble: Set/RegExp declarations
console.log(functionName); // function safeParse_validateUser(input) { ... }
```

### Using the Generated Code

The generated code can be evaluated at build time and written to a file:

```typescript
// Build script example
import { writeFileSync } from "node:fs";
import { extractSchema, generateValidator } from "zod-aot";

const ir = extractSchema(UserSchema);
const { code, functionName } = generateValidator(ir, "validateUser");

// Write to a .js file
writeFileSync(
  "src/validators/user.generated.js",
  `${code}\nexport const validateUser = ${functionName}`,
);
```

Then import and use in your application:

```typescript
import { validateUser } from "./validators/user.generated.js";

const result = validateUser(data);
// { success: true, data: { name: "Alice", ... } }
// or { success: false, error: { issues: [...] } }
```

### Runtime Fallback (Development)

During development — before running the build step — use `createFallback` to wrap Zod schemas with the same interface:

```typescript
import { z } from "zod";
import { createFallback } from "zod-aot";

const UserSchema = z.object({
  name: z.string().min(3),
  age: z.number().int().positive(),
});

// Delegates to Zod at runtime — same interface as compiled validators
const validator = createFallback(UserSchema);

validator.parse(data);      // throws ZodError on failure
validator.safeParse(data);  // { success, data/error }
validator.is(data);         // type guard (boolean)
```

This lets you write code against the `CompiledSchema` interface and swap in the generated code at build time without changing any call sites.

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
| `FallbackIR` | `transform`, `refine`, etc. |

## Supported Types

### Tier 1 (Implemented)

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
| `union` | all Tier 1 types as options |
| `optional` | wraps any Tier 1 type |
| `nullable` | wraps any Tier 1 type |

### Automatic Fallback to Zod

These schema types contain JavaScript closures that cannot be compiled to static code. They are detected during extraction and produce a `FallbackIR`:

- `transform` — runtime data transformation
- `refine` / `superRefine` — custom validation with closures
- `custom` — arbitrary validation logic
- `preprocess` — input preprocessing

### Planned (Tier 2 & 3)

| Tier | Types |
|---|---|
| Tier 2 | `tuple`, `record`, `intersection`, `discriminatedUnion`, `date`, `any`, `unknown`, `default`, `readonly` |
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

- [ ] CLI (`npx zod-aot generate` / `npx zod-aot check`)
- [ ] Tier 2 type support
- [ ] `discriminatedUnion` → switch statement optimization
- [ ] Partial fallback (objects with some transform properties)
- [ ] unplugin integration (Vite / Webpack / esbuild)
- [ ] Watch mode

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
├── benchmarks/               # vitest bench (Zod vs zod-aot)
├── apps/
│   ├── bench-zod-only/       # Standalone Zod benchmark
│   └── bench-zod-aot/        # Standalone zod-aot benchmark
└── .github/workflows/        # CI + release automation
```

## Contributing

Contributions are welcome! Please ensure your changes pass all checks before submitting a PR:

```bash
pnpm lint && pnpm -r typecheck && pnpm test
```

## License

[MIT](LICENSE)