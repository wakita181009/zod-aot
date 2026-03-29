import { CreateUserSchema, ProductSchema } from "@/lib/schemas";

export default function Home() {
  const userResult = CreateUserSchema.safeParse({
    name: "Alice",
    email: "alice@example.com",
    age: 30,
    role: "admin",
  });

  const invalidUserResult = CreateUserSchema.safeParse({
    name: "",
    email: "not-an-email",
    age: -1,
    role: "unknown",
  });

  const productResult = ProductSchema.safeParse({
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Widget",
    price: 9.99,
    tags: ["electronics", "sale"],
    inStock: true,
  });

  return (
    <main style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>zod-aot + Next.js (webpack)</h1>

      <section>
        <h2>Valid User</h2>
        <pre>{JSON.stringify(userResult, null, 2)}</pre>
      </section>

      <section>
        <h2>Invalid User</h2>
        <pre>{JSON.stringify(invalidUserResult, null, 2)}</pre>
      </section>

      <section>
        <h2>Valid Product</h2>
        <pre>{JSON.stringify(productResult, null, 2)}</pre>
      </section>
    </main>
  );
}
