import { z } from "zod";

// ─── Object with partial fallback (transform on one property) ──────────────

export const PartialFallbackObjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  email: z.email(),
  slug: z.string().transform((v) => v.toLowerCase().replace(/\s+/g, "-")),
  role: z.enum(["admin", "user", "guest"]),
  isActive: z.boolean(),
});

export type PartialFallbackObject = z.infer<typeof PartialFallbackObjectSchema>;

export const validPartialFallbackObject = {
  id: 1,
  name: "Alice Developer",
  email: "alice@example.com",
  slug: "Alice Developer",
  role: "admin" as const,
  isActive: true,
};

// ─── Array of objects with partial fallback ────────────────────────────────

const FallbackItemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200),
  normalizedTitle: z.string().transform((v) => v.trim().toLowerCase()),
  tags: z.array(z.string().min(1)).max(10),
  score: z.number().positive(),
});

export const FallbackArraySchema = z.array(FallbackItemSchema);

function makeFallbackItem(i: number) {
  return {
    id: i + 1,
    title: `Item ${i + 1}`,
    normalizedTitle: ` Item ${i + 1} `,
    tags: ["tag1", "tag2"],
    score: (i + 1) * 10.5,
  };
}

export const validFallbackArray10 = Array.from({ length: 10 }, (_, i) => makeFallbackItem(i));
export const validFallbackArray50 = Array.from({ length: 50 }, (_, i) => makeFallbackItem(i));
