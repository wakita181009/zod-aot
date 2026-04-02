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
  // Generate checks for each branch, keyed by discriminator value
  const branchChecks: string[] = [];
  for (const option of ir.options) {
    const check = g.visit(option);
    if (check === null) return null;
    branchChecks.push(`(${check})`);
  }
  // Combine as || chain, wrapped for precedence safety
  return `(${branchChecks.join("||")})`;
}
