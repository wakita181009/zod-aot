import type { SchemaIR } from "../types.js";
import type { CodeGenContext, CodeGenResult } from "./context.js";

export type { CodeGenResult } from "./context.js";

import {
  generateAnyValidation,
  generateArrayValidation,
  generateBooleanValidation,
  generateDateValidation,
  generateDefaultValidation,
  generateDiscriminatedUnionValidation,
  generateEnumValidation,
  generateIntersectionValidation,
  generateLiteralValidation,
  generateNullableValidation,
  generateNullValidation,
  generateNumberValidation,
  generateObjectValidation,
  generateOptionalValidation,
  generateReadonlyValidation,
  generateRecordValidation,
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
export function generateValidator(ir: SchemaIR, name: string): CodeGenResult {
  const ctx: CodeGenContext = { preamble: [], counter: 0 };
  const bodyCode = generateValidation(ir, "input", "[]", "__issues", ctx);

  const code = ["/* zod-aot */", ...ctx.preamble].join("\n");

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
