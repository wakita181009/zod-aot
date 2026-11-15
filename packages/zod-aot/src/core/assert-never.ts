/** Exhaustiveness guard: a missing switch case becomes a compile error. */
export function assertNever(value: never): never {
  throw new Error(`zod-aot: unhandled case ${JSON.stringify(value)}`);
}
