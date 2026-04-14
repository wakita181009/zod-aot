import type { FileIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { escapeString } from "../context.js";
import { emit } from "../emit.js";

export function slowFile(ir: FileIR, g: SlowGen): string {
  let code = emit`
    if(!(${g.input} instanceof File)){
      ${g.issues}.push({code:"invalid_type",expected:"file",input:${g.input},path:${g.path}});
    }else{`;

  if (ir.checks) {
    for (const check of ir.checks) {
      switch (check.kind) {
        case "min_size":
          code += emit`
            if(${g.input}.size<${check.minimum}){
              ${g.issues}.push({code:"too_small",minimum:${check.minimum},origin:"file",inclusive:true,input:${g.input},path:${g.path}});
            }`;
          break;
        case "max_size":
          code += emit`
            if(${g.input}.size>${check.maximum}){
              ${g.issues}.push({code:"too_big",maximum:${check.maximum},origin:"file",inclusive:true,input:${g.input},path:${g.path}});
            }`;
          break;
        case "mime_type": {
          if (check.mime.length === 0) break;
          if (check.mime.length === 1) {
            code += emit`
              if(${g.input}.type!==${escapeString(check.mime[0] as string)}){
                ${g.issues}.push({code:"invalid_value",values:${JSON.stringify(check.mime)},input:${g.input},path:${g.path}});
              }`;
          } else {
            const setVar = g.set("mime", check.mime);
            code += emit`
              if(!${setVar}.has(${g.input}.type)){
                ${g.issues}.push({code:"invalid_value",values:${JSON.stringify(check.mime)},input:${g.input},path:${g.path}});
              }`;
          }
          break;
        }
      }
    }
  }

  code += emit`}`;
  return `${code}\n`;
}

export function fastFile(ir: FileIR, g: FastGen): string | null {
  const x = g.input;
  const parts: string[] = [`${x} instanceof File`];

  if (ir.checks) {
    for (const check of ir.checks) {
      switch (check.kind) {
        case "min_size":
          parts.push(`${x}.size>=${check.minimum}`);
          break;
        case "max_size":
          parts.push(`${x}.size<=${check.maximum}`);
          break;
        case "mime_type":
          if (check.mime.length === 0) break;
          if (check.mime.length === 1) {
            parts.push(`${x}.type===${escapeString(check.mime[0] as string)}`);
          } else {
            const setVar = g.temp("mimeSet");
            g.ctx.preamble.push(`var ${setVar}=new Set(${JSON.stringify(check.mime)});`);
            parts.push(`${setVar}.has(${x}.type)`);
          }
          break;
      }
    }
  }

  return parts.join("&&");
}
