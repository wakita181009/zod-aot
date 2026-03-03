import type { SchemaIR } from "../types.js";

export interface CodeGenResult {
  code: string;
  functionName: string;
}

// Zod v4's email regex pattern (as a source string for new RegExp())
const EMAIL_REGEX_SOURCE = String.raw`^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$`;

interface CodeGenContext {
  preamble: string[];
  counter: number;
}

function escapeString(s: string): string {
  return JSON.stringify(s);
}

function generateValidation(
  ir: SchemaIR,
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  switch (ir.type) {
    case "string":
      return generateStringValidation(ir, inputExpr, pathExpr, issuesVar, ctx);
    case "number":
      return generateNumberValidation(ir, inputExpr, pathExpr, issuesVar, ctx);
    case "boolean":
      return generateBooleanValidation(inputExpr, pathExpr, issuesVar);
    case "null":
      return generateNullValidation(inputExpr, pathExpr, issuesVar);
    case "undefined":
      return generateUndefinedValidation(inputExpr, pathExpr, issuesVar);
    case "literal":
      return generateLiteralValidation(ir, inputExpr, pathExpr, issuesVar);
    case "enum":
      return generateEnumValidation(ir, inputExpr, pathExpr, issuesVar, ctx);
    case "object":
      return generateObjectValidation(ir, inputExpr, pathExpr, issuesVar, ctx);
    case "array":
      return generateArrayValidation(ir, inputExpr, pathExpr, issuesVar, ctx);
    case "union":
      return generateUnionValidation(ir, inputExpr, pathExpr, issuesVar, ctx);
    case "optional":
      return generateOptionalValidation(ir, inputExpr, pathExpr, issuesVar, ctx);
    case "nullable":
      return generateNullableValidation(ir, inputExpr, pathExpr, issuesVar, ctx);
    case "fallback":
      return `${issuesVar}.push({code:"custom",path:${pathExpr},message:"Fallback schema: ${ir.reason}"});\n`;
  }
}

function generateStringValidation(
  ir: SchemaIR & { type: "string" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  let code = `if(typeof ${inputExpr}!=="string"){${issuesVar}.push({code:"invalid_type",expected:"string",received:typeof ${inputExpr},path:${pathExpr},message:"Expected string"});}`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of ir.checks) {
      switch (check.kind) {
        case "min_length":
          code += `if(${inputExpr}.length<${check.minimum}){${issuesVar}.push({code:"too_small",minimum:${check.minimum},type:"string",inclusive:true,path:${pathExpr},message:"String must contain at least ${check.minimum} character(s)"});}`;
          break;
        case "max_length":
          code += `if(${inputExpr}.length>${check.maximum}){${issuesVar}.push({code:"too_big",maximum:${check.maximum},type:"string",inclusive:true,path:${pathExpr},message:"String must contain at most ${check.maximum} character(s)"});}`;
          break;
        case "length_equals":
          code += `if(${inputExpr}.length!==${check.length}){${issuesVar}.push({code:"invalid_length",exact:${check.length},type:"string",path:${pathExpr},message:"String must be exactly ${check.length} character(s)"});}`;
          break;
        case "string_format": {
          let regexVar: string;
          if (check.format === "email") {
            regexVar = `__re_email_${ctx.counter++}`;
            ctx.preamble.push(`var ${regexVar}=new RegExp(${escapeString(EMAIL_REGEX_SOURCE)});`);
          } else if (check.format === "regex" && check.pattern) {
            regexVar = `__re_${ctx.counter++}`;
            ctx.preamble.push(`var ${regexVar}=new RegExp(${escapeString(check.pattern)});`);
          } else if (check.format === "url") {
            regexVar = `__re_url_${ctx.counter++}`;
            ctx.preamble.push(`var ${regexVar};try{${regexVar}=true;}catch(e){${regexVar}=false;}`);
            code += `if(!(function(s){try{new URL(s);return true;}catch(e){return false;}})(${inputExpr})){${issuesVar}.push({code:"invalid_string",validation:"url",path:${pathExpr},message:"Invalid url"});}`;
            continue;
          } else if (check.format === "uuid") {
            regexVar = `__re_uuid_${ctx.counter++}`;
            ctx.preamble.push(
              `var ${regexVar}=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;`,
            );
          } else {
            regexVar = `__re_${ctx.counter++}`;
            if (check.pattern) {
              ctx.preamble.push(`var ${regexVar}=new RegExp(${escapeString(check.pattern)});`);
            } else {
              continue;
            }
          }
          code += `if(!${regexVar}.test(${inputExpr})){${issuesVar}.push({code:"invalid_string",validation:${escapeString(check.format)},path:${pathExpr},message:"Invalid ${check.format}"});}`;
          break;
        }
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}

function generateNumberValidation(
  ir: SchemaIR & { type: "number" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  _ctx: CodeGenContext,
): string {
  let code = `if(typeof ${inputExpr}!=="number"||!Number.isFinite(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"number",received:typeof ${inputExpr},path:${pathExpr},message:"Expected number"});}`;

  if (ir.checks.length > 0) {
    code += `else{`;
    for (const check of ir.checks) {
      switch (check.kind) {
        case "greater_than":
          if (check.inclusive) {
            code += `if(${inputExpr}<${check.value}){${issuesVar}.push({code:"too_small",minimum:${check.value},type:"number",inclusive:true,path:${pathExpr},message:"Number must be greater than or equal to ${check.value}"});}`;
          } else {
            code += `if(${inputExpr}<=${check.value}){${issuesVar}.push({code:"too_small",minimum:${check.value},type:"number",inclusive:false,path:${pathExpr},message:"Number must be greater than ${check.value}"});}`;
          }
          break;
        case "less_than":
          if (check.inclusive) {
            code += `if(${inputExpr}>${check.value}){${issuesVar}.push({code:"too_big",maximum:${check.value},type:"number",inclusive:true,path:${pathExpr},message:"Number must be less than or equal to ${check.value}"});}`;
          } else {
            code += `if(${inputExpr}>=${check.value}){${issuesVar}.push({code:"too_big",maximum:${check.value},type:"number",inclusive:false,path:${pathExpr},message:"Number must be less than ${check.value}"});}`;
          }
          break;
        case "number_format":
          if (check.format === "safeint") {
            code += `if(!Number.isSafeInteger(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"integer",received:"float",path:${pathExpr},message:"Expected integer"});}`;
          }
          break;
        case "multiple_of":
          code += `if(${inputExpr}%${check.value}!==0){${issuesVar}.push({code:"not_multiple_of",multipleOf:${check.value},path:${pathExpr},message:"Number must be a multiple of ${check.value}"});}`;
          break;
      }
    }
    code += `}`;
  }

  return `${code}\n`;
}

function generateBooleanValidation(inputExpr: string, pathExpr: string, issuesVar: string): string {
  return `if(typeof ${inputExpr}!=="boolean"){${issuesVar}.push({code:"invalid_type",expected:"boolean",received:typeof ${inputExpr},path:${pathExpr},message:"Expected boolean"});}\n`;
}

function generateNullValidation(inputExpr: string, pathExpr: string, issuesVar: string): string {
  return `if(${inputExpr}!==null){${issuesVar}.push({code:"invalid_type",expected:"null",received:typeof ${inputExpr},path:${pathExpr},message:"Expected null"});}\n`;
}

function generateUndefinedValidation(
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  return `if(${inputExpr}!==undefined){${issuesVar}.push({code:"invalid_type",expected:"undefined",received:typeof ${inputExpr},path:${pathExpr},message:"Expected undefined"});}\n`;
}

function generateLiteralValidation(
  ir: SchemaIR & { type: "literal" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
): string {
  // For single literal, use direct comparison
  if (ir.values.length === 1) {
    const v = ir.values[0];
    let cond: string;
    if (v === null) {
      cond = `${inputExpr}!==null`;
    } else if (typeof v === "string") {
      cond = `${inputExpr}!==${escapeString(v)}`;
    } else {
      cond = `${inputExpr}!==${String(v)}`;
    }
    return `if(${cond}){${issuesVar}.push({code:"invalid_literal",expected:${JSON.stringify(v)},received:${inputExpr},path:${pathExpr},message:"Invalid literal value"});}\n`;
  }

  // Multiple values
  const valueChecks = ir.values
    .map((v) => {
      if (v === null) return `${inputExpr}===null`;
      if (typeof v === "string") return `${inputExpr}===${escapeString(v)}`;
      return `${inputExpr}===${String(v)}`;
    })
    .join("||");

  return `if(!(${valueChecks})){${issuesVar}.push({code:"invalid_literal",expected:${JSON.stringify(ir.values)},received:${inputExpr},path:${pathExpr},message:"Invalid literal value"});}\n`;
}

function generateEnumValidation(
  ir: SchemaIR & { type: "enum" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  const setVar = `__set_${ctx.counter++}`;
  ctx.preamble.push(`var ${setVar}=new Set(${JSON.stringify(ir.values)});`);
  return `if(!${setVar}.has(${inputExpr})){${issuesVar}.push({code:"invalid_enum_value",options:${JSON.stringify(ir.values)},received:${inputExpr},path:${pathExpr},message:"Invalid enum value"});}\n`;
}

function generateObjectValidation(
  ir: SchemaIR & { type: "object" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  let code = `if(typeof ${inputExpr}!=="object"||${inputExpr}===null||Array.isArray(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"object",received:Array.isArray(${inputExpr})?"array":${inputExpr}===null?"null":typeof ${inputExpr},path:${pathExpr},message:"Expected object"});}else{`;

  const objVar = `__o_${ctx.counter++}`;
  code += `var ${objVar}=${inputExpr};`;

  for (const [key, propIR] of Object.entries(ir.properties)) {
    const propExpr = `${objVar}[${escapeString(key)}]`;
    const propPath = `${pathExpr}.concat(${escapeString(key)})`;
    code += generateValidation(propIR, propExpr, propPath, issuesVar, ctx);
  }

  code += `}\n`;
  return code;
}

function generateArrayValidation(
  ir: SchemaIR & { type: "array" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  let code = `if(!Array.isArray(${inputExpr})){${issuesVar}.push({code:"invalid_type",expected:"array",received:typeof ${inputExpr},path:${pathExpr},message:"Expected array"});}else{`;

  // Length checks
  for (const check of ir.checks) {
    switch (check.kind) {
      case "min_length":
        code += `if(${inputExpr}.length<${check.minimum}){${issuesVar}.push({code:"too_small",minimum:${check.minimum},type:"array",inclusive:true,path:${pathExpr},message:"Array must contain at least ${check.minimum} element(s)"});}`;
        break;
      case "max_length":
        code += `if(${inputExpr}.length>${check.maximum}){${issuesVar}.push({code:"too_big",maximum:${check.maximum},type:"array",inclusive:true,path:${pathExpr},message:"Array must contain at most ${check.maximum} element(s)"});}`;
        break;
      case "length_equals":
        code += `if(${inputExpr}.length!==${check.length}){${issuesVar}.push({code:"invalid_length",exact:${check.length},type:"array",path:${pathExpr},message:"Array must contain exactly ${check.length} element(s)"});}`;
        break;
    }
  }

  // Element validation
  const idxVar = `__i_${ctx.counter++}`;
  code += `for(var ${idxVar}=0;${idxVar}<${inputExpr}.length;${idxVar}++){`;
  const elemExpr = `${inputExpr}[${idxVar}]`;
  const elemPath = `${pathExpr}.concat(${idxVar})`;
  code += generateValidation(ir.element, elemExpr, elemPath, issuesVar, ctx);
  code += `}`;

  code += `}\n`;
  return code;
}

function generateUnionValidation(
  ir: SchemaIR & { type: "union" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  const resultVar = `__u_${ctx.counter++}`;
  let code = `var ${resultVar}=false;`;

  for (const option of ir.options) {
    const tmpIssues = `__ui_${ctx.counter++}`;
    code += `if(!${resultVar}){var ${tmpIssues}=[];`;
    code += generateValidation(option, inputExpr, pathExpr, tmpIssues, ctx);
    code += `if(${tmpIssues}.length===0){${resultVar}=true;}}`;
  }

  code += `if(!${resultVar}){${issuesVar}.push({code:"invalid_union",unionErrors:[],path:${pathExpr},message:"Invalid input"});}\n`;
  return code;
}

function generateOptionalValidation(
  ir: SchemaIR & { type: "optional" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  let code = `if(${inputExpr}!==undefined){`;
  code += generateValidation(ir.inner, inputExpr, pathExpr, issuesVar, ctx);
  code += `}\n`;
  return code;
}

function generateNullableValidation(
  ir: SchemaIR & { type: "nullable" },
  inputExpr: string,
  pathExpr: string,
  issuesVar: string,
  ctx: CodeGenContext,
): string {
  let code = `if(${inputExpr}!==null){`;
  code += generateValidation(ir.inner, inputExpr, pathExpr, issuesVar, ctx);
  code += `}\n`;
  return code;
}

/**
 * Generate optimized validation code from SchemaIR.
 *
 * - `code`: preamble declarations (Sets, RegExps, etc.) — deterministic for the same IR
 * - `functionName`: full function expression string referencing preamble vars via closure
 *
 * Usage: `new Function(code + "\nreturn " + functionName + ";")()`
 */
export function generateValidator(ir: SchemaIR, name: string): CodeGenResult {
  const ctx: CodeGenContext = { preamble: [], counter: 0 };
  const bodyCode = generateValidation(ir, "input", "[]", "__issues", ctx);

  // code = preamble only (name-independent, deterministic for same IR)
  const code = ["/* zod-aot */", ...ctx.preamble].join("\n");

  // functionName = full function expression (references preamble vars via closure)
  const fnName = `safeParse_${name}`;
  const functionName = [
    `function ${fnName}(input){`,
    `var __issues=[];`,
    bodyCode,
    `if(__issues.length>0)return{success:false,error:{issues:__issues}};`,
    `return{success:true,data:input};`,
    `}`,
  ].join("\n");

  return { code, functionName };
}
