import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";

type GenerateValidationFn = (
  ir: SchemaIR,
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
) => string;

export function generateSetValidation(
  ir: SchemaIR & { type: "set" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateValidation: GenerateValidationFn,
): string {
  let code = `if(!(${inputExpr} instanceof Set)){${issuesVar}.push({code:"invalid_type",expected:"set",received:typeof ${inputExpr},path:${pathExpr},message:"Expected Set"});}`;

  code += `else{`;

  // Size checks
  if (ir.checks) {
    for (const check of ir.checks) {
      switch (check.kind) {
        case "min_size":
          code += `if(${inputExpr}.size<${check.minimum}){${issuesVar}.push({code:"too_small",minimum:${check.minimum},type:"set",inclusive:true,path:${pathExpr},message:"Set must have at least ${check.minimum} element(s)"});}`;
          break;
        case "max_size":
          code += `if(${inputExpr}.size>${check.maximum}){${issuesVar}.push({code:"too_big",maximum:${check.maximum},type:"set",inclusive:true,path:${pathExpr},message:"Set must have at most ${check.maximum} element(s)"});}`;
          break;
      }
    }
  }

  // Validate each element
  const idx = ctx.counter++;
  const iterVar = `__set_v${idx}`;
  const idxVar = `__set_i${idx}`;
  code += `var ${idxVar}=0;`;
  code += `for(var ${iterVar} of ${inputExpr}){`;
  code += generateValidation(
    ir.valueType,
    iterVar,
    `${pathExpr}.concat(${idxVar})`,
    issuesVar,
    ctx,
  );
  code += `${idxVar}++;`;
  code += `}`;

  code += `}`;
  return `${code}\n`;
}
