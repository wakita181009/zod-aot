import type { FallbackIR } from "../../types.js";
import type { SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowFallback(ir: FallbackIR, g: SlowGen): string {
  if (ir.refIndex !== undefined) {
    const idx = ir.refIndex;
    const rVar = `__rf_r${idx}`;
    const iVar = `__rf_i${idx}`;
    const jVar = `__rf_j${idx}`;
    return `${emit`
      var ${rVar}=__rf[${idx}].safeParse(${g.input});
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
  return `${g.issues}.push({code:"custom",path:${g.path},message:"Fallback schema: ${ir.reason}"});\n`;
}
