# zod-aot

**Compile Zod schemas into zero-overhead validation functions at build time.**

[![CI](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml/badge.svg)](https://github.com/wakita181009/zod-aot/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/zod-aot)](https://www.npmjs.com/package/zod-aot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

No code changes required — keep your existing Zod schemas and get **3-47x faster** validation.

## Packages

| Package | Description |
|---|---|
| [zod-aot](./packages/zod-aot/) | Core compiler — extractor, codegen, and runtime fallback |

## Quick Start

```bash
npm install zod-aot zod@^4
```

```typescript
import { z } from "zod";
import { extractSchema, generateValidator } from "zod-aot";

const UserSchema = z.object({
  name: z.string().min(3),
  age: z.number().int().positive(),
  email: z.email(),
});

const ir = extractSchema(UserSchema);
const { code, functionName } = generateValidator(ir, "validateUser");
```

See the [full documentation](./packages/zod-aot/README.md) for API reference, benchmarks, and usage details.

## Runtime Support

| Runtime | Version | Status |
|---------|---------|--------|
| Node.js | 20+     | Fully supported |
| Bun     | 1.2+    | Fully supported |
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