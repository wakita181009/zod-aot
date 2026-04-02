import type { SchemaIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { escapeString, hasMutation } from "../context.js";
import { emit } from "../emit.js";
import { generateRefineCheck } from "./effect.js";

export function generateObjectValidation(
  ir: SchemaIR & { type: "object" },
  inputExpr: string,
  outputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateFn: GenerateValidationFn,
): string {
  let code = emit`
    if(typeof ${inputExpr}!=="object"||${inputExpr}===null||Array.isArray(${inputExpr})){
      ${issuesVar}.push({code:"invalid_type",expected:"object",input:${inputExpr},path:${pathExpr}});
    }else{`;

  const needsClone = Object.values(ir.properties).some(hasMutation);
  const objVar = `__o_${ctx.counter++}`;
  code += needsClone
    ? `var ${objVar}=Object.assign({},${inputExpr});`
    : `var ${objVar}=${inputExpr};`;

  for (const [key, propIR] of Object.entries(ir.properties)) {
    const propExpr = `${objVar}[${escapeString(key)}]`;
    const propPath = `${pathExpr}.concat(${escapeString(key)})`;
    code += generateFn(propIR, propExpr, propExpr, propPath, issuesVar, ctx);
  }

  if (needsClone) {
    code += `${outputExpr}=${objVar};`;
  }

  // Object-level refine effects: z.object({...}).refine(fn)
  if (ir.checks) {
    for (const check of ir.checks) {
      code += generateRefineCheck(check, objVar, pathExpr, issuesVar);
    }
  }

  code += `}\n`;
  return code;
}
