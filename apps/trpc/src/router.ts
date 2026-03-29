import { initTRPC } from "@trpc/server";
import {
  CompiledCreateUserSchema,
  CompiledListUsersSchema,
  CompiledUpdateUserSchema,
  CompiledUserIdSchema,
  CreateUserSchema,
  ListUsersSchema,
  UpdateUserSchema,
  UserIdSchema,
} from "./schemas.js";

const t = initTRPC.create();

// ============================================================
// In-memory store
// ============================================================

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  role: "admin" | "editor" | "viewer";
}

let nextId = 1;
const users = new Map<string, User>();

function resetStore() {
  nextId = 1;
  users.clear();
}

function createUser(input: Omit<User, "id">): User {
  const id = String(nextId++);
  const user: User = { id, ...input };
  users.set(id, user);
  return user;
}

function listUsers(opts: { page: number; limit: number; role?: string | undefined }) {
  let result = [...users.values()];
  if (opts.role) {
    result = result.filter((u) => u.role === opts.role);
  }
  const start = (opts.page - 1) * opts.limit;
  return {
    users: result.slice(start, start + opts.limit),
    total: result.length,
    page: opts.page,
    limit: opts.limit,
  };
}

// ============================================================
// Zod native router (baseline)
// ============================================================

const zodRouter = t.router({
  create: t.procedure.input(CreateUserSchema).mutation(({ input }) => {
    return createUser(input);
  }),

  list: t.procedure.input(ListUsersSchema).query(({ input }) => {
    return listUsers(input);
  }),

  getById: t.procedure.input(UserIdSchema).query(({ input }) => {
    return users.get(input.id) ?? null;
  }),

  update: t.procedure.input(UpdateUserSchema.and(UserIdSchema)).mutation(({ input }) => {
    const { id, ...data } = input;
    const user = users.get(id);
    if (!user) return null;
    Object.assign(user, data);
    return user;
  }),

  delete: t.procedure.input(UserIdSchema).mutation(({ input }) => {
    return users.delete(input.id);
  }),
});

// ============================================================
// zod-aot compiled router
// compile() returns T & CompiledSchema<output<T>>, so the
// original Zod type is preserved for tRPC type inference.
// ============================================================

const aotRouter = t.router({
  create: t.procedure.input(CompiledCreateUserSchema).mutation(({ input }) => {
    return createUser(input);
  }),

  list: t.procedure.input(CompiledListUsersSchema).query(({ input }) => {
    return listUsers(input);
  }),

  getById: t.procedure.input(CompiledUserIdSchema).query(({ input }) => {
    return users.get(input.id) ?? null;
  }),

  update: t.procedure
    .input(CompiledUpdateUserSchema.and(CompiledUserIdSchema))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      const user = users.get(id);
      if (!user) return null;
      Object.assign(user, data);
      return user;
    }),

  delete: t.procedure.input(CompiledUserIdSchema).mutation(({ input }) => {
    return users.delete(input.id);
  }),
});

// ============================================================
// App router
// ============================================================

export const appRouter = t.router({
  zod: zodRouter,
  aot: aotRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = t.createCallerFactory(appRouter);

export { resetStore };
