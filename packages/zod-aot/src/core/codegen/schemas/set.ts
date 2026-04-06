import type { SchemaIR, SetIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { checkPriority } from "../context.js";
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

export function fastSet(ir: SetIR, g: FastGen): string | null {
  const x = g.input;
  const parts: string[] = [`${x} instanceof Set`];

  // Size checks
  if (ir.checks) {
    for (const check of [...ir.checks].sort(checkPriority)) {
      switch (check.kind) {
        case "min_size":
          parts.push(`${x}.size>=${check.minimum}`);
          break;
        case "max_size":
          parts.push(`${x}.size<=${check.maximum}`);
          break;
      }
    }
  }

  // Element validation via preamble helper (Set has no .every())
  const elemVar = g.temp("sv");
  const elemCheck = g.visit(ir.valueType, { input: elemVar });
  if (elemCheck === null) return null;
  if (elemCheck !== "true") {
    const helperName = g.temp("se");
    g.ctx.preamble.push(
      `function ${helperName}(s){for(var ${elemVar} of s){if(!(${elemCheck})){return false;}}return true;}`,
    );
    parts.push(`${helperName}(${x})`);
  }

  return parts.join("&&");
}
