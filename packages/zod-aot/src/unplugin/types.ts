export interface ZodAotPluginOptions {
  /** Glob patterns to include (default: ["**\/*.ts", "**\/*.tsx"]) */
  include?: string[];
  /** Glob patterns to exclude (default: ["node_modules/**", "**\/*.d.ts"]) */
  exclude?: string[];
  /**
   * Enable Zod-compatible output using Object.create.
   * When true (default), the compiled validator inherits from the original Zod schema,
   * making it compatible with libraries like @hono/zod-validator and tRPC.
   * When false, produces a minimal plain object for smaller bundle size.
   * @default true
   */
  zodCompat?: boolean | undefined;
}
