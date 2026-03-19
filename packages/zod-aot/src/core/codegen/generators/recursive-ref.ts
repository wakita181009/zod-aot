import type { CodeGenContext } from "../context.js";
import { emit } from "../context.js";

export function generateRecursiveRefValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  const n = ctx.counter++;
  const rVar = `__rec_r${n}`;
  const iVar = `__rec_i${n}`;
  const jVar = `__rec_j${n}`;
  return `${emit`
    var ${rVar}=${ctx.fnName}(${inputExpr});
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
