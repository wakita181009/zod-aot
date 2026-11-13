import type { ObjectIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { escapeString, extendStaticPath, hasMutation } from "../context.js";
import { emit } from "../emit.js";
import { invalidType } from "../emit-issue.js";
import { refineCheck } from "./effect.js";

export function slowObject(ir: SchemaIR & { type: "object" }, g: SlowGen): string {
  let code = emit`
    if(typeof ${g.input}!=="object"||${g.input}===null||Array.isArray(${g.input})){
      ${invalidType(g, "object")}
    }else{`;

  const stripsUnknownKeys = ir.unknownKeys === "strip";
  const needsClone = stripsUnknownKeys || Object.values(ir.properties).some(hasMutation);
  const objVar = g.temp("o");
  code += stripsUnknownKeys
    ? `var ${objVar}={};`
    : needsClone
      ? `var ${objVar}=Object.assign({},${g.input});`
      : `var ${objVar}=${g.input};`;

  for (const [key, propIR] of Object.entries(ir.properties)) {
    const escapedKey = escapeString(key);
    const propExpr = `${objVar}[${escapedKey}]`;
    const propPath = extendStaticPath(g.path, key);
    if (stripsUnknownKeys) {
      const inputPropExpr = `${g.input}[${escapedKey}]`;
      code += `if(${escapedKey} in ${g.input})${propExpr}=${inputPropExpr};`;
    }
    code += g.visit(propIR, { input: propExpr, output: propExpr, path: propPath });
  }

  if (needsClone) {
    code += `${g.output}=${objVar};`;
  }

  // Object-level refine effects: z.object({...}).refine(fn)
  if (ir.checks) {
    for (const check of ir.checks) {
      code += refineCheck(check, objVar, g);
    }
  }

  code += `}\n`;
  return code;
}

export function fastObject(ir: ObjectIR, g: FastGen): string | null {
  const x = g.input;
  const parts: string[] = [`typeof ${x}==="object"`, `${x}!==null`, `!Array.isArray(${x})`];

  for (const [key, propIR] of Object.entries(ir.properties)) {
    const propExpr = `${x}[${escapeString(key)}]`;
    const propCheck = g.visit(propIR, { input: propExpr });
    if (propCheck === null) return null; // All-or-nothing
    parts.push(propCheck);
  }

  if (ir.unknownKeys === "strip") {
    const knownKeys = Object.keys(ir.properties);
    if (knownKeys.length === 0) {
      parts.splice(3, 0, `Object.keys(${x}).length===0`);
    } else {
      const knownKeysFunction = g.temp("ok");
      g.ctx.preamble.push(
        `function ${knownKeysFunction}(o){for(var k in o){if(!Object.prototype.hasOwnProperty.call(o,k))continue;if(!(${knownKeys
          .map((key) => `k===${escapeString(key)}`)
          .join("||")}))return false;}return true;}`,
      );
      parts.splice(3, 0, `${knownKeysFunction}(${x})`);
    }
  }

  // Object-level refine effects (appended last — run after property checks short-circuit)
  if (ir.checks) {
    for (const check of ir.checks) {
      if (check.kind === "refine_effect") {
        parts.push(`(${check.source})(${x})`);
      }
    }
  }

  return parts.join("&&");
}
