import type { SchemaIR, TupleAbsenceIR, TupleIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { extendStaticPathIndex, hasMutation, tupleAbsence } from "../context.js";
import { emit } from "../emit.js";
import { invalidType, lengthIssueWithoutInclusive, tooBig, tooSmall } from "../emit-issue.js";

type Current = TupleAbsenceIR & { mode: "current" };
type Legacy = TupleAbsenceIR & { mode: "legacy" };

/**
 * Mirrors $ZodTuple for the installed Zod version (see TupleAbsenceIR). The
 * output is a copy whenever any slot may be written, filled for an absent
 * item, or truncated; otherwise the input itself.
 */
export function slowTuple(ir: SchemaIR & { type: "tuple" }, g: SlowGen): string {
  const a = tupleAbsence(ir);
  const lenVar = g.temp("tl");
  const copies = hasMutation(ir);
  const out = copies ? g.temp("t") : g.input;

  let body = copies ? `var ${out}=${g.input}.slice();` : "";
  body +=
    a.mode === "current"
      ? currentItems(ir, a, out, lenVar, copies, g)
      : legacyItems(ir, a, out, lenVar, copies, g);
  if (copies) body += `${g.output}=${out};`;

  return emit`
    if(!Array.isArray(${g.input})){
      ${invalidType(g, "tuple")}
    }else{
      var ${lenVar}=${g.input}.length;
      ${lengthGuard(ir, a, lenVar, body, g)}
    }
  `;
}

/** Wraps `body` in Zod's length checks; tuples with a rest element have none. */
function lengthGuard(
  ir: TupleIR,
  a: TupleAbsenceIR,
  lenVar: string,
  body: string,
  g: SlowGen,
): string {
  if (ir.rest !== null) return body;
  const n = ir.items.length;
  if (a.mode === "current") {
    // too_big is reported alongside the item issues; too_small stops the parse.
    return emit`
      if(${lenVar}<${a.optinStart}){
        ${tooSmall(g, a.optinStart, "array", true)}
      }else{
        if(${lenVar}>${n}){
          ${tooBig(g, n, "array", true)}
        }
        ${body}
      }`;
  }
  // Legacy: either length issue stops the parse. too_small fires only when the
  // input is short by more than one past optStart, and reports the item count.
  const big = a.tooBigInclusive
    ? tooBig(g, n, "array", true)
    : lengthIssueWithoutInclusive(g, "too_big", n);
  return emit`
    if(${lenVar}>${n}){
      ${big}
    }else if(${lenVar}<${a.optStart - 1}){
      ${lengthIssueWithoutInclusive(g, "too_small", n)}
    }else{
      ${body}
    }`;
}

function restLoop(ir: TupleIR, out: string, lenVar: string, g: SlowGen): string {
  if (ir.rest === null) return "";
  const idxVar = g.temp("ti");
  const slot = `${out}[${idxVar}]`;
  return emit`
    for(var ${idxVar}=${ir.items.length};${idxVar}<${lenVar};${idxVar}++){
      ${g.visit(ir.rest, { input: slot, output: slot, path: `${g.path}.concat(${idxVar})` })}
    }`;
}

/** Zod >= 4.4: every item runs, then results are reconciled with absence. */
function currentItems(
  ir: TupleIR,
  a: Current,
  out: string,
  lenVar: string,
  copies: boolean,
  g: SlowGen,
): string {
  const n = ir.items.length;
  const label = g.temp("tb");
  const truncate = (i: number) => `${copies ? `${out}.length=${i};` : ""}break ${label};`;

  // Zod pushes rest issues before it reconciles the item results.
  let code = restLoop(ir, out, lenVar, g);
  let items = "";
  for (let i = 0; i < n; i++) {
    const slot = `${out}[${i}]`;
    const path = extendStaticPathIndex(g.path, i);
    const itemIR = ir.items[i] as SchemaIR;
    const mayBeAbsent = ir.rest !== null || i >= a.optinStart;
    const fill = copies && mayBeAbsent ? `if(${lenVar}<=${i})${slot}=undefined;` : "";

    if (!mayBeAbsent || i < a.optoutStart) {
      items += fill + g.visit(itemIR, { input: slot, output: slot, path });
    } else if (a.skipAbsent[i]) {
      items += `if(${lenVar}<=${i}){${truncate(i)}}${g.visit(itemIR, { input: slot, output: slot, path })}`;
    } else {
      // An absent item past optoutStart that fails ends the output instead of reporting.
      const issuesVar = g.temp("tie");
      items += emit`
        var ${issuesVar}=[];
        ${fill}
        ${g.visit(itemIR, { input: slot, output: slot, path, issues: issuesVar })}
        if(${issuesVar}.length>0){
          if(${lenVar}<=${i}){${truncate(i)}}
          ${g.issues}.push.apply(${g.issues},${issuesVar});
        }`;
    }
  }
  code += `${label}:{${items}}`;

  // Trailing undefined slots the input lacked are dropped for optional-out items.
  if (copies && a.trimUndefined.some(Boolean)) {
    const flags = g.temp("tt");
    g.ctx.preamble.push(`var ${flags}=${JSON.stringify(a.trimUndefined)};`);
    const t = g.temp("tj");
    code += `for(var ${t}=${out}.length-1;${t}>=${lenVar};${t}--){if(${flags}[${t}]&&${out}[${t}]===undefined)${out}.length=${t};else break;}`;
  }
  return code;
}

/** Zod < 4.4: items past optStart are skipped when absent, others run on undefined. */
function legacyItems(
  ir: TupleIR,
  a: Legacy,
  out: string,
  lenVar: string,
  copies: boolean,
  g: SlowGen,
): string {
  let code = "";
  for (let i = 0; i < ir.items.length; i++) {
    const slot = `${out}[${i}]`;
    const visit = g.visit(ir.items[i] as SchemaIR, {
      input: slot,
      output: slot,
      path: extendStaticPathIndex(g.path, i),
    });
    if (i >= a.optStart) {
      code += `if(${lenVar}>${i}){${visit}}`;
    } else {
      code += (copies ? `if(${lenVar}<=${i})${slot}=undefined;` : "") + visit;
    }
  }
  return code + restLoop(ir, out, lenVar, g);
}

/**
 * Shortest input whose parse output is the input itself: shorter ones fail,
 * or gain filled slots. Items from here on are skipped when absent.
 */
function fastMinLength(ir: TupleIR, a: TupleAbsenceIR): number {
  const n = ir.items.length;
  if (ir.rest !== null) return n;
  if (a.mode === "legacy") return Math.min(a.optStart, n);
  let m = n;
  while (m > 0 && m - 1 >= a.optoutStart && a.skipAbsent[m - 1]) m--;
  return m;
}

export function fastTuple(ir: TupleIR, g: FastGen): string | null {
  const x = g.input;
  const n = ir.items.length;
  const min = fastMinLength(ir, tupleAbsence(ir));
  const parts: string[] = [`Array.isArray(${x})`];

  if (ir.rest !== null) {
    parts.push(`${x}.length>=${n}`);
  } else if (min === n) {
    parts.push(`${x}.length===${n}`);
  } else {
    parts.push(`${x}.length>=${min}`, `${x}.length<=${n}`);
  }

  for (let i = 0; i < n; i++) {
    const itemCheck = g.visit(ir.items[i] as SchemaIR, { input: `${x}[${i}]` });
    if (itemCheck === null) return null;
    if (itemCheck === "true") continue;
    parts.push(i < min ? itemCheck : `(${x}.length<=${i}||${itemCheck})`);
  }

  // Rest element validation via preamble helper (avoids .slice().every() allocation)
  if (ir.rest !== null) {
    const rv = g.temp("tr");
    const restCheck = g.visit(ir.rest, { input: rv });
    if (restCheck === null) return null;
    if (restCheck !== "true") {
      const helperName = g.temp("te");
      g.ctx.preamble.push(
        `function ${helperName}(a,s){for(var ${rv},i=s;i<a.length;i++){${rv}=a[i];if(!(${restCheck})){return false;}}return true;}`,
      );
      parts.push(`${helperName}(${x},${n})`);
    }
  }

  return parts.join("&&");
}
