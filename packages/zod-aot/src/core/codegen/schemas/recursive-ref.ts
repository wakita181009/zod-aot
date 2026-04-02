import type { RecursiveRefIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowRecursiveRef(_ir: RecursiveRefIR, g: SlowGen): string {
  const n = g.ctx.counter++;
  const rVar = `__rec_r${n}`;
  const iVar = `__rec_i${n}`;
  const jVar = `__rec_j${n}`;
  return `${emit`
    var ${rVar}=${g.ctx.fnName}(${g.input});
    if(!${rVar}.success){
      var ${iVar}=${rVar}.error.issues;
      for(var ${jVar}=0;${jVar}<${iVar}.length;${jVar}++){
        ${g.issues}.push(Object.assign({},${iVar}[${jVar}],
          {path:${g.path}.concat(${iVar}[${jVar}].path)}));
      }
    }else{
      ${g.output}=${rVar}.data;
    }
  `}\n`;
}

export function fastRecursiveRef(_ir: RecursiveRefIR, _g: FastGen): string | null {
  // recursiveRef needs auxiliary function generation — ineligible for now
  return null;
}
