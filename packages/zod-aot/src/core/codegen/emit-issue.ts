/**
 * Issue object emit helpers.
 *
 * Each helper returns a string of the form `_e.push(...)` (or equivalent on a
 * caller-supplied issues variable). Two emit modes:
 *
 *  - inline (CLI .compiled.ts): emits the literal `{code:"too_small",...}` object.
 *  - lean (unplugin): emits a call like `__zaTS(min,origin,inclusive,input,path)`
 *    and registers the helper in `ctx.usedHelpers` so the transform layer can
 *    construct the corresponding `import` from `"virtual:zod-aot/runtime"`.
 *
 * Centralizing all issue emission here means schema codegen files don't carry
 * the inline/lean branching; they just call `tooSmall(g, ...)` etc.
 */

import type { CodeGenContext } from "./context.js";
import { escapeString } from "./context.js";

/** Common slim slice of SlowGen + FastGen needed for issue emission. */
interface IssueGen {
  readonly issues: string;
  readonly input: string;
  readonly path: string;
  readonly ctx: CodeGenContext;
}

function pushIssue(g: IssueGen, body: string): string {
  return `${g.issues}.push(${body});`;
}

export function tooSmall(
  g: IssueGen,
  minimum: string | number,
  origin: string,
  inclusive: boolean,
  options?: { exact?: boolean; input?: string; path?: string },
): string {
  const input = options?.input ?? g.input;
  const path = options?.path ?? g.path;
  const exact = options?.exact === true;
  if (g.ctx.mode === "lean") {
    if (exact) {
      g.ctx.usedHelpers.add("__zaTSx");
      return pushIssue(g, `__zaTSx(${minimum},${escapeString(origin)},${input},${path})`);
    }
    g.ctx.usedHelpers.add("__zaTS");
    return pushIssue(g, `__zaTS(${minimum},${escapeString(origin)},${inclusive},${input},${path})`);
  }
  if (exact) {
    return pushIssue(
      g,
      `{code:"too_small",minimum:${minimum},origin:${escapeString(origin)},inclusive:true,exact:true,input:${input},path:${path}}`,
    );
  }
  return pushIssue(
    g,
    `{code:"too_small",minimum:${minimum},origin:${escapeString(origin)},inclusive:${inclusive},input:${input},path:${path}}`,
  );
}

export function tooBig(
  g: IssueGen,
  maximum: string | number,
  origin: string,
  inclusive: boolean,
  options?: { exact?: boolean; input?: string; path?: string },
): string {
  const input = options?.input ?? g.input;
  const path = options?.path ?? g.path;
  const exact = options?.exact === true;
  if (g.ctx.mode === "lean") {
    if (exact) {
      g.ctx.usedHelpers.add("__zaTBx");
      return pushIssue(g, `__zaTBx(${maximum},${escapeString(origin)},${input},${path})`);
    }
    g.ctx.usedHelpers.add("__zaTB");
    return pushIssue(g, `__zaTB(${maximum},${escapeString(origin)},${inclusive},${input},${path})`);
  }
  if (exact) {
    return pushIssue(
      g,
      `{code:"too_big",maximum:${maximum},origin:${escapeString(origin)},inclusive:true,exact:true,input:${input},path:${path}}`,
    );
  }
  return pushIssue(
    g,
    `{code:"too_big",maximum:${maximum},origin:${escapeString(origin)},inclusive:${inclusive},input:${input},path:${path}}`,
  );
}

export function invalidType(
  g: IssueGen,
  expected: string,
  options?: { input?: string; path?: string; extra?: string },
): string {
  const input = options?.input ?? g.input;
  const path = options?.path ?? g.path;
  if (g.ctx.mode === "lean" && !options?.extra) {
    g.ctx.usedHelpers.add("__zaIT");
    return pushIssue(g, `__zaIT(${escapeString(expected)},${input},${path})`);
  }
  const extra = options?.extra ? `,${options.extra}` : "";
  return pushIssue(
    g,
    `{code:"invalid_type",expected:${escapeString(expected)}${extra},input:${input},path:${path}}`,
  );
}

export function invalidFormat(
  g: IssueGen,
  format: string | { expr: string },
  options?: { input?: string; path?: string; extra?: string },
): string {
  const input = options?.input ?? g.input;
  const path = options?.path ?? g.path;
  const formatExpr = typeof format === "string" ? escapeString(format) : format.expr;
  if (g.ctx.mode === "lean") {
    g.ctx.usedHelpers.add("__zaIF");
    const extraArg = options?.extra ? `,{${options.extra}}` : "";
    return pushIssue(g, `__zaIF(${formatExpr},${input},${path}${extraArg})`);
  }
  const extra = options?.extra ? `,${options.extra}` : "";
  return pushIssue(
    g,
    `{code:"invalid_format",format:${formatExpr}${extra},input:${input},path:${path}}`,
  );
}

export function invalidValue(
  g: IssueGen,
  valuesExpr: string,
  options?: { input?: string; path?: string },
): string {
  const input = options?.input ?? g.input;
  const path = options?.path ?? g.path;
  if (g.ctx.mode === "lean") {
    g.ctx.usedHelpers.add("__zaIV");
    return pushIssue(g, `__zaIV(${valuesExpr},${input},${path})`);
  }
  return pushIssue(g, `{code:"invalid_value",values:${valuesExpr},input:${input},path:${path}}`);
}
