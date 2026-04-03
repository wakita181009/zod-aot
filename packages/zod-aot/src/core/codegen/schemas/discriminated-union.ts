import type { DiscriminatedUnionIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { escapeString } from "../context.js";
import { emit } from "../emit.js";

export function slowDiscriminatedUnion(
  ir: SchemaIR & { type: "discriminatedUnion" },
  g: SlowGen,
): string {
  const discKey = escapeString(ir.discriminator);

  let code = emit`
    if(typeof ${g.input}!=="object"||${g.input}===null||Array.isArray(${g.input})){
      ${g.issues}.push({code:"invalid_type",expected:"object",input:${g.input},path:${g.path}});
    }else{`;

  const objVar = g.temp("du");
  code += `var ${objVar}=${g.input};switch(${objVar}[${discKey}]){`;

  for (const [value, index] of Object.entries(ir.mapping)) {
    const option = ir.options[index] as SchemaIR;
    code += emit`
      case ${escapeString(value)}:
        ${g.visit(option, { input: objVar, output: objVar })}
        break;`;
  }

  code += emit`
    default:
      ${g.issues}.push({code:"invalid_union",errors:[],note:"No matching discriminator",discriminator:${discKey},input:${g.input},path:${g.path}.concat(${discKey})});
    }
  }`;
  return `${code}\n`;
}

export function fastDiscriminatedUnion(ir: DiscriminatedUnionIR, g: FastGen): string | null {
  const x = g.input;
  const discKey = escapeString(ir.discriminator);

  // Generate switch-based dispatch for O(1) discriminator lookup
  const helperName = g.temp("du");
  const helperParam = g.temp("dx");
  const cases: string[] = [];

  for (const [value, index] of Object.entries(ir.mapping)) {
    const option = ir.options[index] as SchemaIR;
    const check = g.visit(option, { input: helperParam });
    if (check === null) return null;
    cases.push(`case ${escapeString(value)}:return ${check};`);
  }

  g.ctx.preamble.push(
    `function ${helperName}(${helperParam}){switch(${helperParam}[${discKey}]){${cases.join("")}default:return false;}}`,
  );

  return `typeof ${x}==="object"&&${x}!==null&&!Array.isArray(${x})&&${helperName}(${x})`;
}
