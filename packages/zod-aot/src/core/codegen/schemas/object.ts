import type { ObjectIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emitSet, escapeString, extendStaticPath, hasMutation } from "../context.js";
import { emit } from "../emit.js";
import { invalidType, unrecognizedKeys } from "../emit-issue.js";
import { refineCheck } from "./effect.js";

/** Shapes up to this many keys test membership with inline === instead of Set.has(). */
const KEY_INLINE_THRESHOLD = 8;

/** Boolean expression: is the key held in `keyVar` one of the declared keys? */
function isDeclaredKey(keys: string[], keyVar: string, g: SlowGen | FastGen): string {
  if (keys.length === 0) return "false";
  if (keys.length <= KEY_INLINE_THRESHOLD) {
    return `(${keys.map((k) => `${keyVar}===${escapeString(k)}`).join("||")})`;
  }
  return `${emitSet(g.ctx, "ok", keys)}.has(${keyVar})`;
}

/**
 * Mirrors Zod's object parse: the output is a new object holding the declared
 * keys present in the input, then the unknown keys the catchall keeps, so the
 * input itself is never written.
 */
export function slowObject(ir: SchemaIR & { type: "object" }, g: SlowGen): string {
  const input = g.input;
  let code = emit`
    if(typeof ${input}!=="object"||${input}===null||Array.isArray(${input})){
      ${invalidType(g, "object")}
    }else{`;

  const out = g.temp("o");
  code += `var ${out}={};`;

  const presenceKeys = new Set(ir.presenceKeys);
  const absentWrittenKeys = new Set(ir.absentWrittenKeys);
  for (const [key, propIR] of Object.entries(ir.properties)) {
    code += slowProperty(key, propIR, presenceKeys.has(key), absentWrittenKeys.has(key), out, g);
  }

  if (ir.catchall) code += slowUnknownKeys(Object.keys(ir.properties), ir.catchall, out, g);

  code += `${g.output}=${out};`;

  // Object-level refine effects run on the parsed output, as in Zod.
  if (ir.checks) {
    for (const check of ir.checks) {
      code += refineCheck(check, out, g);
    }
  }

  code += `}\n`;
  return code;
}

function slowProperty(
  key: string,
  propIR: SchemaIR,
  checksPresence: boolean,
  writesAbsent: boolean,
  out: string,
  g: SlowGen,
): string {
  const k = escapeString(key);
  const slot = `${out}[${k}]`;
  const propPath = extendStaticPath(g.path, key);
  // Seed only keys the input has, so an absent optional key stays absent.
  let code = writesAbsent
    ? `${slot}=${g.input}[${k}];`
    : `if(${k} in ${g.input})${slot}=${g.input}[${k}];`;
  const visit = g.visit(propIR, { input: slot, output: slot, path: propPath });

  if (checksPresence) {
    // Zod reports nonoptional only when the property's own parse raised nothing.
    const countVar = g.temp("pn");
    const nonoptional = invalidType(g, "nonoptional", { input: "undefined", path: propPath });
    code += emit`
      var ${countVar}=${g.issues}.length;
      ${visit}
      if(${g.issues}.length===${countVar}&&!(${k} in ${g.input})){
        ${nonoptional}
      }`;
  } else {
    code += visit;
  }

  // Zod keeps an undefined result only for a key the input has.
  if (!writesAbsent && hasMutation(propIR)) {
    code += `if(${slot}===undefined&&!(${k} in ${g.input}))delete ${slot};`;
  }
  return code;
}

function slowUnknownKeys(keys: string[], catchall: SchemaIR, out: string, g: SlowGen): string {
  const keyVar = g.temp("uk");
  const declared = isDeclaredKey(keys, keyVar, g);

  if (catchall.type === "never") {
    // Strict: one issue listing every unknown key, after the declared keys' issues.
    const listVar = g.temp("ul");
    return emit`
      var ${listVar}=[];
      for(var ${keyVar} in ${g.input}){
        if(!${declared})${listVar}.push(${keyVar});
      }
      if(${listVar}.length>0){
        ${unrecognizedKeys(g, listVar)}
      }`;
  }

  // Copying an own __proto__ key into a plain {} would replace its prototype;
  // Zod skips it too.
  const slot = `${out}[${keyVar}]`;
  return emit`
    for(var ${keyVar} in ${g.input}){
      if(${declared}||${keyVar}==="__proto__")continue;
      ${slot}=${g.input}[${keyVar}];
      ${g.visit(catchall, { input: slot, output: slot, path: `${g.path}.concat(${keyVar})` })}
    }`;
}

/**
 * Property checks only, without the unknown-key guard or refines; null if any
 * property is ineligible. Shared with object & object intersections, which
 * guard the union of both shapes instead.
 */
export function fastObjectChecks(ir: ObjectIR, g: FastGen): string[] | null {
  const x = g.input;
  const parts: string[] = [`typeof ${x}==="object"`, `${x}!==null`, `!Array.isArray(${x})`];

  // An absent written key makes the output differ from the input, so it must be present too.
  const mustBePresent = new Set([...(ir.presenceKeys ?? []), ...(ir.absentWrittenKeys ?? [])]);
  for (const [key, propIR] of Object.entries(ir.properties)) {
    const propExpr = `${x}[${escapeString(key)}]`;
    const propCheck = g.visit(propIR, { input: propExpr });
    if (propCheck === null) return null; // All-or-nothing
    if (mustBePresent.has(key)) parts.push(`${escapeString(key)} in ${x}`);
    parts.push(propCheck);
  }
  return parts;
}

/**
 * Fast-path guard for keys outside `keys`: the input is its own parse output
 * only when no key would be dropped, rejected, or rewritten. Returns null when
 * the catchall is ineligible for the fast path.
 */
export function fastUnknownKeyGuard(
  keys: string[],
  catchall: SchemaIR | undefined,
  g: FastGen,
): string | null {
  const keyVar = g.temp("fk");
  const declared = isDeclaredKey(keys, keyVar, g);
  let body: string;
  if (catchall === undefined || catchall.type === "never") {
    body = `if(!${declared})return false;`;
  } else {
    const valueCheck = g.visit(catchall, { input: `o[${keyVar}]` });
    if (valueCheck === null) return null;
    if (valueCheck === "true" && catchall.type === "unknown") {
      // Loose: every key is kept as is, except an own __proto__, which Zod drops.
      return `!Object.prototype.hasOwnProperty.call(${g.input},"__proto__")`;
    }
    body = `if(${declared})continue;if(${keyVar}==="__proto__"||!(${valueCheck}))return false;`;
  }
  const helper = g.temp("fu");
  g.ctx.preamble.push(`function ${helper}(o){for(var ${keyVar} in o){${body}}return true;}`);
  return `${helper}(${g.input})`;
}

export function fastObject(ir: ObjectIR, g: FastGen): string | null {
  const parts = fastObjectChecks(ir, g);
  if (parts === null) return null;

  const guard = fastUnknownKeyGuard(Object.keys(ir.properties), ir.catchall, g);
  if (guard === null) return null;
  // The guard runs before refines: a refine must see the input only once it
  // is known to equal the parsed output.
  parts.push(guard);

  if (ir.checks) {
    for (const check of ir.checks) {
      if (check.kind === "refine_effect") {
        parts.push(`(${check.source})(${g.input})`);
      }
    }
  }

  return parts.join("&&");
}
