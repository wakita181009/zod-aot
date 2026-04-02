export interface TransformOptions {
  zodCompat?: boolean | undefined;
  verbose?: boolean | undefined;
  autoDiscover?: boolean | undefined;
  onBuildStats?: (stats: BuildStats) => void;
}

export interface BuildStats {
  files: number;
  schemas: number;
  optimized: number;
  failed: number;
}

export class BuildStatsAccumulator implements BuildStats {
  files = 0;
  schemas = 0;
  optimized = 0;
  failed = 0;

  add(s: BuildStats): void {
    this.files += s.files;
    this.schemas += s.schemas;
    this.optimized += s.optimized;
    this.failed += s.failed;
  }

  reset(): void {
    this.files = 0;
    this.schemas = 0;
    this.optimized = 0;
    this.failed = 0;
  }
}

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
  /**
   * Enable verbose logging during build.
   * Logs per-schema compilation status and a build summary.
   * @default false
   */
  verbose?: boolean | undefined;
  /**
   * Auto-detect all exported Zod schemas without requiring compile() wrappers.
   * When enabled, the plugin scans exports for Zod schemas (via `_zod.def` detection)
   * and compiles them at build time. No `import { compile } from "zod-aot"` needed.
   *
   * **Note:** Files with runtime Zod imports are executed at build time via `loadSourceFile()`.
   * Use `include` to limit scope if your project has schema files with side effects.
   * @default false
   */
  autoDiscover?: boolean | undefined;
}
