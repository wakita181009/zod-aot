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
  /** Overwrite transform (`check: "overwrite"`), e.g. the function behind `.trim()`. */
  tx?: unknown;
  /** `{ abort: true }` check option. */
  abort?: boolean;
  /** URL format options. */
  hostname?: RegExp;
  protocol?: RegExp;
  normalize?: boolean;
  mime: string[];
  error?: (...args: unknown[]) => unknown;
}

export interface ZodCheckSchema {
  _zod?: {
    def: ZodCheckDef;
    /** Zod's runtime check; only probed, never relied on for codegen semantics. */
    check?: (payload: { value: unknown; issues: Record<string, unknown>[] }) => void;
  };
}

export interface ZodDef {
  type: string;
  checks: ZodCheckSchema[];
  check: string;
  format: string;
  pattern: RegExp | string;
  shape: Record<string, ZodSchema>;
  /** Unknown-key policy of an object: absent (strip), never (strict), unknown (loose), or a schema. */
  catchall?: ZodSchema;
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
  /** `{ abort: true }` on format schemas such as z.email({ abort: true }). */
  abort?: boolean;
  /** `false` for exclusive unions (z.xor). */
  inclusive?: boolean;
  defaultValue: unknown;
  coerce?: boolean;
  catchValue?: (ctx: unknown) => unknown;
  /** Transform function reference (present when type is "transform"). */
  transform?: unknown;
  /** Reverse transform (present on Codec schemas like stringbool). */
  reverseTransform?: unknown;
}

export interface ZodSchema {
  _zod: {
    def: ZodDef;
    bag?: Record<string, unknown>;
    /** Resolved inner type for lazy schemas. */
    innerType?: ZodSchema;
    /** Pre-compiled pattern for templateLiteral schemas. */
    pattern?: RegExp;
    /** Version of the Zod build that created this schema. */
    version?: { major: number; minor: number; patch?: number };
    /** Set when an object may omit the key holding this schema (optional, default, catch, ...). */
    optin?: "optional" | "defaulted";
    /** Set when the parsed value may be undefined (optional, ...). */
    optout?: "optional";
  };
}

/** Entry collected during extraction for each fallback sub-schema. */
export interface RefEntry {
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
  | "template_literal"
  | "file";

// ─── Extractor context ──────────────────────────────────────────────────────

/** Context object for extractor functions. Unifies the varied parameter patterns. */
export interface ExtractorContext {
  /** Raw Zod schema reference (for fallback entries and schema._zod access). */
  readonly schema: unknown;
  /** Navigation path from root, e.g. '._zod.def.innerType' */
  readonly path: string;
  /** Fallback entries collector (undefined if partial fallback disabled). */
  readonly refs: RefEntry[] | undefined;
  /** Cycle detection set for lazy resolution. */
  readonly visiting: Set<unknown>;

  /** Recursively extract a child schema. Manages visiting set automatically. */
  visit(childSchema: unknown, pathSuffix?: string): import("../types.js").SchemaIR;

  /** Create a fallback entry for non-compilable sub-schemas. */
  fallback(reason: import("../types.js").FallbackIR["reason"]): import("../types.js").FallbackIR;
}

/** Extractor function signature — registered in extractRegistry. */
export type Extractor = (def: ZodDef, ctx: ExtractorContext) => import("../types.js").SchemaIR;

/**
 * Extractor for a type whose codegen implements checks. The dispatcher maps the
 * schema's checks with `mapCheck`, falls back on any it rejects, and passes the
 * rest to `extract`. Types registered with a plain Extractor fall back whenever
 * the schema carries checks.
 */
export interface CheckedExtractor<C> {
  mapCheck: import("./checks.js").CheckMapper<C>;
  extract(def: ZodDef, ctx: ExtractorContext, checks: C[]): import("../types.js").SchemaIR;
}
