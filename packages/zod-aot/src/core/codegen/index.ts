import type { SchemaIR } from "../types.js";
import type { CodeGenContext, CodeGenResult } from "./context.js";

export type { CodeGenResult } from "./context.js";

import {
  generateAnyValidation,
  generateArrayValidation,
  generateBigIntValidation,
  generateBooleanValidation,
  generateDateValidation,
  generateDefaultValidation,
  generateDiscriminatedUnionValidation,
  generateEnumValidation,
  generateIntersectionValidation,
  generateLiteralValidation,
  generateMapValidation,
  generateNullableValidation,
  generateNullValidation,
  generateNumberValidation,
  generateObjectValidation,
  generateOptionalValidation,
  generatePipeValidation,
  generateReadonlyValidation,
  generateRecordValidation,
  generateSetValidation,
  generateStringValidation,
  generateTupleValidation,
  generateUndefinedValidation,
  generateUnionValidation,
  generateUnknownValidation,
} from "./generators/index.js";

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
      return generateObjectValidation(ir, inputExpr, pathExpr, issuesVar, ctx, generateValidation);
    case "array":
      return generateArrayValidation(ir, inputExpr, pathExpr, issuesVar, ctx, generateValidation);
    case "union":
      return generateUnionValidation(ir, inputExpr, pathExpr, issuesVar, ctx, generateValidation);
    case "optional":
      return generateOptionalValidation(
        ir,
        inputExpr,
        pathExpr,
        issuesVar,
        ctx,
        generateValidation,
      );
    case "nullable":
      return generateNullableValidation(
        ir,
        inputExpr,
        pathExpr,
        issuesVar,
        ctx,
        generateValidation,
      );
    case "fallback":
      if (ir.fallbackIndex !== undefined) {
        const idx = ir.fallbackIndex;
        const rVar = `__fb_r${idx}`;
        const iVar = `__fb_i${idx}`;
        const jVar = `__fb_j${idx}`;
        let fbCode = `var ${rVar}=__fb[${idx}].safeParse(${inputExpr});\n`;
        fbCode += `if(!${rVar}.success){`;
        fbCode += `var ${iVar}=${rVar}.error.issues;`;
        fbCode += `for(var ${jVar}=0;${jVar}<${iVar}.length;${jVar}++){`;
        fbCode += `${issuesVar}.push(Object.assign({},${iVar}[${jVar}],`;
        fbCode += `{path:${pathExpr}.concat(${iVar}[${jVar}].path)}));`;
        fbCode += `}}`;
        fbCode += `else{${inputExpr}=${rVar}.data;}\n`;
        return fbCode;
      }
      return `${issuesVar}.push({code:"custom",path:${pathExpr},message:"Fallback schema: ${ir.reason}"});\n`;
    case "any":
      return generateAnyValidation();
    case "unknown":
      return generateUnknownValidation();
    case "readonly":
      return generateReadonlyValidation(
        ir,
        inputExpr,
        pathExpr,
        issuesVar,
        ctx,
        generateValidation,
      );
    case "date":
      return generateDateValidation(ir, inputExpr, pathExpr, issuesVar);
    case "tuple":
      return generateTupleValidation(ir, inputExpr, pathExpr, issuesVar, ctx, generateValidation);
    case "record":
      return generateRecordValidation(ir, inputExpr, pathExpr, issuesVar, ctx, generateValidation);
    case "default":
      return generateDefaultValidation(ir, inputExpr, pathExpr, issuesVar, ctx, generateValidation);
    case "intersection":
      return generateIntersectionValidation(
        ir,
        inputExpr,
        pathExpr,
        issuesVar,
        ctx,
        generateValidation,
      );
    case "discriminatedUnion":
      return generateDiscriminatedUnionValidation(
        ir,
        inputExpr,
        pathExpr,
        issuesVar,
        ctx,
        generateValidation,
      );
    case "bigint":
      return generateBigIntValidation(ir, inputExpr, pathExpr, issuesVar, ctx);
    case "set":
      return generateSetValidation(ir, inputExpr, pathExpr, issuesVar, ctx, generateValidation);
    case "map":
      return generateMapValidation(ir, inputExpr, pathExpr, issuesVar, ctx, generateValidation);
    case "pipe":
      return generatePipeValidation(ir, inputExpr, pathExpr, issuesVar, ctx, generateValidation);
  }
}

/**
 * Generate optimized validation code from SchemaIR.
 *
 * - `code`: preamble declarations (Sets, RegExps, etc.) — deterministic for the same IR
 * - `functionName`: full function expression string referencing preamble vars via closure
 *
 * Usage: `new Function(code + "\nreturn " + functionName + ";")()`
 */
export function generateValidator(
  ir: SchemaIR,
  name: string,
  options?: { fallbackCount?: number },
): CodeGenResult {
  const ctx: CodeGenContext = { preamble: [], counter: 0 };
  const bodyCode = generateValidation(ir, "input", "[]", "__issues", ctx);

  const code = ["/* zod-aot */", ...ctx.preamble].join("\n");

  const fnName = `safeParse_${name}`;
  const functionName = [
    `function ${fnName}(input){`,
    `var __issues=[];`,
    bodyCode,
    `if(__issues.length>0){`,
    `for(var __fi=0;__fi<__issues.length;__fi++){`,
    `if(typeof __msg==="function")__issues[__fi].message=__msg(__issues[__fi]);`,
    `delete __issues[__fi].input;`,
    `}`,
    `return{success:false,error:{issues:__issues}};`,
    `}`,
    `return{success:true,data:input};`,
    `}`,
  ].join("\n");

  return { code, functionName, fallbackCount: options?.fallbackCount ?? 0 };
}
