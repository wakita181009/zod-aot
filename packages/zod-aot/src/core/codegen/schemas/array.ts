import type { ArrayIR, CheckIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { checkPriority, hasMutation } from "../context.js";
import { emit } from "../emit.js";
import { refineCheck } from "./effect.js";

export function slowArray(ir: SchemaIR & { type: "array" }, g: SlowGen): string {
  let code = emit`
    if(!Array.isArray(${g.input})){
      ${g.issues}.push({code:"invalid_type",expected:"array",input:${g.input},path:${g.path}});
    }else{`;

  if (hasMutation(ir.element)) {
    code += `${g.output}=${g.input}.slice();`;
  }

  for (const check of ir.checks) {
    switch (check.kind) {
      case "min_length":
        code += emit`
          if(${g.input}.length<${check.minimum}){
            ${g.issues}.push({code:"too_small",minimum:${check.minimum},origin:"array",inclusive:true,input:${g.input},path:${g.path}});
          }`;
        break;
      case "max_length":
        code += emit`
          if(${g.input}.length>${check.maximum}){
            ${g.issues}.push({code:"too_big",maximum:${check.maximum},origin:"array",inclusive:true,input:${g.input},path:${g.path}});
          }`;
        break;
      case "length_equals":
        code += emit`
          if(${g.input}.length<${check.length}){
            ${g.issues}.push({code:"too_small",minimum:${check.length},origin:"array",inclusive:true,exact:true,input:${g.input},path:${g.path}});
          }else if(${g.input}.length>${check.length}){
            ${g.issues}.push({code:"too_big",maximum:${check.length},origin:"array",inclusive:true,exact:true,input:${g.input},path:${g.path}});
          }`;
        break;
      case "refine_effect":
        code += refineCheck(check, g.input, g);
        break;
    }
  }

  const idxVar = g.temp("i");
  const elemExpr = `${g.input}[${idxVar}]`;
  const elemPath = `${g.path}.concat(${idxVar})`;
  code += emit`
    for(var ${idxVar}=0;${idxVar}<${g.input}.length;${idxVar}++){
      ${g.visit(ir.element, { input: elemExpr, output: elemExpr, path: elemPath })}
    }
  }`;
  return `${code}\n`;
}

export function fastArray(ir: ArrayIR, g: FastGen): string | null {
  const x = g.input;
  const parts: string[] = [`Array.isArray(${x})`];
  const checks = ir.checks.filter((c): c is CheckIR => c.kind !== "refine_effect");

  // Size checks
  for (const check of checks.sort(checkPriority)) {
    switch (check.kind) {
      case "min_length":
        parts.push(`${x}.length>=${check.minimum}`);
        break;
      case "max_length":
        parts.push(`${x}.length<=${check.maximum}`);
        break;
      case "length_equals":
        parts.push(`${x}.length===${check.length}`);
        break;
    }
  }

  // Element validation via .every()
  const elemVar = g.temp("fe");
  const elemCheck = g.visit(ir.element, { input: elemVar });
  if (elemCheck === null) return null;
  if (elemCheck !== "true") {
    parts.push(`${x}.every(${elemVar}=>${elemCheck})`);
  }

  // Refine effect checks (appended last — run after cheap checks short-circuit)
  for (const check of ir.checks) {
    if (check.kind === "refine_effect") {
      parts.push(`(${check.source})(${x})`);
    }
  }

  return parts.join("&&");
}
