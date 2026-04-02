import type { SchemaIR } from "../../types.js";
import type { SlowGen } from "../context.js";
import { emit } from "../emit.js";

export function slowMap(ir: SchemaIR & { type: "map" }, g: SlowGen): string {
  const entryVar = g.temp("map_e");
  const idxVar = g.temp("map_i");

  return `${emit`
    if(!(${g.input} instanceof Map)){
      ${g.issues}.push({code:"invalid_type",expected:"map",input:${g.input},path:${g.path}});
    }else{
      var ${idxVar}=0;
      for(var ${entryVar} of ${g.input}){
        ${g.visit(ir.keyType, { input: `${entryVar}[0]`, output: `${entryVar}[0]`, path: `${g.path}.concat(${idxVar},"key")` })}
        ${g.visit(ir.valueType, { input: `${entryVar}[1]`, output: `${entryVar}[1]`, path: `${g.path}.concat(${idxVar},"value")` })}
        ${idxVar}++;
      }
    }
  `}\n`;
}
