# Zod AOT

**Compile Zod schemas into zero-overhead validation functions at build time.**

[![CI](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml/badge.svg)](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/wakita181009/zod-aot/graph/badge.svg)](https://codecov.io/gh/wakita181009/zod-aot)
[![npm](https://img.shields.io/npm/v/zod-aot)](https://www.npmjs.com/package/zod-aot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

No code changes required — keep your existing Zod schemas and get **2-60x faster** validation.

## Packages

| Package | Description |
|---|---|
| [zod-aot](./packages/zod-aot/) | Core compiler — extractor, codegen, runtime fallback, and build plugins |

## Quick Start

```bash
npm install zod-aot zod@^4
```

### Build Plugin (Recommended)

zod-aot provides build plugins for Vite, webpack, esbuild, Rollup, Rolldown, and rspack via [unplugin](https://github.com/unjs/unplugin). The plugin automatically detects `compile()` calls and replaces them with optimized inline validators at build time.

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import zodAot from "zod-aot/vite";

export default defineConfig({
  plugins: [zodAot()],
});
```

```typescript
// src/schemas.ts
import { z } from "zod";
import { compile } from "zod-aot";

const UserSchema = z.object({
  name: z.string().min(3),
  age: z.number().int().positive(),
  email: z.email(),
});

// Falls back to Zod in dev, replaced with optimized code at build time
export const validateUser = compile(UserSchema);

validateUser.parse(data);       // throws ZodError on failure
validateUser.safeParse(data);   // { success, data/error }
```

Available plugins:

| Build Tool | Import |
|---|---|
| Vite | `import zodAot from "zod-aot/vite"` |
| webpack | `import zodAot from "zod-aot/webpack"` |
| esbuild | `import zodAot from "zod-aot/esbuild"` |
| Rollup | `import zodAot from "zod-aot/rollup"` |
| Rolldown | `import zodAot from "zod-aot/rolldown"` |
| rspack | `import zodAot from "zod-aot/rspack"` |
| Bun | `import zodAot from "zod-aot/bun"` |

### Zod Ecosystem Compatibility

`compile()` returns a full Zod schema with AOT-optimized validation methods. It works seamlessly with any library that accepts Zod schemas, such as [`@hono/zod-validator`](https://github.com/honojs/middleware/tree/main/packages/zod-validator):

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

### CLI (Alternative)

If you don't use a bundler, you can generate optimized validation files from the command line:

```bash
npx zod-aot generate src/schemas.ts -o src/schemas.compiled.ts
npx zod-aot generate src/ -o src/compiled/
npx zod-aot generate src/ --watch
```

See the [full documentation](./packages/zod-aot/README.md) for API reference, benchmarks, and usage details.

## Benchmarks

5-way comparison: **Zod v3** vs **Zod v4** vs **Zod AOT** vs **[Typia](https://typia.io/)** vs **[AJV](https://ajv.js.org/)**

| Scenario | Zod v3 | Zod v4 | **Zod AOT** | Typia | AJV | vs Zod v4 |
|---|---|---|---|---|---|---|
| simple string | 9.0M | 9.7M | **11.5M** | 11.0M | 10.8M | 1.2x |
| string (min/max) | 8.2M | 5.5M | **10.9M** | 10.3M | 9.1M | 2.0x |
| number (int+positive) | 8.4M | 5.8M | **10.3M** | 11.4M | 10.5M | 1.8x |
| tuple [string, int, bool] | 4.0M | 4.5M | **10.1M** | 10.5M | 9.9M | 2.2x |
| discriminatedUnion (3) | 2.3M | 2.8M | **9.9M** | 10.1M | 5.6M | 3.5x |
| medium object (valid) | 1.2M | 1.7M | **5.3M** | 7.2M | 4.5M | 3.1x |
| large object (10 items) | 81K | 106K | **3.9M** | 4.1M | 820K | **37x** |
| large object (100 items) | 8.6K | 11.3K | **684K** | 818K | 86K | **60x** |
| recursive tree (121 nodes) | 23K | 102K | **714K** | 1.4M | 249K | 7.0x |
| event log (combined) | 270K | 474K | **4.4M** | — | — | 9.2x |

*ops/s, higher is better. Measured with `vitest bench` on Apple M-series. Full results in [packages/zod-aot](./packages/zod-aot/README.md#benchmarks).*

### Performance Architecture

zod-aot uses a **two-phase validation** strategy for eligible schemas:

1. **Fast Path**: A single boolean expression chain (`&&`) that validates the entire input with zero allocations. On valid input, returns `{success: true, data: input}` immediately.
2. **Slow Path**: Falls back to the existing error-collecting validation if the fast check fails.

Additional optimizations:
- **Check ordering**: Cheapest checks (length comparisons) run before expensive ones (regex)
- **Small enum inlining**: Enums with 1-3 values use direct `===` comparisons instead of `Set.has()`
- **Pre-compiled regex + Set**: Shared across fast and slow paths via preamble declarations

## Runtime Support

| Runtime | Version | Status |
|---------|---------|--------|
| Node.js | 20+     | Fully supported |
| Bun     | 1.3+    | Fully supported |
| Deno    | 2.0+    | Fully supported |

## Development

```bash
pnpm install
pnpm test
pnpm bench
pnpm lint
```

## License

[MIT](LICENSE)
