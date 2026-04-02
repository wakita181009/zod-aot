import type { RecordIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { hasMutation } from "../context.js";
import { emit } from "../emit.js";

export function slowRecord(ir: SchemaIR & { type: "record" }, g: SlowGen): string {
  let code = emit`
    if(typeof ${g.input}!=="object"||${g.input}===null||Array.isArray(${g.input})){
      ${g.issues}.push({code:"invalid_type",expected:"record",input:${g.input},path:${g.path}});
    }else{`;

  if (hasMutation(ir.valueType)) {
    code += `${g.output}=Object.assign({},${g.input});`;
  }

  const keysVar = g.temp("rk");
  const idxVar = g.temp("ri");
  const keyVar = g.temp("rkey");
  const keyIssuesVar = g.temp("rki");
  const keyPath = `${g.path}.concat(${keyVar})`;
  const valExpr = `${g.input}[${keyVar}]`;

  code += emit`
    var ${keysVar}=Object.keys(${g.input});
    for(var ${idxVar}=0;${idxVar}<${keysVar}.length;${idxVar}++){
      var ${keyVar}=${keysVar}[${idxVar}];
      var ${keyIssuesVar}=[];
      ${g.visit(ir.keyType, { input: keyVar, output: keyVar, path: keyPath, issues: keyIssuesVar })}
      if(${keyIssuesVar}.length>0){
        ${g.issues}.push({code:"invalid_key",origin:"record",path:${keyPath},issues:${keyIssuesVar}});
      }else{
        ${g.visit(ir.valueType, { input: valExpr, output: valExpr, path: keyPath })}
      }
    }
  }`;
  return `${code}\n`;
}

export function fastRecord(ir: RecordIR, g: FastGen): string | null {
  const x = g.input;
  const parts: string[] = [`typeof ${x}==="object"`, `${x}!==null`, `!Array.isArray(${x})`];

  // Use a placeholder for the object reference inside the helper function.
  // The helper receives the object as parameter 'o', so val access is o[key].
  const kv = g.temp("rk");
  const helperObj = "__ro";
  const keyCheck = g.visit(ir.keyType, { input: kv });
  const valCheck = g.visit(ir.valueType, { input: `${helperObj}[${kv}]` });
  if (keyCheck === null || valCheck === null) return null;

  const conditions: string[] = [];
  if (keyCheck !== "true") conditions.push(keyCheck);
  if (valCheck !== "true") conditions.push(valCheck);

  if (conditions.length > 0) {
    const helperName = g.temp("re");
    g.ctx.preamble.push(
      `function ${helperName}(${helperObj}){var __k=Object.keys(${helperObj});for(var __i=0;__i<__k.length;__i++){var ${kv}=__k[__i];if(!(${conditions.join("&&")}))return false;}return true;}`,
    );
    parts.push(`${helperName}(${x})`);
  }

  return parts.join("&&");
}
