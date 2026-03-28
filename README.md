# Zod AOT

**Compile Zod schemas into zero-overhead validation functions at build time.**

[![CI](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml/badge.svg)](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/wakita181009/zod-aot/graph/badge.svg)](https://codecov.io/gh/wakita181009/zod-aot)
[![npm](https://img.shields.io/npm/v/zod-aot)](https://www.npmjs.com/package/zod-aot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

No code changes required — keep your existing Zod schemas and get **2-64x faster** validation.

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
| string (min/max) | 8.3M | 6.0M | **11.1M** | 11.3M | 9.5M | 1.8x |
| number (int+positive) | 8.2M | 5.8M | **10.9M** | 10.7M | 10.9M | 1.9x |
| tuple [string, int, bool] | 4.0M | 4.4M | **10.5M** | 10.8M | 10.5M | 2.4x |
| discriminatedUnion (3) | 2.3M | 2.9M | **9.8M** | 10.4M | 5.6M | 3.4x |
| medium object (valid) | 1.3M | 1.7M | **5.4M** | 7.3M | 5.0M | 3.1x |
| large object (10 items) | 82K | 111K | **4.0M** | 4.1M | 834K | **36x** |
| large object (100 items) | 9.0K | 11.6K | **676K** | 808K | 89K | **58x** |
| recursive tree (121 nodes) | 24K | 101K | **741K** | 1.4M | 250K | 7.4x |
| event log (combined) | 260K | 479K | **4.5M** | — | — | 9.4x |

*ops/s, higher is better. Measured with `vitest bench` on Apple M-series. Full results in [packages/zod-aot](./packages/zod-aot/README.md#benchmarks).*

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
