import type { SchemaIR, TupleIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { hasMutation } from "../context.js";
import { emit } from "../emit.js";

export function slowTuple(ir: SchemaIR & { type: "tuple" }, g: SlowGen): string {
  const len = ir.items.length;

  let code = emit`
    if(!Array.isArray(${g.input})){
      ${g.issues}.push({code:"invalid_type",expected:"tuple",input:${g.input},path:${g.path}});
    }else{`;

  if (ir.items.some(hasMutation) || (ir.rest !== null && hasMutation(ir.rest))) {
    code += `${g.output}=${g.input}.slice();`;
  }

  // Reject extra elements when no rest element is defined
  if (ir.rest === null) {
    code += emit`
      if(${g.input}.length>${len}){
        ${g.issues}.push({code:"too_big",maximum:${len},inclusive:true,origin:"array",input:${g.input},path:${g.path}});
      }`;
  }

  for (let i = 0; i < len; i++) {
    const itemIR = ir.items[i] as SchemaIR;
    const elemExpr = `${g.input}[${i}]`;
    const elemPath = `${g.path}.concat(${i})`;
    code += g.visit(itemIR, { input: elemExpr, output: elemExpr, path: elemPath });
  }

  if (ir.rest !== null) {
    const idxVar = g.temp("ti");
    const restExpr = `${g.input}[${idxVar}]`;
    const restPath = `${g.path}.concat(${idxVar})`;
    code += emit`
      for(var ${idxVar}=${len};${idxVar}<${g.input}.length;${idxVar}++){
        ${g.visit(ir.rest, { input: restExpr, output: restExpr, path: restPath })}
      }`;
  }

  code += `}\n`;
  return code;
}

export function fastTuple(ir: TupleIR, g: FastGen): string | null {
  const x = g.input;
  const parts: string[] = [`Array.isArray(${x})`];

  if (ir.rest === null) {
    parts.push(`${x}.length===${ir.items.length}`);
  } else {
    parts.push(`${x}.length>=${ir.items.length}`);
  }

  // Per-index checks
  for (let i = 0; i < ir.items.length; i++) {
    const itemIR = ir.items[i];
    if (!itemIR) continue;
    const itemCheck = g.visit(itemIR, { input: `${x}[${i}]` });
    if (itemCheck === null) return null;
    if (itemCheck !== "true") parts.push(itemCheck);
  }

  // Rest element validation via preamble helper (avoids .slice().every() allocation)
  if (ir.rest !== null) {
    const rv = g.temp("tr");
    const restCheck = g.visit(ir.rest, { input: rv });
    if (restCheck === null) return null;
    if (restCheck !== "true") {
      const helperName = g.temp("te");
      g.ctx.preamble.push(
        `function ${helperName}(a,s){for(var __i=s;__i<a.length;__i++){var ${rv}=a[__i];if(!(${restCheck}))return false;}return true;}`,
      );
      parts.push(`${helperName}(${x},${ir.items.length})`);
    }
  }

  return parts.join("&&");
}
