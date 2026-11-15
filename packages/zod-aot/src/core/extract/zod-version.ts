import type { ZodSchema } from "./types.js";

/**
 * Compares the version of the Zod build that created `schema`, so behavior
 * follows the user's installed Zod. Undefined when the schema carries none.
 */
export function zodAtLeast(
  schema: ZodSchema,
  major: number,
  minor: number,
  patch = 0,
): boolean | undefined {
  const version = schema._zod.version;
  if (version === undefined) return undefined;
  if (version.major !== major) return version.major > major;
  if (version.minor !== minor) return version.minor > minor;
  return (version.patch ?? 0) >= patch;
}
