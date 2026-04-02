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

  const kv = g.temp("rk");
  const keyCheck = g.visit(ir.keyType, { input: kv });
  const valCheck = g.visit(ir.valueType, { input: `${x}[${kv}]` });
  if (keyCheck === null || valCheck === null) return null;

  const conditions: string[] = [];
  if (keyCheck !== "true") conditions.push(keyCheck);
  if (valCheck !== "true") conditions.push(valCheck);

  if (conditions.length > 0) {
    parts.push(`Object.keys(${x}).every(${kv}=>${conditions.join("&&")})`);
  }

  return parts.join("&&");
}
