import type { StringBoolIR } from "../../types.js";
import type { SlowGen } from "../context.js";
import { ENUM_INLINE_THRESHOLD, escapeString } from "../context.js";
import { emit } from "../emit.js";

export function slowStringBool(ir: StringBoolIR, g: SlowGen): string {
  let code = "";

  // Type check: input must be a string
  code += emit`
    if(typeof ${g.input}!=="string"){
      ${g.issues}.push({code:"invalid_type",expected:"string",input:${g.input},path:${g.path}});
    }else{
  `;

  // Normalize input for case-insensitive matching
  const normalized = ir.caseSensitive ? g.input : `${g.input}.toLowerCase()`;
  const allValues = [...ir.truthy, ...ir.falsy];

  // Compare per-side counts against threshold (not the combined total)
  const useInline =
    ir.truthy.length <= ENUM_INLINE_THRESHOLD && ir.falsy.length <= ENUM_INLINE_THRESHOLD;

  if (useInline) {
    const truthyCondition = ir.truthy.map((v) => `${normalized}===${escapeString(v)}`).join("||");
    const falsyCondition = ir.falsy.map((v) => `${normalized}===${escapeString(v)}`).join("||");
    code += emit`
      if(${truthyCondition}){${g.output}=true;}
      else if(${falsyCondition}){${g.output}=false;}
      else{${g.issues}.push({code:"invalid_value",values:${JSON.stringify(allValues)},input:${g.input},path:${g.path}});}
    `;
  } else {
    const truthySet = g.set("sbT", ir.truthy);
    const falsySet = g.set("sbF", ir.falsy);
    code += emit`
      if(${truthySet}.has(${normalized})){${g.output}=true;}
      else if(${falsySet}.has(${normalized})){${g.output}=false;}
      else{${g.issues}.push({code:"invalid_value",values:${JSON.stringify(allValues)},input:${g.input},path:${g.path}});}
    `;
  }

  code += emit`}`;
  return `${code}\n`;
}
