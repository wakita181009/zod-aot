# TODOS

## Investigate: Union output transaction safety

**What:** Investigate whether a failed union branch containing `default`, `catch`, or `effect` can mutate `outputExpr` and affect subsequent branches.

**Why:** `slowUnion` passes the same `g.output` to all branches but only overrides `issues`. If a branch writes to `g.output` (e.g. `slowDefault` writes `g.output = defaultValue`) and then fails validation, the mutated `g.output` leaks into the next branch.

**Likely mitigated by:** `slowObject` clones the input (`Object.assign({}, input)`) when any property has mutation, so `default` inside an object operates on the clone, not the original `g.output`. But this only applies when `default` is nested inside an object — a bare `z.union([z.string().default("x"), z.number()])` would write directly to `g.output`.

**Test case:** `z.union([z.string().default("x"), z.number()])` with input `42`. First branch writes `g.output = "x"` (default for undefined), then fails because `42` is not undefined — but `g.output` is already `"x"`. Second branch (number) should succeed with `42`, but `g.output` may be `"x"`.

**Depends on / blocked by:** None. Independent investigation.
