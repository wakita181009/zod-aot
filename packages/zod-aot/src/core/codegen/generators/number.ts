import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";
import { sortChecksPreservingEffects } from "../context.js";
import { emit } from "../emit.js";
import { generateRefineCheck } from "./effect.js";

export function generateNumberValidation(
  ir: SchemaIR & { type: "number" },
  inputExpr: string,
  outputExpr: string,
  pathExpr: string,
  issuesVar: string,
  _ctx: CodeGenContext,
): string {
  let code = "";
  if (ir.coerce) {
    code += emit`${outputExpr}=Number(${inputExpr});`;
  }
  code += emit`
    if(typeof ${inputExpr}!=="number"){
      ${issuesVar}.push({code:"invalid_type",expected:"number",input:${inputExpr},path:${pathExpr}});
    }else if(Number.isNaN(${inputExpr})){
      ${issuesVar}.push({code:"invalid_type",expected:"number",received:"NaN",input:${inputExpr},path:${pathExpr}});
    }else if(!Number.isFinite(${inputExpr})){
      ${issuesVar}.push({code:"invalid_type",expected:"number",received:"Infinity",input:${inputExpr},path:${pathExpr}});
    }`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of sortChecksPreservingEffects([...ir.checks])) {
      switch (check.kind) {
        case "greater_than":
          if (check.inclusive) {
            code += emit`
              if(${inputExpr}<${check.value}){
                ${issuesVar}.push({code:"too_small",minimum:${check.value},origin:"number",inclusive:true,input:${inputExpr},path:${pathExpr}});
              }`;
          } else {
            code += emit`
              if(${inputExpr}<=${check.value}){
                ${issuesVar}.push({code:"too_small",minimum:${check.value},origin:"number",inclusive:false,input:${inputExpr},path:${pathExpr}});
              }`;
          }
          break;
        case "less_than":
          if (check.inclusive) {
            code += emit`
              if(${inputExpr}>${check.value}){
                ${issuesVar}.push({code:"too_big",maximum:${check.value},origin:"number",inclusive:true,input:${inputExpr},path:${pathExpr}});
              }`;
          } else {
            code += emit`
              if(${inputExpr}>=${check.value}){
                ${issuesVar}.push({code:"too_big",maximum:${check.value},origin:"number",inclusive:false,input:${inputExpr},path:${pathExpr}});
              }`;
          }
          break;
        case "number_format":
          if (check.format === "safeint") {
            code += emit`
              if(!Number.isSafeInteger(${inputExpr})){
                ${issuesVar}.push({code:"invalid_type",expected:"int",format:"safeint",input:${inputExpr},path:${pathExpr}});
              }`;
          } else if (check.format === "int32") {
            code += emit`
              if(!Number.isInteger(${inputExpr})){
                ${issuesVar}.push({code:"invalid_type",expected:"int",format:"int32",input:${inputExpr},path:${pathExpr}});
              }else if(${inputExpr}<-2147483648){
                ${issuesVar}.push({code:"too_small",minimum:-2147483648,origin:"number",inclusive:true,input:${inputExpr},path:${pathExpr}});
              }else if(${inputExpr}>2147483647){
                ${issuesVar}.push({code:"too_big",maximum:2147483647,origin:"number",inclusive:true,input:${inputExpr},path:${pathExpr}});
              }`;
          } else if (check.format === "uint32") {
            code += emit`
              if(!Number.isInteger(${inputExpr})){
                ${issuesVar}.push({code:"invalid_type",expected:"int",format:"uint32",input:${inputExpr},path:${pathExpr}});
              }else if(${inputExpr}<0){
                ${issuesVar}.push({code:"too_small",minimum:0,origin:"number",inclusive:true,input:${inputExpr},path:${pathExpr}});
              }else if(${inputExpr}>4294967295){
                ${issuesVar}.push({code:"too_big",maximum:4294967295,origin:"number",inclusive:true,input:${inputExpr},path:${pathExpr}});
              }`;
          } else if (check.format === "float32") {
            code += emit`
              if(${inputExpr}<-3.4028234663852886e+38){
                ${issuesVar}.push({code:"too_small",minimum:-3.4028234663852886e+38,origin:"number",inclusive:true,input:${inputExpr},path:${pathExpr}});
              }else if(${inputExpr}>3.4028234663852886e+38){
                ${issuesVar}.push({code:"too_big",maximum:3.4028234663852886e+38,origin:"number",inclusive:true,input:${inputExpr},path:${pathExpr}});
              }`;
          }
          // float64 range is [-Number.MAX_VALUE, Number.MAX_VALUE], already covered by the isFinite check above
          break;
        case "multiple_of":
          code += emit`
            if(${inputExpr}%${check.value}!==0){
              ${issuesVar}.push({code:"not_multiple_of",divisor:${check.value},origin:"number",input:${inputExpr},path:${pathExpr}});
            }`;
          break;
        case "refine_effect":
          code += generateRefineCheck(check, inputExpr, pathExpr, issuesVar);
          break;
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}
