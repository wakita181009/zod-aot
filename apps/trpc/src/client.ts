import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "./router.js";

const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "http://localhost:3001" })],
});

async function main() {
  // biome-ignore lint/suspicious/noConsole: demo output
  const log = console.log;

  log("=== tRPC + zod-aot demo ===\n");

  // Create users via both routers
  const zodUser = await trpc.zod.create.mutate({
    name: "Alice",
    email: "alice@example.com",
    age: 30,
    role: "admin",
  });
  log("[zod]  Created:", zodUser);

  const aotUser = await trpc.aot.create.mutate({
    name: "Bob",
    email: "bob@example.com",
    age: 25,
    role: "editor",
  });
  log("[aot]  Created:", aotUser);

  // List users
  const zodList = await trpc.zod.list.query({});
  log("\n[zod]  List:", zodList);

  const aotList = await trpc.aot.list.query({});
  log("[aot]  List:", aotList);

  // Get by ID
  const zodGet = await trpc.zod.getById.query({ id: zodUser.id });
  log("\n[zod]  Get #1:", zodGet);

  const aotGet = await trpc.aot.getById.query({ id: aotUser.id });
  log("[aot]  Get #2:", aotGet);

  // Update
  const updated = await trpc.aot.update.mutate({
    id: aotUser.id,
    name: "Bob Updated",
  });
  log("\n[aot]  Updated:", updated);

  // Validation error
  log("\n--- Validation error demo ---");
  try {
    await trpc.aot.create.mutate({
      name: "",
      email: "invalid",
      age: -1,
      role: "superadmin" as "admin",
    });
  } catch (e) {
    log("[aot]  Expected error:", (e as Error).message);
  }

  // Delete
  const deleted = await trpc.zod.delete.mutate({ id: zodUser.id });
  log("\n[zod]  Deleted #1:", deleted);
}

main().catch((e) => {
  // biome-ignore lint/suspicious/noConsole: error output
  console.error(e);
  process.exit(1);
});
