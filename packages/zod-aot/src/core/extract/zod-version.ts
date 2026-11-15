import type { ZodSchema } from "./types.js";

/**
 * Compares the version of the Zod build that created `schema`, so behavior
 * follows the user's installed Zod. Undefined when the schema carries none.
 */
export function zodAtLeast(schema: ZodSchema, major: number, minor: number): boolean | undefined {
  const version = schema._zod.version;
  if (version === undefined) return undefined;
  return version.major > major || (version.major === major && version.minor >= minor);
}
