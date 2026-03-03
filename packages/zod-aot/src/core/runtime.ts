import type { CompiledSchema, SafeParseResult, ZodErrorLike, ZodIssueLike } from "./types.js";

interface ZodSafeParseSuccess {
  success: true;
  data: unknown;
}

interface ZodSafeParseFailure {
  success: false;
  error: {
    issues: Array<{
      code: string;
      path: (string | number)[];
      message: string;
      [key: string]: unknown;
    }>;
  };
}

type ZodSafeParseResult = ZodSafeParseSuccess | ZodSafeParseFailure;

interface ZodLikeSchema {
  parse(input: unknown): unknown;
  safeParse(input: unknown): ZodSafeParseResult;
}

/**
 * Dev-time fallback: wraps Zod schema to provide the CompiledSchema interface.
 */
export function createFallback<T>(zodSchema: unknown): CompiledSchema<T> {
  const schema = zodSchema as ZodLikeSchema;

  return {
    parse(input: unknown): T {
      return schema.parse(input) as T;
    },

    safeParse(input: unknown): SafeParseResult<T> {
      const result = schema.safeParse(input);
      if (result.success) {
        return { success: true, data: result.data as T };
      }
      const issues: ZodIssueLike[] = result.error.issues.map((issue) => ({
        ...issue,
        code: issue.code,
        path: issue.path,
        message: issue.message,
      }));
      const error: ZodErrorLike = { issues };
      return { success: false, error };
    },

    is(input: unknown): input is T {
      return schema.safeParse(input).success;
    },

    schema: zodSchema,
  };
}
