export interface ZodAotPluginOptions {
  /** Glob patterns to include (default: ["**\/*.ts", "**\/*.tsx"]) */
  include?: string[];
  /** Glob patterns to exclude (default: ["node_modules/**", "**\/*.d.ts"]) */
  exclude?: string[];
}
