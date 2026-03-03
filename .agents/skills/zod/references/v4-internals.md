# Zod v4 Internal Structure Guide

Complete guide to Zod v4's internal `_zod` property, schema definition objects, check structures, and bag metadata. This knowledge is essential for building tools that programmatically inspect, extract, or compile Zod schemas (e.g., AOT compilers, code generators, schema serializers).

**Last Updated**: 2026-03-03

---

## The `_zod` Property

Every Zod schema instance exposes an internal `_zod` property containing the schema's full definition and metadata. This is the primary entry point for programmatic schema introspection.

```typescript
import { z } from "zod";

const schema = z.string().min(3).max(50);

// Access internals
schema._zod.def;      // Schema definition object
schema._zod.bag;      // Aggregated metadata from checks
schema._zod.version;  // { major, minor, patch }
```

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `_zod.def` | `object` | The schema definition -- type, checks, and type-specific fields |
| `_zod.def.type` | `string` | Schema type identifier (see Schema Types below) |
| `_zod.def.checks` | `array` | Array of check schema instances (for string, number, array) |
| `_zod.bag` | `object` | Aggregated metadata computed from checks |
| `_zod.version` | `object` | Zod version as `{ major, minor, patch }` |

### Important: `_zod.def` is JSON-serializable

Zod v4's `_zod.def` structure is designed to be JSON-serializable (excluding schema instance references). This makes it possible to:
- Extract schema definitions at runtime and serialize them
- Pass schema definitions across process boundaries
- Build AOT compilers that read `_zod.def` and generate optimized code

---

## Schema Types (`_zod.def.type`)

The `_zod.def.type` field identifies the schema kind. Here are all the type strings:

### Primitive Types

| `_zod.def.type` | Zod API | Description |
|------------------|---------|-------------|
| `"string"` | `z.string()` | String validation |
| `"number"` | `z.number()` | Number validation |
| `"boolean"` | `z.boolean()` | Boolean validation |
| `"bigint"` | `z.bigint()` | BigInt validation |
| `"date"` | `z.date()` | Date validation |
| `"symbol"` | `z.symbol()` | Symbol validation |
| `"null"` | `z.null()` | Null literal |
| `"undefined"` | `z.undefined()` | Undefined literal |
| `"void"` | `z.void()` | Void (undefined) |
| `"nan"` | `z.nan()` | NaN value |
| `"any"` | `z.any()` | Any type (no validation) |
| `"unknown"` | `z.unknown()` | Unknown type |
| `"never"` | `z.never()` | Never type (always fails) |

### Composite Types

| `_zod.def.type` | Zod API | Type-Specific `def` Fields |
|------------------|---------|---------------------------|
| `"object"` | `z.object({...})` | `def.shape` -- `Record<string, ZodSchema>` |
| `"array"` | `z.array(schema)` | `def.element` -- inner `ZodSchema` |
| `"tuple"` | `z.tuple([...])` | `def.items` -- array of `ZodSchema` |
| `"record"` | `z.record(k, v)` | `def.keyType`, `def.valueType` |
| `"map"` | `z.map(k, v)` | `def.keyType`, `def.valueType` |
| `"set"` | `z.set(schema)` | `def.valueType` |

### Union & Enum Types

| `_zod.def.type` | Zod API | Type-Specific `def` Fields |
|------------------|---------|---------------------------|
| `"union"` | `z.union([...])` | `def.options` -- array of `ZodSchema` |
| `"enum"` | `z.enum([...])` | `def.entries` -- object where keys === values for string enums |
| `"literal"` | `z.literal(val)` | `def.values` -- array of primitive values |

### Wrapper Types

| `_zod.def.type` | Zod API | Type-Specific `def` Fields |
|------------------|---------|---------------------------|
| `"optional"` | `.optional()` | `def.innerType` -- wrapped `ZodSchema` |
| `"nullable"` | `.nullable()` | `def.innerType` -- wrapped `ZodSchema` |
| `"default"` | `.default(val)` | `def.innerType`, `def.defaultValue` |
| `"readonly"` | `.readonly()` | `def.innerType` |

### Transform & Pipe Types

| `_zod.def.type` | Zod API | Type-Specific `def` Fields |
|------------------|---------|---------------------------|
| `"pipe"` | `.pipe(schema)` | `def.in` -- input schema, `def.out` -- output schema |
| `"transform"` | `.transform(fn)` | Part of a pipe: `def.type === "pipe"` with `def.out._zod.def.type === "transform"` |

---

## Schema-Specific Definition Fields

### Object Schema

```typescript
const schema = z.object({
  name: z.string(),
  age: z.number(),
});

schema._zod.def.type;   // "object"
schema._zod.def.shape;  // { name: ZodString, age: ZodNumber }

// Iterate over shape
for (const [key, fieldSchema] of Object.entries(schema._zod.def.shape)) {
  console.log(key, fieldSchema._zod.def.type);
}
// "name" "string"
// "age" "number"
```

### Array Schema

```typescript
const schema = z.array(z.string().min(1));

schema._zod.def.type;      // "array"
schema._zod.def.element;   // ZodString (the inner schema)
schema._zod.def.element._zod.def.type;  // "string"
```

### Union Schema

```typescript
const schema = z.union([z.string(), z.number()]);

schema._zod.def.type;      // "union"
schema._zod.def.options;   // [ZodString, ZodNumber]
schema._zod.def.options[0]._zod.def.type;  // "string"
schema._zod.def.options[1]._zod.def.type;  // "number"
```

### Optional / Nullable Schema

```typescript
const schema = z.string().optional();

schema._zod.def.type;           // "optional"
schema._zod.def.innerType;      // ZodString
schema._zod.def.innerType._zod.def.type;  // "string"
```

### Literal Schema

```typescript
const schema = z.literal("hello");

schema._zod.def.type;    // "literal"
schema._zod.def.values;  // ["hello"]
```

### Enum Schema

```typescript
const schema = z.enum(["admin", "user", "guest"]);

schema._zod.def.type;     // "enum"
schema._zod.def.entries;  // { admin: "admin", user: "user", guest: "guest" }
```

---

## Check Structure

Checks are validation constraints attached to schemas. Each check in `_zod.def.checks` is itself a Zod schema instance with its own `_zod.def`.

### Accessing Checks

```typescript
const schema = z.string().min(3).max(50);

schema._zod.def.checks;  // Array of check schema instances
schema._zod.def.checks.forEach((check) => {
  console.log(check._zod.def.check);  // "min_length", "max_length"
});
```

### String Checks

| `_zod.def.check` | Source | Additional `def` Fields |
|-------------------|--------|------------------------|
| `"min_length"` | `.min(n)` | `def.value` -- minimum length |
| `"max_length"` | `.max(n)` | `def.value` -- maximum length |
| `"length_equals"` | `.length(n)` | `def.value` -- exact length |
| `"string_format"` | `.email()`, `.url()`, `.uuid()` | `def.format` -- format name |
| `"regex"` | `.regex(re)` | `def.pattern` -- regex source |
| `"starts_with"` | `.startsWith(s)` | `def.value` -- prefix string |
| `"ends_with"` | `.endsWith(s)` | `def.value` -- suffix string |
| `"includes"` | `.includes(s)` | `def.value` -- substring |
| `"custom"` | `.refine()`, `.superRefine()` | JS closure (not serializable) |

### Number Checks

| `_zod.def.check` | Source | Additional `def` Fields |
|-------------------|--------|------------------------|
| `"greater_than"` | `.gt(n)`, `.positive()` | `def.value` -- threshold |
| `"less_than"` | `.lt(n)`, `.negative()` | `def.value` -- threshold |
| `"greater_than_or_equal"` | `.gte(n)`, `.min(n)`, `.nonnegative()` | `def.value` -- threshold |
| `"less_than_or_equal"` | `.lte(n)`, `.max(n)`, `.nonpositive()` | `def.value` -- threshold |
| `"number_format"` | `.int()` | `def.format` -- `"safeint"` |
| `"multiple_of"` | `.multipleOf(n)` | `def.value` -- divisor |
| `"custom"` | `.refine()` | JS closure (not serializable) |

### Array Checks

| `_zod.def.check` | Source | Additional `def` Fields |
|-------------------|--------|------------------------|
| `"min_length"` | `.min(n)`, `.nonempty()` | `def.value` -- minimum length |
| `"max_length"` | `.max(n)` | `def.value` -- maximum length |
| `"length_equals"` | `.length(n)` | `def.value` -- exact length |

---

## String Format Schemas

In Zod v4, format validators like `z.email()`, `z.url()`, `z.uuid()` are top-level shorthand functions. Internally, they create a string schema with a format check baked in at the top level:

```typescript
const emailSchema = z.email();

emailSchema._zod.def.type;     // "string"
emailSchema._zod.def.check;    // "string_format"
emailSchema._zod.def.format;   // "email"
emailSchema._zod.def.pattern;  // regex source string for email validation
```

**Key distinction**: When using `z.email()` (top-level), the format info is on `_zod.def` directly. When using `z.string().email()` (chained), it appears as a check in `_zod.def.checks`.

### Format Values

| `def.format` | Source | Has `def.pattern`? |
|--------------|--------|--------------------|
| `"email"` | `z.email()` | Yes |
| `"url"` | `z.url()` | No (uses URL constructor) |
| `"uuid"` | `z.uuid()` | Yes |
| `"cuid"` | `z.cuid()` | Yes |
| `"cuid2"` | `z.cuid2()` | Yes |
| `"ulid"` | `z.ulid()` | Yes |
| `"nanoid"` | `z.nanoid()` | Yes |
| `"jwt"` | `z.jwt()` | Yes |
| `"base64"` | `z.base64()` | Yes |
| `"ipv4"` | `z.ipv4()` | Yes |
| `"ipv6"` | `z.ipv6()` | Yes |
| `"cidrv4"` | `z.cidrv4()` | Yes |
| `"cidrv6"` | `z.cidrv6()` | Yes |

---

## The `_zod.bag` (Aggregated Metadata)

The `bag` property contains aggregated metadata computed from all checks on a schema. This provides a convenient, flat view of constraints without iterating through individual checks.

### String Bag Examples

```typescript
z.string().min(3).max(50)._zod.bag;
// { minimum: 3, maximum: 50 }

z.string().length(10)._zod.bag;
// { minimum: 10, maximum: 10 }

z.email()._zod.bag;
// { format: "email", patterns: { ... } }

z.string().regex(/^[a-z]+$/)._zod.bag;
// { patterns: { ... } }
```

### Number Bag Examples

```typescript
z.number().min(0).max(100)._zod.bag;
// { minimum: 0, maximum: 100 }

z.number().positive()._zod.bag;
// { exclusiveMinimum: 0 }

z.number().nonnegative()._zod.bag;
// { minimum: 0 }

z.number().negative()._zod.bag;
// { exclusiveMaximum: 0 }

z.number().nonpositive()._zod.bag;
// { maximum: 0 }

z.number().int()._zod.bag;
// { format: "safeint", minimum: -9007199254740991, maximum: 9007199254740991 }

z.number().multipleOf(5)._zod.bag;
// { multipleOf: 5 }

z.number().gt(10).lt(20)._zod.bag;
// { exclusiveMinimum: 10, exclusiveMaximum: 20 }
```

### Array Bag Examples

```typescript
z.array(z.string()).min(1).max(10)._zod.bag;
// { minimum: 1, maximum: 10 }

z.array(z.number()).nonempty()._zod.bag;
// { minimum: 1 }
```

### Bag Property Reference

| Bag Property | Meaning | Set By |
|-------------|---------|--------|
| `minimum` | Inclusive minimum (length or value) | `.min()`, `.nonnegative()`, `.int()` |
| `maximum` | Inclusive maximum (length or value) | `.max()`, `.nonpositive()`, `.int()` |
| `exclusiveMinimum` | Exclusive minimum | `.gt()`, `.positive()` |
| `exclusiveMaximum` | Exclusive maximum | `.lt()`, `.negative()` |
| `multipleOf` | Must be divisible by | `.multipleOf()` |
| `format` | String/number format name | `.email()`, `.uuid()`, `.int()`, etc. |
| `patterns` | Regex pattern object(s) | `.regex()`, `.email()`, `.uuid()` |

---

## Transform / Refine Detection

Detecting whether a schema contains transforms or refinements is critical for tools that need to determine compilability (e.g., AOT compilers must fall back to Zod for these).

### Detecting Transforms

Transforms in Zod v4 are implemented as pipe schemas:

```typescript
const schema = z.string().transform((val) => val.length);

schema._zod.def.type;  // "pipe"
schema._zod.def.in;    // ZodString (input schema)
schema._zod.def.out;   // ZodTransform (output schema)
schema._zod.def.out._zod.def.type;  // "transform"
```

### Detecting Refine / SuperRefine

Refinements add a check with `check === "custom"`:

```typescript
const schema = z.string().refine((val) => val.length > 5);

schema._zod.def.checks.some(
  (check) => check._zod.def.check === "custom"
);
// true
```

### Compilability Check Pattern

```typescript
function isCompilable(schema: z.ZodType): boolean {
  const def = schema._zod.def;

  // Transforms are not compilable
  if (def.type === "pipe" && def.out._zod.def.type === "transform") {
    return false;
  }

  // Custom checks (refine/superRefine) are not compilable
  if (def.checks?.some((c) => c._zod.def.check === "custom")) {
    return false;
  }

  // Recursively check nested schemas
  if (def.type === "object") {
    return Object.values(def.shape).every((s) => isCompilable(s));
  }
  if (def.type === "array") {
    return isCompilable(def.element);
  }
  if (def.type === "union") {
    return def.options.every((s) => isCompilable(s));
  }
  if (def.type === "optional" || def.type === "nullable") {
    return isCompilable(def.innerType);
  }

  return true;
}
```

---

## Recursive Traversal Pattern

A common pattern for tools working with Zod internals is recursive traversal of the schema tree:

```typescript
function traverseSchema(
  schema: z.ZodType,
  visitor: (schema: z.ZodType, path: string[]) => void,
  path: string[] = []
): void {
  visitor(schema, path);
  const def = schema._zod.def;

  switch (def.type) {
    case "object":
      for (const [key, fieldSchema] of Object.entries(def.shape)) {
        traverseSchema(fieldSchema, visitor, [...path, key]);
      }
      break;
    case "array":
      traverseSchema(def.element, visitor, [...path, "[]"]);
      break;
    case "union":
      def.options.forEach((option, i) => {
        traverseSchema(option, visitor, [...path, `|${i}`]);
      });
      break;
    case "optional":
    case "nullable":
      traverseSchema(def.innerType, visitor, path);
      break;
    case "tuple":
      def.items.forEach((item, i) => {
        traverseSchema(item, visitor, [...path, `[${i}]`]);
      });
      break;
    case "pipe":
      traverseSchema(def.in, visitor, [...path, "<in>"]);
      traverseSchema(def.out, visitor, [...path, "<out>"]);
      break;
  }
}
```

---

## Key Zod v4 Source Files

When implementing tools that work with Zod internals, reference these source files:

| File | Contents |
|------|----------|
| `zod/src/v4/core/schemas.ts` | All schema type definitions, `$ZodTypeDef`, JIT internals |
| `zod/src/v4/core/checks.ts` | All check type definitions and check creation functions |
| `zod/src/v4/core/regexes.ts` | Email, UUID, IP, and other format regex patterns |
| `zod/src/v4/core/json-schema-processors.ts` | Per-schema-type processing patterns (reference for extractors) |

---

## Version Information

```typescript
const schema = z.string();

schema._zod.version;
// { major: 4, minor: 1, patch: 12 }
// (actual values depend on installed Zod version)
```

This can be used to gate behavior based on Zod version, ensuring compatibility across minor releases.

---

## Important Caveats

1. **`_zod` is internal API** -- While stable within Zod v4, it is not part of the public API contract. Pin your Zod version in tools that depend on these internals.

2. **Check instances are Zod schemas** -- Each entry in `_zod.def.checks` is itself a Zod schema instance (not a plain object). Access check metadata via `check._zod.def`.

3. **`custom` checks contain JS closures** -- Checks added by `.refine()` and `.superRefine()` contain JavaScript closures that cannot be serialized or statically analyzed. Tools must fall back to Zod runtime for these.

4. **Top-level format schemas vs chained** -- `z.email()` puts format info on `_zod.def` directly, while `z.string().email()` adds it as a check in `_zod.def.checks`. Handle both cases.

5. **`_zod.bag` is computed lazily** -- The bag may not be populated until accessed. Always access it via the property getter.

6. **Object shape contains live schema instances** -- `_zod.def.shape` values are full Zod schema instances, not plain definitions. Traverse them recursively.

---

**See also:**
- `quick-reference.md` for Zod API reference
- `advanced-patterns.md` for transform and refine patterns
- `migration-guide.md` for v3 to v4 changes
