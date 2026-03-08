import type { FallbackIR } from "../../types.js";
import { emit } from "../context.js";

export function generateFallbackValidation(
  ir: FallbackIR,
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  if (ir.fallbackIndex !== undefined) {
    const idx = ir.fallbackIndex;
    const rVar = `__fb_r${idx}`;
    const iVar = `__fb_i${idx}`;
    const jVar = `__fb_j${idx}`;
    return `${emit`
      var ${rVar}=__fb[${idx}].safeParse(${inputExpr});
      if(!${rVar}.success){
        var ${iVar}=${rVar}.error.issues;
        for(var ${jVar}=0;${jVar}<${iVar}.length;${jVar}++){
          ${issuesVar}.push(Object.assign({},${iVar}[${jVar}],
            {path:${pathExpr}.concat(${iVar}[${jVar}].path)}));
        }
      }else{
        ${inputExpr}=${rVar}.data;
      }
    `}\n`;
  }
  return `${issuesVar}.push({code:"custom",path:${pathExpr},message:"Fallback schema: ${ir.reason}"});\n`;
}
