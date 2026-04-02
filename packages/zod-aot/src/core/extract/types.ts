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

/** Signature for the recursive extractSchema function, passed to extractors. */
export type ExtractFn = (
  zodSchema: unknown,
  fallbacks?: FallbackEntry[],
  currentPath?: string,
  visiting?: Set<unknown>,
) => import("../types.js").SchemaIR;
