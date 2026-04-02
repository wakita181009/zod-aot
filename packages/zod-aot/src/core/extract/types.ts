export interface ZodCheckDef {
  check: string;
  type: string;
  format: string;
  pattern: RegExp | string;
  minimum: number;
  maximum: number;
  length: number;
  value: number;
  inclusive: boolean;
  includes: string;
  position: number;
  prefix: string;
  suffix: string;
  fn: unknown;
  error?: (...args: unknown[]) => unknown;
}

export interface ZodCheckSchema {
  _zod?: {
    def: ZodCheckDef;
  };
}

export interface ZodDef {
  type: string;
  checks: ZodCheckSchema[];
  check: string;
  format: string;
  pattern: RegExp | string;
  shape: Record<string, ZodSchema>;
  element: ZodSchema;
  options: ZodSchema[];
  innerType: ZodSchema;
  values: (string | number | boolean | null)[];
  entries: Record<string, string>;
  in: ZodSchema;
  out: ZodSchema;
  items: ZodSchema[];
  rest: ZodSchema | null;
  keyType: ZodSchema;
  valueType: ZodSchema;
  left: ZodSchema;
  right: ZodSchema;
  discriminator: string;
  defaultValue: unknown;
  coerce?: boolean;
  catchValue?: (ctx: unknown) => unknown;
  /** Transform function reference (present when type is "transform"). */
  transform?: unknown;
}

export interface ZodSchema {
  _zod: {
    def: ZodDef;
    bag?: Record<string, unknown>;
    /** Resolved inner type for lazy schemas. */
    innerType?: ZodSchema;
    /** Pre-compiled pattern for templateLiteral schemas. */
    pattern?: RegExp;
  };
}

/** Entry collected during extraction for each fallback sub-schema. */
export interface FallbackEntry {
  /** Runtime reference to the Zod sub-schema. */
  schema: unknown;
  /** Navigation path from root schema, e.g. '.shape["slug"]' */
  accessPath: string;
}

// ─── Supported Zod def.type values ──────────────────────────────────────────

/** All Zod v4 def.type values that zod-aot supports. */
export type SupportedZodDefType =
  | "boolean"
  | "null"
  | "undefined"
  | "any"
  | "unknown"
  | "symbol"
  | "void"
  | "nan"
  | "never"
  | "literal"
  | "enum"
  | "optional"
  | "nullable"
  | "readonly"
  | "intersection"
  | "string"
  | "number"
  | "bigint"
  | "date"
  | "object"
  | "array"
  | "tuple"
  | "record"
  | "set"
  | "map"
  | "union"
  | "default"
  | "pipe"
  | "lazy"
  | "catch"
  | "template_literal";

// ─── Extractor context ──────────────────────────────────────────────────────

/** Context object for extractor functions. Unifies the varied parameter patterns. */
export interface ExtractorContext {
  /** Raw Zod schema reference (for fallback entries and schema._zod access). */
  readonly schema: unknown;
  /** Navigation path from root, e.g. '._zod.def.innerType' */
  readonly path: string;
  /** Fallback entries collector (undefined if partial fallback disabled). */
  readonly fallbacks: FallbackEntry[] | undefined;
  /** Cycle detection set for lazy resolution. */
  readonly visiting: Set<unknown>;

  /** Recursively extract a child schema. Manages visiting set automatically. */
  visit(childSchema: unknown, pathSuffix?: string): import("../types.js").SchemaIR;

  /** Create a fallback entry for non-compilable sub-schemas. */
  fallback(reason: import("../types.js").FallbackIR["reason"]): import("../types.js").FallbackIR;
}

/** Extractor function signature — registered in extractRegistry. */
export type Extractor = (def: ZodDef, ctx: ExtractorContext) => import("../types.js").SchemaIR;
