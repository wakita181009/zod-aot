# TODOS

## Investigate: Union output transaction safety

**What:** Investigate whether a failed union branch can mutate `outputExpr` and affect subsequent branches.

**Why:** Codex (GPT-5.4) identified that `union.ts:25` passes `outputExpr` to all branches. If a branch containing `default`, `catch`, or `effect` writes to `outputExpr` before producing validation errors, subsequent branches see mutated state. This could cause incorrect validation results for unions containing mutation-capable schemas.

**Pros:** If confirmed, fixing this prevents subtle validation bugs in complex union schemas with nested defaults/transforms.

**Cons:** May be a non-issue if Zod's semantics already handle this (first matching branch wins), or if no real-world schema triggers the pattern.

**Context:** Discovered during /plan-eng-review on 2026-04-02. Codex read `union.ts`, `object.ts`, `default.ts`, `catch.ts`, `effect.ts` and noted that the current code reuses one `outputExpr` across all union option branches without rollback. The `if(!resultVar)` guard means only one branch "succeeds", but partial writes from failed branches may persist. Test with `z.union([z.object({a: z.string().default("x")}), z.object({a: z.number()})])` and input `{a: 42}`.

**Depends on / blocked by:** None. Independent investigation.
