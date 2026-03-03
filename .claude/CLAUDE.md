# zod-aot: Zod AOT Compiler

**Tagline:** "Compile Zod schemas into zero-overhead validation functions at build time."

## Status

**Phase 1: Core Compiler — COMPLETE**
**Phase 2: Tier 2 Type Support — COMPLETE**

Benchmark results (vitest bench, Node.js):
- Simple types: 1.5-2.8x faster than Zod v4
- Medium objects (valid): 3.2-3.4x faster
- Medium objects (invalid): ~23x faster
- Large objects (10-100 nested items): **32-47x faster**
- Performance gains scale with schema complexity

Phase 1 success criteria (is() 10x+, safeParse() 5x+) met for large/complex schemas. Primitives and small objects show moderate gains due to Zod v4's already-optimized fast path.

Phase 2 adds Tier 2 types: tuple, record, intersection, discriminatedUnion (with O(1) switch optimization), date, any, unknown, default, readonly. 300 tests passing.

## Context

Zod validation traverses schema object graphs at runtime, resulting in ~6.7M ops/sec vs Typia's ~76M ops/sec (~10x slower). Existing AOT approaches (Typia) are TypeScript-type-based and cannot convert from Zod schemas. This library **generates optimized validation functions at build time while keeping existing Zod schemas as-is**.

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

### Tier 1 (Phase 1 — COMPLETE)
string, number, int, boolean, object, array, literal, enum, union, optional, nullable, null, undefined

### Tier 2 (Phase 2 — COMPLETE)
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
│   └── zod-aot/                  # Main npm package (published as "zod-aot")
│       ├── src/
│       │   ├── index.ts          # Public API exports
│       │   ├── runtime.ts        # Dev-time fallback (createFallback)
│       │   ├── types.ts          # SchemaIR, CompiledSchema, CheckIR
│       │   ├── extractor/
│       │   │   └── index.ts      # extractSchema() — _zod.def → SchemaIR
│       │   └── codegen/
│       │       └── index.ts      # generateValidator() — SchemaIR → JS code
│       ├── tests/
│       │   ├── integration.test.ts   # E2E: extract → generate → execute → compare with Zod
│       │   ├── extractor/index.test.ts
│       │   ├── codegen/index.test.ts
│       │   ├── runtime.test.ts
│       │   └── types.test.ts
│       ├── package.json
│       └── tsconfig.json
├── benchmarks/                   # Workspace package (@zod-aot/benchmarks)
│   ├── schemas/                  # Shared benchmark schemas + fixtures
│   │   ├── simple.ts             # Primitives (string, number, boolean, enum)
│   │   ├── medium.ts             # User registration (7 props)
│   │   ├── large.ts              # API response (nested objects + arrays)
│   │   └── index.ts
│   ├── helpers/
│   │   └── compile.ts            # AOT compile helper (compileForBench)
│   ├── safeParse.bench.ts        # safeParse: zod vs zod-aot
│   ├── is.bench.ts               # is() type guard: zod vs zod-aot
│   └── package.json
├── apps/
│   ├── bench-zod-only/           # Standalone Zod benchmark script
│   └── bench-zod-aot/            # Standalone zod-aot benchmark script
├── .github/
│   └── workflows/
│       ├── ci.yml                # Lint + typecheck + test + build
│       └── release.yml           # npm publish on tag push (v*)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
└── biome.json
```

## Implementation Phases

### Phase 1: Core Compiler (COMPLETE)

- [x] Project setup: pnpm monorepo, TypeScript, Vitest, Biome
- [x] SchemaIR type definitions (`types.ts`)
- [x] Extractor (`extractor/`): `_zod.def` → SchemaIR (Tier 1 types)
- [x] CodeGen (`codegen/`): SchemaIR → optimized JS code
- [x] Runtime fallback (`runtime.ts`): createFallback for dev environments
- [x] Benchmarks: vitest bench + standalone scripts
- [x] Compatibility tests: E2E comparison with Zod on same input
- [ ] CLI (`cli/`): `generate` + `check` commands (deferred to Phase 2)

### Phase 2: Type Expansion + CLI + unplugin

- [x] Tier 2 type support (tuple, record, intersection, discriminatedUnion, date, any, unknown, default, readonly)
- [x] discriminatedUnion switch statement optimization (O(1) vs O(n))
- [ ] CLI (`generate` + `check` commands)
- [ ] Partial fallback (e.g., object with some transform properties)
- [ ] unplugin integration for Vite/Webpack/esbuild
- [ ] Watch mode

### Phase 3: Ecosystem

- Tier 3 type support
- Documentation site

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

## CI/CD

- **CI** (`.github/workflows/ci.yml`): Runs on push to main and PRs. Lint → typecheck → test → build on Node 20/22.
- **Release** (`.github/workflows/release.yml`): Triggered by `v*` tags. Runs full checks, then publishes to npm with provenance.

Release workflow:
```bash
# 1. Update version in packages/zod-aot/package.json
# 2. Commit and tag
git tag v0.1.0
git push origin v0.1.0
# 3. GitHub Actions publishes to npm automatically
```

Requires `NPM_TOKEN` secret in GitHub repository settings.

## Verification

1. `pnpm test` — Vitest for extractor/codegen/integration tests
2. `pnpm bench` — vitest bench for Zod v4 performance comparison
3. `pnpm --filter bench-zod-only bench` / `pnpm --filter bench-zod-aot bench` — Standalone benchmark scripts
4. Integration test: schema → extract → generate → execute → compare results with Zod on same input
