# zod-aot: Zod AOT Compiler

**Tagline:** "Compile Zod schemas into zero-overhead validation functions at build time."

## Context

Zod validation traverses schema object graphs at runtime, resulting in ~6.7M ops/sec vs Typia's ~76M ops/sec (~10x slower). Existing AOT approaches (Typia) are TypeScript-type-based and cannot convert from Zod schemas. This library **generates optimized validation functions at build time while keeping existing Zod schemas as-is**.

Full pivot from zod-accel (Rust FFI approach) to a pure TypeScript AOT approach.

## Differentiation

| | zod-aot | Typia | AJV standalone | Zod v4 |
|---|---|---|---|---|
| Input | Zod schemas | TS types | JSON Schema | Zod schemas |
| Existing code changes | None required | Full rewrite | Full rewrite | N/A |
| Type inference | Inherited from Zod | Native | External generation | Native |
| Expected performance | 10-50x vs Zod | ~10x vs Zod | ~10x vs Zod | baseline |

## Architecture

### Compilation Pipeline

```
[Zod Schema (TS)] → Extract (_zod.def) → SchemaIR → CodeGen → [Optimized JS/TS functions]
```

1. **Discovery**: AST detection of `compile()` calls in source files
2. **Extraction**: Execute schema file in Node.js → recursively traverse `_zod.def` → produce SchemaIR
3. **CodeGen**: SchemaIR → JS/TS code with inline type checks, early returns, pre-compiled regexes
4. **Emit**: Write generated code to files

### Why Runtime Extraction

- Zod v4's `_zod.def` is JSON-serializable
- Static AST analysis cannot handle dynamic schemas (variable references, function calls)
- `_zod.bag` contains aggregated metadata from checks (minimum, maximum, patterns, etc.)
- Reliable detection of transform/refine

## Public API

```typescript
import { z } from "zod";
import { compile } from "zod-aot";

const UserSchema = z.object({
  name: z.string().min(3),
  age: z.number().int().positive(),
  email: z.email(),
});

// compile() falls back to Zod in dev, uses generated functions after build
export const validateUser = compile(UserSchema);

// Usage (same interface as Zod)
const user = validateUser.parse(data);          // throws ZodError on failure
const result = validateUser.safeParse(data);    // { success, data/error }
const isUser = validateUser.is(data);           // type guard (boolean)
```

### compile() Type Definition

```typescript
function compile<T extends z.ZodType>(schema: T): CompiledSchema<z.output<T>>;

interface CompiledSchema<T> {
  parse(input: unknown): T;
  safeParse(input: unknown): SafeParseReturnType<T>;  // ZodError-compatible
  is(input: unknown): input is T;
  schema: z.ZodType<T>;  // reference to original schema
}
```

### CLI

```bash
npx zod-aot generate src/schemas.ts -o src/schemas.compiled.ts
npx zod-aot generate src/ -o src/compiled/ --watch
npx zod-aot check src/schemas.ts   # check if compilable
```

## Code Generation Example

**Input:**
```typescript
const schema = z.object({
  name: z.string().min(3).max(50),
  age: z.number().int().positive(),
  email: z.email(),
  role: z.enum(["admin", "user"]),
});
```

**Generated code:**
```typescript
const __re_email = /^...$/;
const __set_role = new Set(["admin", "user"]);

function safeParse_schema(input: unknown): SafeParseReturnType<Schema> {
  const issues: ZodIssue[] = [];
  if (typeof input !== "object" || input === null) {
    return { success: false, error: new ZodError([{ code: "invalid_type", expected: "object", received: typeof input, path: [] }]) };
  }
  const o = input as Record<string, unknown>;

  // name: string().min(3).max(50)
  if (typeof o.name !== "string") {
    issues.push({ code: "invalid_type", expected: "string", received: typeof o.name, path: ["name"] });
  } else {
    if (o.name.length < 3) issues.push({ code: "too_small", minimum: 3, type: "string", inclusive: true, path: ["name"] });
    if (o.name.length > 50) issues.push({ code: "too_big", maximum: 50, type: "string", inclusive: true, path: ["name"] });
  }

  // ... (age, email, role similarly inlined)

  if (issues.length > 0) return { success: false, error: new ZodError(issues) };
  return { success: true, data: o as Schema };
}
```

## Schema Coverage

### Tier 1 (Phase 1)
string, number, int, boolean, object, array, literal, enum, union, optional, nullable, null, undefined

### Tier 2 (Phase 2)
tuple, record, intersection, discriminatedUnion, date, any, unknown, default, readonly

### Tier 3 (Phase 3)
lazy, pipe (non-transform), template_literal, bigint, map, set

### Fallback to Zod
transform, refine, superRefine, custom, preprocess

**Partial fallback strategy:** Even schemas containing transform etc. optimize compilable parts and delegate only incompilable parts to Zod.

## Project Structure

```
zod-aot/
├── packages/
│   └── zod-aot/                  # Main npm package
│       ├── src/
│       │   ├── index.ts          # Public API (compile, CompiledSchema)
│       │   ├── runtime.ts        # Dev-time fallback
│       │   ├── types.ts          # SchemaIR, type definitions
│       │   ├── extractor/
│       │   │   ├── index.ts      # _zod.def → SchemaIR entry
│       │   │   ├── traverse.ts   # Recursive def traverser
│       │   │   ├── checks.ts     # Check info extraction
│       │   │   └── fallback.ts   # transform/refine detection
│       │   ├── codegen/
│       │   │   ├── index.ts      # Code generator main
│       │   │   ├── emitter.ts    # Code string assembly
│       │   │   ├── generators/
│       │   │   │   ├── string.ts
│       │   │   │   ├── number.ts
│       │   │   │   ├── object.ts
│       │   │   │   ├── array.ts
│       │   │   │   ├── union.ts
│       │   │   │   ├── enum.ts
│       │   │   │   ├── wrappers.ts   # optional/nullable/default
│       │   │   │   └── fallback.ts   # Zod fallback generation
│       │   │   └── patterns/
│       │   │       └── regex.ts      # email/uuid regex embedding
│       │   └── cli/
│       │       ├── index.ts      # CLI entry
│       │       ├── generate.ts   # generate command
│       │       ├── check.ts      # check command
│       │       └── watcher.ts    # watch mode
│       ├── bin/
│       │   └── zod-aot.mjs       # CLI bin
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
├── tests/
│   ├── extractor.test.ts
│   ├── codegen.test.ts
│   ├── integration.test.ts       # E2E: schema → generate → execute → compare with Zod
│   └── fixtures/                 # Test schemas
├── benchmarks/
│   ├── vs-zod-v4.bench.ts
│   └── scenarios/
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── vitest.config.ts
```

## Implementation Phases

### Phase 1: Core Compiler + CLI (Prove effectiveness with benchmarks)

1. **Project setup**: pnpm monorepo, TypeScript, Vitest
2. **SchemaIR type definitions** (`types.ts`): IR structure based on Zod v4's `$ZodTypeDef`
3. **Extractor** (`extractor/`): Recursive traverse of `_zod.def` → SchemaIR (Tier 1 types)
4. **CodeGen** (`codegen/`): SchemaIR → optimized JS/TS code (Tier 1 types)
   - ZodError-compatible issue generation
   - Regex pattern embedding from Zod's `regexes.ts`
   - Enum value Set generation
5. **Runtime fallback** (`runtime.ts`): Delegate to Zod for non-build environments
6. **CLI** (`cli/`): `generate` + `check` commands
7. **Benchmarks**: Comparison with Zod v4, **target 10x+**
8. **Compatibility tests**: Property-based testing that same input returns same result as Zod

**Phase 1 success criteria:**
- `is()` mode: 10x+ vs Zod v4
- `safeParse()` mode: 5x+ vs Zod v4
- Tier 1 type test coverage 90%+

### Phase 2: Type Expansion + unplugin

- Tier 2 type support
- discriminatedUnion switch statement optimization
- Partial fallback (e.g., object with some transform properties)
- unplugin integration for Vite/Webpack/esbuild
- Watch mode

### Phase 3: Ecosystem

- Tier 3 type support
- npm publish
- Documentation

## Key Reference Files (Zod v4 internals)

Source files to reference during implementation:
- `zod/src/v4/core/schemas.ts` — All schema type definitions, `$ZodTypeDef`, `$ZodObjectJIT` (codegen reference)
- `zod/src/v4/core/checks.ts` — All check type definitions
- `zod/src/v4/core/regexes.ts` — email/uuid/ip regex patterns
- `zod/src/v4/core/json-schema-processors.ts` — Per-schema-type processing patterns (extractor reference)

## Design Decisions

1. **Don't replace Zod** — Keep Zod's type inference and DX intact. Only accelerate hot paths
2. **Runtime extraction** — Execute schema files to get `_zod.def` rather than static AST analysis
3. **transform/refine out of scope** — JS closures cannot be compiled. Fall back to Zod
4. **Phase 1 benchmarks first** — Pivot if 10x is not achieved. Data-driven decisions
5. **Pre-compiled regex + Set for enums** — These optimizations create the performance gap

## Development Tools

### Scripts

```bash
# Root (monorepo)
pnpm build          # tsc across all packages
pnpm test           # vitest run
pnpm bench          # vitest bench
pnpm lint           # biome check .
pnpm lint:fix       # biome check --fix .
pnpm format         # biome format --write .

# packages/zod-aot
pnpm -r typecheck   # tsc --noEmit
pnpm -r build       # tsc
```

### Biome (Linter & Formatter)

Config: `biome.json` (v2.4.5)

Key rules:
- `noUnusedVariables`, `noUnusedImports`, `noUndeclaredVariables`: error
- `noExplicitAny`: error
- `useImportType`, `useExportType`: error
- `noFloatingPromises`, `noMisusedPromises`: error (nursery)
- `noConsole`: warn
- Formatter: 2-space indent, 100 line width, semicolons, trailing commas

### Claude Code Integration

- **`.claude/agents/checker.md`**: Type checking + Biome lint agent (`model: haiku`, read-only)
- **`.claude/settings.json`**: PostToolUse hook — auto-runs `pnpm -r typecheck` + `pnpm lint` after `.ts`/`.tsx` file edits
- **Plugin**: `typescript-lsp@claude-plugins-official` enabled

## Verification

1. `pnpm test` — Vitest for extractor/codegen/integration tests
2. `pnpm bench` — vitest bench for Zod v4 performance comparison
3. Integration test: Test schema → CLI generate → import generated code → compare results with Zod on same input
4. `npx zod-aot check` — Verify actual schema files are compilable
