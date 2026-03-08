import { z } from "zod";

// ─── Non-recursive lazy (fully compiled) ────────────────────────────────────

export const LazyStringSchema = z.lazy(() => z.string().min(1).max(100));

export const validLazyString = "hello world";

export const LazyObjectSchema = z.object({
  name: z.lazy(() => z.string().min(1)),
  age: z.lazy(() => z.number().int().positive()),
  active: z.boolean(),
});

export type LazyObject = z.infer<typeof LazyObjectSchema>;

export const validLazyObject: LazyObject = { name: "Alice", age: 30, active: true };

// ─── Recursive lazy (tree node — partial fallback at recursion point) ───────

export const TreeNodeSchema: z.ZodType = z.object({
  value: z.string().min(1),
  children: z.array(z.lazy(() => TreeNodeSchema)),
});

function makeTree(depth: number, breadth: number): z.infer<typeof TreeNodeSchema> {
  if (depth <= 0) return { value: `leaf`, children: [] };
  return {
    value: `node-d${depth}`,
    children: Array.from({ length: breadth }, () => makeTree(depth - 1, breadth)),
  };
}

export const validTreeShallow = makeTree(2, 2); // 7 nodes
export const validTreeDeep = makeTree(4, 3); // 121 nodes
