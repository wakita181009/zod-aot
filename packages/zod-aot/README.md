# Zod AOT

**Compile Zod schemas into zero-overhead validation functions at build time.**

[![CI](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml/badge.svg)](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/wakita181009/zod-aot/graph/badge.svg)](https://codecov.io/gh/wakita181009/zod-aot)
[![npm](https://img.shields.io/npm/v/zod-aot)](https://www.npmjs.com/package/zod-aot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Keep your existing Zod schemas. Get **2-64x faster** validation. No code changes required.

```typescript
// vite.config.ts — add one line
import zodAot from "zod-aot/vite";
export default defineConfig({
  plugins: [zodAot({ autoDiscover: true })],
});
```

```typescript
// src/schemas.ts — write plain Zod, nothing else
import { z } from "zod";

export const UserSchema = z.object({
  name: z.string().min(3),
  email: z.email(),
  age: z.number().int().positive(),
});

// Use it anywhere — tRPC, Hono, React Hook Form, etc.
// At build time, zod-aot compiles it to a 3-64x faster validator.
```

## Install

```bash
npm install zod-aot zod@^4
```

| Runtime | Version |
|---------|---------|
| Node.js | 20+     |
| Bun     | 1.3+    |
| Deno    | 2.0+    |

## Usage

There are three ways to use zod-aot. Choose the one that fits your project.

### 1. autoDiscover (Recommended)

The plugin automatically detects and compiles all exported Zod schemas at build time. No wrappers, no imports from `zod-aot` in your source code.

**vite.config.ts:**

```typescript
import zodAot from "zod-aot/vite";

export default defineConfig({
  plugins: [zodAot({ autoDiscover: true })],
});
```

**Your schema file stays pure Zod:**

```typescript
// src/schemas.ts
import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().int().min(0).max(150),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.email().optional(),
});

export const ListUsersSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});
```

**Use them as usual:**

```typescript
const user = CreateUserSchema.parse(data);          // throws on failure
const result = CreateUserSchema.safeParse(data);    // { success, data/error }
```

At build time, the plugin:
1. Finds every file with `import ... from "zod"` (skips type-only imports)
2. Executes the file and detects exported Zod schemas
3. Compiles each schema into an optimized validator
4. Replaces the export with a tree-shakeable IIFE that preserves the full Zod API

**What "preserves the full Zod API" means:** The compiled schema inherits from the original Zod schema via `Object.create()`. So `._zod`, `.shape`, Standard Schema (`~standard`), `instanceof` checks — all still work. Libraries that accept Zod schemas (tRPC, Hono, React Hook Form) work without changes.

### 2. compile() (Explicit)

If you prefer explicit opt-in, wrap specific schemas with `compile()`:

```typescript
import { z } from "zod";
import { compile } from "zod-aot";

const UserSchema = z.object({
  name: z.string().min(3),
  email: z.email(),
});

export const validateUser = compile(UserSchema);

// In dev: falls back to Zod's runtime validation
// After build: uses AOT-compiled optimized code
validateUser.parse(data);
validateUser.safeParse(data);
```

`compile()` and `autoDiscover` coexist — `compile()` schemas are detected first, then `autoDiscover` picks up remaining plain Zod exports.

### 3. CLI (No Bundler)

Generate optimized validation files from the command line:

```bash
# Single file
npx zod-aot generate src/schemas.ts -o src/schemas.compiled.ts

# Directory
npx zod-aot generate src/ -o src/compiled/

# Watch mode
npx zod-aot generate src/ --watch
```

## Build Plugin

### Supported Build Tools

| Build Tool | Import |
|---|---|
| Vite | `import zodAot from "zod-aot/vite"` |
| webpack | `import zodAot from "zod-aot/webpack"` |
| esbuild | `import zodAot from "zod-aot/esbuild"` |
| Rollup | `import zodAot from "zod-aot/rollup"` |
| Rolldown | `import zodAot from "zod-aot/rolldown"` |
| rspack | `import zodAot from "zod-aot/rspack"` |
| Bun | `import zodAot from "zod-aot/bun"` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `autoDiscover` | `boolean` | `false` | Auto-detect all exported Zod schemas without `compile()` |
| `include` | `string[]` | — | Only process files matching these substrings |
| `exclude` | `string[]` | — | Skip files matching these substrings |
| `zodCompat` | `boolean` | `true` | Preserve Zod API via `Object.create()`. Set `false` for smaller output |
| `verbose` | `boolean` | `false` | Log per-schema compilation status during build |

```typescript
zodAot({
  autoDiscover: true,
  include: ["src/schemas"],
  verbose: true,
})
```

### autoDiscover: Side Effects Warning

With `autoDiscover`, the plugin executes files to inspect their exports. If a file imports Zod AND has side effects (starts a server, connects to a database), those side effects run at build time.

**Fix:** Use `include` to limit which files are scanned:

```typescript
zodAot({
  autoDiscover: true,
  include: ["src/schemas", "src/validators"],
})
```

### autoDiscover vs compile()

| | autoDiscover | compile() |
|---|---|---|
| Source code changes | None | Wrap each schema |
| `zod-aot` import needed | No | Yes |
| What gets compiled | All exported Zod schemas | Only wrapped schemas |
| Build-time file execution | Files with `import ... from "zod"` | Files with `import ... from "zod-aot"` |
| Best for | New projects, framework integration | Gradual adoption, selective optimization |

## Framework Examples

### tRPC

```typescript
// src/schemas.ts
import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().int().min(0).max(150),
});

// src/router.ts
import { CreateUserSchema } from "./schemas";

export const appRouter = t.router({
  createUser: t.procedure
    .input(CreateUserSchema)
    .mutation(({ input }) => createUser(input)),
});
```

With `autoDiscover: true`, `CreateUserSchema` is compiled at build time. The tRPC router uses the optimized version automatically. No `.input(compile(CreateUserSchema))` needed.

### Hono

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { UserSchema } from "./schemas";

const app = new Hono();

app.post("/users", zValidator("json", UserSchema), (c) => {
  const user = c.req.valid("json");
  return c.json(user);
});
```

### React Hook Form

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserSchema } from "./schemas";

function UserForm() {
  const form = useForm({
    resolver: zodResolver(UserSchema),
  });
  // ...
}
```

### Any Standard Schema Consumer

zod-aot compiled schemas implement [Standard Schema](https://standardschema.dev) via prototype chain. Any library that accepts Standard Schema validators works automatically.

## Schema Diagnostics

Analyze your schemas before compiling — check coverage, Fast Path eligibility, and get actionable hints:

```bash
npx zod-aot check src/schemas.ts
```

Output:

```
src/schemas.ts

  CreateUserSchema  [Fast Path]  100% compiled  (5 checks)
  ├─ name: string (min_length, max_length)
  ├─ email: string (string_format[email])
  ├─ age: number (number_format[safeint], greater_than)
  └─ role: enum

  OrderSchema  [Slow Path]  85% compiled  (3 checks)
  ├─ id: string (string_format[uuid])
  └─ metadata: object
      └─ audit: fallback(transform)
         Hint: Consider z.pipe() to keep inner schema compilable

  Summary: 2 schemas | 1 Fast Path, 1 Slow Path | 8/9 nodes (88.9%)
```

### CI Integration

```bash
# JSON output
npx zod-aot check src/schemas.ts --json

# Fail if any schema below 80% coverage
npx zod-aot check src/schemas.ts --json --fail-under 80
```

| Flag | Description |
|---|---|
| `--json` | Structured JSON output |
| `--fail-under <pct>` | Exit code 1 if coverage below threshold |
| `--no-color` | Disable colored output |

## What Gets Compiled

### Fully Compiled (3-64x faster)

`string`, `number`, `bigint`, `boolean`, `null`, `undefined`, `any`, `unknown`, `literal`, `enum`, `date`, `object`, `array`, `tuple`, `record`, `set`, `map`, `union`, `discriminatedUnion`, `intersection`, `pipe` (non-transform), `optional`, `nullable`, `readonly`, `default`, `catch`, `coerce`, `templateLiteral`, `symbol`, `void`, `nan`, `never`, `lazy` (self-recursive)

All standard Zod checks are supported: `min`, `max`, `length`, `email`, `url`, `uuid`, `regex`, `int`, `positive`, `negative`, `multipleOf`, `int32`, `uint32`, `float32`, `float64`, `includes`, `startsWith`, `endsWith`, and more.

### Falls Back to Zod (Still Works, Not Faster)

These types contain JavaScript closures that cannot be compiled to static code:

| Type | Why | Alternative |
|---|---|---|
| `transform` | Runtime data transformation function | Use `z.pipe()` when possible |
| `refine` / `superRefine` | Custom validation closures | Use built-in checks when possible |
| `custom` | Arbitrary validation logic | — |
| `preprocess` | Input preprocessing function | Use `z.coerce` when possible |
| `lazy` (non-recursive) | Cannot resolve inner type | Use self-referencing lazy for recursion |

**Partial fallback:** If an object has 10 properties and 1 uses `transform`, the other 9 are still compiled. Only the `transform` property falls back to Zod.

**Tip:** Run `npx zod-aot check` to see exactly which parts of your schemas are compiled and which fall back.

## Benchmarks

5-way comparison: **Zod v3** vs **Zod v4** vs **Zod AOT** vs **[Typia](https://typia.io/)** vs **[AJV](https://ajv.js.org/)**

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

Performance scales with schema complexity. Nested objects and arrays see the biggest gains because zod-aot eliminates per-node traversal overhead. `discriminatedUnion` uses O(1) `switch` dispatch instead of Zod's sequential trial. Partial fallback schemas (containing `transform`/`refine`) still show 2-6x speedups.

```bash
pnpm bench   # run locally
```

### Performance Architecture

For eligible schemas, zod-aot generates a **two-phase validator**:

1. **Fast Path** — A single `&&` expression chain that validates the entire input with zero allocations. Valid input returns immediately.
2. **Slow Path** — Error-collecting validation that only runs when the Fast Path fails.

Additional optimizations: check ordering (cheap checks first), pre-compiled regex, Set-based enum lookups, small enum inlining (`===` for 1-3 values).

Run `npx zod-aot check --json` to see which schemas qualify for Fast Path.

## License

[MIT](LICENSE)
