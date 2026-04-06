import type { MapIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
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

export function fastMap(ir: MapIR, g: FastGen): string | null {
  const x = g.input;
  const parts: string[] = [`${x} instanceof Map`];

  // Key/value validation via preamble helper (Map has no .every())
  const entryVar = g.temp("me");
  const keyCheck = g.visit(ir.keyType, { input: `${entryVar}[0]` });
  if (keyCheck === null) return null;
  const valCheck = g.visit(ir.valueType, { input: `${entryVar}[1]` });
  if (valCheck === null) return null;

  if (keyCheck !== "true" || valCheck !== "true") {
    const combined = [keyCheck, valCheck].filter((c) => c !== "true").join("&&");
    const helperName = g.temp("mh");
    g.ctx.preamble.push(
      `function ${helperName}(m){for(var ${entryVar} of m){if(!(${combined})){return false;}}return true;}`,
    );
    parts.push(`${helperName}(${x})`);
  }

  return parts.join("&&");
}
