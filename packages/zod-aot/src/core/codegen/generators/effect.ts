import type { RefineEffectCheckIR, TransformEffectIR } from "../../types.js";
import type { CodeGenContext, GenerateValidationFn } from "../context.js";
import { emit } from "../emit.js";

/**
 * Generate code for a TransformEffectIR node.
 * Validates the inner schema, then applies the transform function and writes back the result.
 */
export function generateTransformEffect(
  ir: TransformEffectIR,
  inputExpr: string,
  outputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
  generateValidation: GenerateValidationFn,
): string {
  const beforeVar = `__ib${ctx.counter++}`;
  const innerCode = generateValidation(ir.inner, inputExpr, outputExpr, pathExpr, issuesVar, ctx);

  return `${emit`
    var ${beforeVar}=${issuesVar}.length;
    ${innerCode}
    if(${issuesVar}.length===${beforeVar}){
      ${outputExpr}=(${ir.source})(${outputExpr});
    }
  `}\n`;
}

/**
 * Generate code for a RefineEffectCheckIR (inline refine function call).
 * Called from string/number/object check loops when a refine_effect is encountered.
 */
export function generateRefineCheck(
  check: RefineEffectCheckIR,
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  const message = check.message ? JSON.stringify(check.message) : `"Invalid"`;
  return emit`
    if(!(${check.source})(${inputExpr})){
      ${issuesVar}.push({code:"custom",path:${pathExpr},message:${message},input:${inputExpr}});
    }`;
}
