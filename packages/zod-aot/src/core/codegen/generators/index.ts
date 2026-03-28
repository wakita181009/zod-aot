import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";
import { generateAnyValidation } from "./any.js";
import { generateArrayValidation } from "./array.js";
import { generateBigIntValidation } from "./bigint.js";
import { generateBooleanValidation } from "./boolean.js";
import { generateCatchValidation } from "./catch.js";
import { generateDateValidation } from "./date.js";
import { generateDefaultValidation } from "./default.js";
import { generateDiscriminatedUnionValidation } from "./discriminated-union.js";
import { generateEnumValidation } from "./enum.js";
import { generateFallbackValidation } from "./fallback.js";
import { generateIntersectionValidation } from "./intersection.js";
import { generateLiteralValidation } from "./literal.js";
import { generateMapValidation } from "./map.js";
import { generateNanValidation } from "./nan.js";
import { generateNeverValidation } from "./never.js";
import { generateNullValidation } from "./null.js";
import { generateNullableValidation } from "./nullable.js";
import { generateNumberValidation } from "./number.js";
import { generateObjectValidation } from "./object.js";
import { generateOptionalValidation } from "./optional.js";
import { generatePipeValidation } from "./pipe.js";
import { generateReadonlyValidation } from "./readonly.js";
import { generateRecordValidation } from "./record.js";
import { generateRecursiveRefValidation } from "./recursive-ref.js";
import { generateSetValidation } from "./set.js";
import { generateStringValidation } from "./string.js";
import { generateSymbolValidation } from "./symbol.js";
import { generateTemplateLiteralValidation } from "./template-literal.js";
import { generateTupleValidation } from "./tuple.js";
import { generateUndefinedValidation } from "./undefined.js";
import { generateUnionValidation } from "./union.js";
import { generateUnknownValidation } from "./unknown.js";
import { generateVoidValidation } from "./void.js";

export function generateValidation(
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
      return generateBooleanValidation(ir, inputExpr, pathExpr, issuesVar);
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
      return generateFallbackValidation(ir, inputExpr, pathExpr, issuesVar);
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
    case "recursiveRef":
      return generateRecursiveRefValidation(inputExpr, pathExpr, issuesVar, ctx);
    case "symbol":
      return generateSymbolValidation(inputExpr, pathExpr, issuesVar);
    case "void":
      return generateVoidValidation(inputExpr, pathExpr, issuesVar);
    case "nan":
      return generateNanValidation(inputExpr, pathExpr, issuesVar);
    case "never":
      return generateNeverValidation(inputExpr, pathExpr, issuesVar);
    case "templateLiteral":
      return generateTemplateLiteralValidation(ir, inputExpr, pathExpr, issuesVar, ctx);
    case "catch":
      return generateCatchValidation(ir, inputExpr, pathExpr, issuesVar, ctx, generateValidation);
  }
}
