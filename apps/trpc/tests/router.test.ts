import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it } from "vitest";
import { createCaller, resetStore } from "../src/router.js";
import {
  CompiledCreateUserSchema,
  CompiledListUsersSchema,
  CompiledUpdateUserSchema,
  CompiledUserIdSchema,
} from "../src/schemas.js";

const caller = createCaller({});

const validUser = {
  name: "Alice",
  email: "alice@example.com",
  age: 30,
  role: "admin" as const,
};

beforeEach(() => {
  resetStore();
});

// ============================================================
// Create
// ============================================================

describe("create", () => {
  const routes = ["zod", "aot"] as const;

  for (const route of routes) {
    describe(`${route}.create`, () => {
      it("creates a user with valid input", async () => {
        const user = await caller[route].create(validUser);
        expect(user).toEqual({ id: "1", ...validUser });
      });

      it("rejects empty name", async () => {
        await expect(caller[route].create({ ...validUser, name: "" })).rejects.toThrow(TRPCError);
      });

      it("rejects invalid email", async () => {
        await expect(caller[route].create({ ...validUser, email: "bad" })).rejects.toThrow(
          TRPCError,
        );
      });

      it("rejects invalid role", async () => {
        await expect(
          caller[route].create({
            ...validUser,
            role: "superadmin" as "admin",
          }),
        ).rejects.toThrow(TRPCError);
      });

      it("rejects negative age", async () => {
        await expect(caller[route].create({ ...validUser, age: -1 })).rejects.toThrow(TRPCError);
      });

      it("rejects non-integer age", async () => {
        await expect(caller[route].create({ ...validUser, age: 3.14 })).rejects.toThrow(TRPCError);
      });
    });
  }

  it("both return identical results for valid input", async () => {
    const zodUser = await caller.zod.create(validUser);
    resetStore();
    const aotUser = await caller.aot.create(validUser);
    expect(aotUser).toEqual(zodUser);
  });

  it("both reject the same invalid inputs", async () => {
    const invalidInputs = [
      { ...validUser, name: "" },
      { ...validUser, email: "bad" },
      { ...validUser, age: -1 },
      { ...validUser, role: "superadmin" as "admin" },
    ];

    for (const input of invalidInputs) {
      const zodErr = await caller.zod.create(input).catch((e: unknown) => e);
      const aotErr = await caller.aot.create(input).catch((e: unknown) => e);
      expect(zodErr).toBeInstanceOf(TRPCError);
      expect(aotErr).toBeInstanceOf(TRPCError);
    }
  });
});

// ============================================================
// List
// ============================================================

describe("list", () => {
  const routes = ["zod", "aot"] as const;

  for (const route of routes) {
    describe(`${route}.list`, () => {
      it("returns empty list initially", async () => {
        const result = await caller[route].list({});
        expect(result.users).toEqual([]);
        expect(result.total).toBe(0);
      });

      it("returns created users", async () => {
        await caller[route].create(validUser);
        const result = await caller[route].list({});
        expect(result.users).toHaveLength(1);
        expect(result.total).toBe(1);
      });

      it("filters by role", async () => {
        await caller[route].create(validUser);
        await caller[route].create({ ...validUser, role: "viewer" });

        const admins = await caller[route].list({ role: "admin" });
        expect(admins.users).toHaveLength(1);
        expect(admins.users[0]?.role).toBe("admin");
      });

      it("applies defaults for page and limit", async () => {
        const result = await caller[route].list({});
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
      });
    });
  }
});

// ============================================================
// Get by ID
// ============================================================

describe("getById", () => {
  const routes = ["zod", "aot"] as const;

  for (const route of routes) {
    describe(`${route}.getById`, () => {
      it("returns user by id", async () => {
        const created = await caller[route].create(validUser);
        const found = await caller[route].getById({ id: created.id });
        expect(found).toEqual(created);
      });

      it("returns null for unknown id", async () => {
        const found = await caller[route].getById({ id: "999" });
        expect(found).toBeNull();
      });

      it("rejects empty id", async () => {
        await expect(caller[route].getById({ id: "" })).rejects.toThrow(TRPCError);
      });
    });
  }
});

// ============================================================
// Update
// ============================================================

describe("update", () => {
  const routes = ["zod", "aot"] as const;

  for (const route of routes) {
    describe(`${route}.update`, () => {
      it("updates user fields", async () => {
        const created = await caller[route].create(validUser);
        const updated = await caller[route].update({
          id: created.id,
          name: "Updated",
        });
        expect(updated?.name).toBe("Updated");
        expect(updated?.email).toBe(validUser.email);
      });

      it("returns null for unknown id", async () => {
        const result = await caller[route].update({ id: "999", name: "X" });
        expect(result).toBeNull();
      });
    });
  }
});

// ============================================================
// Delete
// ============================================================

describe("delete", () => {
  const routes = ["zod", "aot"] as const;

  for (const route of routes) {
    describe(`${route}.delete`, () => {
      it("deletes existing user", async () => {
        const created = await caller[route].create(validUser);
        const deleted = await caller[route].delete({ id: created.id });
        expect(deleted).toBe(true);
      });

      it("returns false for unknown id", async () => {
        const deleted = await caller[route].delete({ id: "999" });
        expect(deleted).toBe(false);
      });
    });
  }
});

// ============================================================
// AOT compilation verification
// ============================================================

describe("aot compilation", () => {
  it("schemas use AOT-compiled safeParse (not Zod fallback)", () => {
    const schemas = [
      { name: "CompiledCreateUserSchema", schema: CompiledCreateUserSchema },
      { name: "CompiledUpdateUserSchema", schema: CompiledUpdateUserSchema },
      { name: "CompiledListUsersSchema", schema: CompiledListUsersSchema },
      { name: "CompiledUserIdSchema", schema: CompiledUserIdSchema },
    ];

    for (const { name, schema } of schemas) {
      // AOT-generated safeParse functions are named `safeParse_<SchemaName>`.
      // The Zod fallback (Object.create) delegates to Zod internals with different names.
      expect(schema.safeParse.name, `${name} should have AOT-compiled safeParse`).toBe(
        `safeParse_${name}`,
      );
    }
  });
});
