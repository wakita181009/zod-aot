/**
 * SchemaIR — Intermediate representation for Zod schemas.
 * Extracted from Zod's `_zod.def` and `_zod.bag` at build time.
 */

// ─── Check IR ───────────────────────────────────────────────────────────────

export interface CheckMinLength {
  kind: "min_length";
  minimum: number;
}

export interface CheckMaxLength {
  kind: "max_length";
  maximum: number;
}

export interface CheckLengthEquals {
  kind: "length_equals";
  length: number;
}

export interface CheckGreaterThan {
  kind: "greater_than";
  value: number;
  inclusive: boolean;
}

export interface CheckLessThan {
  kind: "less_than";
  value: number;
  inclusive: boolean;
}

export interface CheckMultipleOf {
  kind: "multiple_of";
  value: number;
}

export interface CheckNumberFormat {
  kind: "number_format";
  format: "safeint" | "int32" | "uint32" | "float32" | "float64";
}

export interface CheckStringFormat {
  kind: "string_format";
  format: string;
  pattern?: string;
}

export type CheckIR =
  | CheckMinLength
  | CheckMaxLength
  | CheckLengthEquals
  | CheckGreaterThan
  | CheckLessThan
  | CheckMultipleOf
  | CheckNumberFormat
  | CheckStringFormat;

// ─── Schema IR ──────────────────────────────────────────────────────────────

export interface StringIR {
  type: "string";
  checks: CheckIR[];
}

export interface NumberIR {
  type: "number";
  checks: CheckIR[];
}

export interface BooleanIR {
  type: "boolean";
}

export interface NullIR {
  type: "null";
}

export interface UndefinedIR {
  type: "undefined";
}

export interface LiteralIR {
  type: "literal";
  values: (string | number | boolean | null)[];
}

export interface EnumIR {
  type: "enum";
  values: string[];
}

export interface ObjectIR {
  type: "object";
  properties: Record<string, SchemaIR>;
}

export interface ArrayIR {
  type: "array";
  element: SchemaIR;
  checks: CheckIR[];
}

export interface UnionIR {
  type: "union";
  options: SchemaIR[];
}

export interface OptionalIR {
  type: "optional";
  inner: SchemaIR;
}

export interface NullableIR {
  type: "nullable";
  inner: SchemaIR;
}

export interface FallbackIR {
  type: "fallback";
  reason: "transform" | "refine" | "superRefine" | "custom" | "unsupported";
}

export type SchemaIR =
  | StringIR
  | NumberIR
  | BooleanIR
  | NullIR
  | UndefinedIR
  | LiteralIR
  | EnumIR
  | ObjectIR
  | ArrayIR
  | UnionIR
  | OptionalIR
  | NullableIR
  | FallbackIR;

// ─── Compiled Schema Interface ──────────────────────────────────────────────

export interface SafeParseSuccess<T> {
  success: true;
  data: T;
}

export interface SafeParseError {
  success: false;
  error: ZodErrorLike;
}

export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseError;

export interface ZodIssueLike {
  code: string;
  path: (string | number)[];
  message: string;
  [key: string]: unknown;
}

export interface ZodErrorLike {
  issues: ZodIssueLike[];
}

export interface CompiledSchema<T> {
  parse(input: unknown): T;
  safeParse(input: unknown): SafeParseResult<T>;
  is(input: unknown): input is T;
  schema: unknown;
}
