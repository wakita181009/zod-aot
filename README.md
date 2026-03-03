# zod-aot

Compile Zod schemas into zero-overhead validation functions at build time.

**No code changes required** — keep your existing Zod schemas and get 3-47x faster validation.

## Why

Zod v4 is fast, but still ~10x slower than AOT approaches like Typia. Typia requires rewriting schemas as TypeScript types. zod-aot bridges this gap — it takes your existing Zod schemas and generates optimized validation code at build time.

| | zod-aot | Typia | AJV standalone | Zod v4 |
|---|---|---|---|---|
| Input | Zod schemas | TS types | JSON Schema | Zod schemas |
| Existing code changes | None | Full rewrite | Full rewrite | N/A |
| Type inference | Inherited from Zod | Native | External | Native |

## Benchmarks

Measured with vitest bench on Node.js (Apple M-series):

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

Performance gains scale with schema complexity. Larger, nested schemas see the biggest improvements.

## Install

```bash
npm install zod-aot
# zod v4 is a peer dependency
npm install zod@^4
```

## Usage

```typescript
import { z } from "zod";
import { extractSchema, generateValidator } from "zod-aot";

const UserSchema = z.object({
  name: z.string().min(3),
  age: z.number().int().positive(),
  email: z.email(),
  role: z.enum(["admin", "user"]),
});

// 1. Extract schema to IR
const ir = extractSchema(UserSchema);

// 2. Generate optimized validator code
const { code, functionName } = generateValidator(ir, "validateUser");

// 3. The generated code is a self-contained JS function
// In production, write this to a file at build time
console.log(code);
```

### Runtime Fallback (Development)

```typescript
import { createFallback } from "zod-aot";

// Delegates to Zod — use during development before build step
const validator = createFallback(UserSchema);

validator.parse(data);           // throws on failure
validator.safeParse(data);       // { success, data/error }
validator.is(data);              // type guard (boolean)
```

## How It Works

```
Zod Schema → Extract (_zod.def) → SchemaIR → CodeGen → Optimized JS function
```

1. **Extract**: Recursively traverse Zod's internal `_zod.def` to produce a JSON-serializable IR
2. **CodeGen**: Transform IR into optimized JS with inline type checks, pre-compiled regexes, and Set-based enum lookups
3. **Emit**: Generated code runs as a plain function — no schema traversal at runtime

### Generated Code Example

Input:
```typescript
z.object({
  name: z.string().min(3).max(50),
  role: z.enum(["admin", "user"]),
})
```

Output:
```javascript
var __set_0 = new Set(["admin", "user"]);

function safeParse_validate(input) {
  var __issues = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    __issues.push({ code: "invalid_type", expected: "object", path: [] });
  } else {
    if (typeof input["name"] !== "string") {
      __issues.push({ code: "invalid_type", expected: "string", path: ["name"] });
    } else {
      if (input["name"].length < 3) __issues.push({ code: "too_small", minimum: 3, path: ["name"] });
      if (input["name"].length > 50) __issues.push({ code: "too_big", maximum: 50, path: ["name"] });
    }
    if (!__set_0.has(input["role"])) {
      __issues.push({ code: "invalid_enum_value", path: ["role"] });
    }
  }
  if (__issues.length > 0) return { success: false, error: { issues: __issues } };
  return { success: true, data: input };
}
```

## Supported Types

### Tier 1 (Implemented)

string, number, boolean, null, undefined, literal, enum, object, array, union, optional, nullable

**String checks**: min, max, length, email, url, uuid, regex

**Number checks**: int, positive, negative, nonnegative, nonpositive, min, max, multipleOf

### Fallback to Zod

transform, refine, superRefine, custom, preprocess — these contain JS closures and cannot be compiled. They fall back to Zod at runtime.

## Development

```bash
pnpm install
pnpm test           # run tests
pnpm bench          # run benchmarks (zod vs zod-aot)
pnpm lint           # biome check
pnpm -r typecheck   # tsc --noEmit
```

## License

MIT
