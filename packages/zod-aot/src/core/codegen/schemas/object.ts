import type { ObjectIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { escapeString, hasMutation } from "../context.js";
import { emit } from "../emit.js";
import { refineCheck } from "./effect.js";

export function slowObject(ir: SchemaIR & { type: "object" }, g: SlowGen): string {
  let code = emit`
    if(typeof ${g.input}!=="object"||${g.input}===null||Array.isArray(${g.input})){
      ${g.issues}.push({code:"invalid_type",expected:"object",input:${g.input},path:${g.path}});
    }else{`;

  const needsClone = Object.values(ir.properties).some(hasMutation);
  const objVar = g.temp("o");
  code += needsClone ? `var ${objVar}=Object.assign({},${g.input});` : `var ${objVar}=${g.input};`;

  for (const [key, propIR] of Object.entries(ir.properties)) {
    const propExpr = `${objVar}[${escapeString(key)}]`;
    const propPath = `${g.path}.concat(${escapeString(key)})`;
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
  // Object with refine effects is not eligible for Fast Path
  if (ir.checks && ir.checks.length > 0) return null;

  const x = g.input;
  const parts: string[] = [`typeof ${x}==="object"`, `${x}!==null`, `!Array.isArray(${x})`];

  for (const [key, propIR] of Object.entries(ir.properties)) {
    const propExpr = `${x}[${escapeString(key)}]`;
    const propCheck = g.visit(propIR, { input: propExpr });
    if (propCheck === null) return null; // All-or-nothing
    parts.push(propCheck);
  }

  return parts.join("&&");
}
