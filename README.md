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

zod-aot provides build plugins for Vite, webpack, esbuild, and Rollup via [unplugin](https://github.com/unjs/unplugin). The plugin automatically detects `compile()` calls and replaces them with optimized inline validators at build time.

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
validateUser.is(data);          // type guard (boolean)
```

Available plugins:

| Build Tool | Import |
|---|---|
| Vite | `import zodAot from "zod-aot/vite"` |
| webpack | `import zodAot from "zod-aot/webpack"` |
| esbuild | `import zodAot from "zod-aot/esbuild"` |
| Rollup | `import zodAot from "zod-aot/rollup"` |

### CLI (Alternative)

If you don't use a bundler, you can generate optimized validation files from the command line:

```bash
npx zod-aot generate src/schemas.ts -o src/schemas.compiled.ts
npx zod-aot generate src/ -o src/compiled/
npx zod-aot generate src/ --watch
```

See the [full documentation](./packages/zod-aot/README.md) for API reference, benchmarks, and usage details.

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