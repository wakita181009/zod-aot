import type { SchemaIR } from "../../types.js";
import type { SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowSet(ir: SchemaIR & { type: "set" }, g: SlowGen): string {
  let code = emit`
    if(!(${g.input} instanceof Set)){
      ${g.issues}.push({code:"invalid_type",expected:"set",input:${g.input},path:${g.path}});
    }else{`;

  // Size checks
  if (ir.checks) {
    for (const check of ir.checks) {
      switch (check.kind) {
        case "min_size":
          code += emit`
            if(${g.input}.size<${check.minimum}){
              ${g.issues}.push({code:"too_small",minimum:${check.minimum},origin:"set",inclusive:true,input:${g.input},path:${g.path}});
            }`;
          break;
        case "max_size":
          code += emit`
            if(${g.input}.size>${check.maximum}){
              ${g.issues}.push({code:"too_big",maximum:${check.maximum},origin:"set",inclusive:true,input:${g.input},path:${g.path}});
            }`;
          break;
      }
    }
  }

  // Validate each element
  const iterVar = g.temp("set_v");
  const idxVar = g.temp("set_i");
  code += emit`
    var ${idxVar}=0;
    for(var ${iterVar} of ${g.input}){
      ${g.visit(ir.valueType, { input: iterVar, output: iterVar, path: `${g.path}.concat(${idxVar})` })}
      ${idxVar}++;
    }
  }`;
  return `${code}\n`;
}
