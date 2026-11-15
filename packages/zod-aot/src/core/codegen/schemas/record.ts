import type { RecordIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { hasMutation } from "../context.js";
import { emit } from "../emit.js";
import { invalidType } from "../emit-issue.js";

export function slowRecord(ir: SchemaIR & { type: "record" }, g: SlowGen): string {
  let code = emit`
    if(!${isPlainObject(g.input)}){
      ${invalidType(g, "record")}
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
  const parts: string[] = [isPlainObject(x)];

  const kv = g.temp("rk");
  const keyCheck = g.visit(ir.keyType, { input: kv });
  const valCheck = g.visit(ir.valueType, { input: `o[${kv}]` });
  if (keyCheck === null || valCheck === null) return null;

  const conditions: string[] = [];
  if (keyCheck !== "true") conditions.push(keyCheck);
  if (valCheck !== "true") conditions.push(valCheck);

  if (conditions.length > 0) {
    const helperName = g.temp("rf");
    g.ctx.preamble.push(
      `function ${helperName}(o){var ${kv},ks=Object.keys(o);for(var i=0;i<ks.length;i++){${kv}=ks[i];if(!(${conditions.join("&&")})){return false;}}return true;}`,
    );
    parts.push(`${helperName}(${x})`);
  }

  return parts.join("&&");
}

/**
 * Inline equivalent of Zod's `util.isPlainObject` (4.1+): rejects arrays, class
 * instances, Set/Map, etc., while accepting null-prototype objects.
 */
function isPlainObject(x: string): string {
  const ctor = `${x}.constructor`;
  const prot = `${ctor}.prototype`;
  return `(typeof ${x}==="object"&&${x}!==null&&!Array.isArray(${x})&&(${ctor}===undefined||typeof ${ctor}!=="function"||(typeof ${prot}==="object"&&${prot}!==null&&!Array.isArray(${prot})&&Object.prototype.hasOwnProperty.call(${prot},"isPrototypeOf"))))`;
}
