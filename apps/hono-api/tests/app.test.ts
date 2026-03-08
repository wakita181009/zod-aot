import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

interface ApiResponse {
  validator?: string;
  data?: Record<string, unknown>;
  error?: string;
  issues?: unknown[];
}

const validUser = {
  name: "Alice",
  email: "alice@example.com",
  age: 30,
  role: "admin",
};

function post(path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /zod", () => {
  it("returns 200 with valid data", async () => {
    const res = await post("/zod", validUser);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ validator: "zod", data: validUser });
  });

  it("returns 400 with empty body", async () => {
    const res = await post("/zod", {});
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiResponse;
    expect(json.error).toBe("Validation failed");
    expect(json.issues?.length).toBeGreaterThan(0);
  });

  it("returns 400 when name is empty", async () => {
    const res = await post("/zod", { ...validUser, name: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await post("/zod", { ...validUser, email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when age is negative", async () => {
    const res = await post("/zod", { ...validUser, age: -1 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when age is not an integer", async () => {
    const res = await post("/zod", { ...validUser, age: 3.14 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when role is invalid", async () => {
    const res = await post("/zod", { ...validUser, role: "superadmin" });
    expect(res.status).toBe(400);
  });
});

describe("POST /zod-aot", () => {
  it("returns 200 with valid data", async () => {
    const res = await post("/zod-aot", validUser);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ validator: "zod-aot", data: validUser });
  });

  it("returns 400 with empty body", async () => {
    const res = await post("/zod-aot", {});
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiResponse;
    expect(json.error).toBe("Validation failed");
    expect(json.issues?.length).toBeGreaterThan(0);
  });

  it("returns 400 when name is empty", async () => {
    const res = await post("/zod-aot", { ...validUser, name: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await post("/zod-aot", { ...validUser, email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when age is negative", async () => {
    const res = await post("/zod-aot", { ...validUser, age: -1 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when age is not an integer", async () => {
    const res = await post("/zod-aot", { ...validUser, age: 3.14 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when role is invalid", async () => {
    const res = await post("/zod-aot", { ...validUser, role: "superadmin" });
    expect(res.status).toBe(400);
  });
});

describe("POST /zod vs POST /zod-aot consistency", () => {
  const cases = [
    { label: "valid user", body: validUser, expectedStatus: 200 },
    { label: "empty body", body: {}, expectedStatus: 400 },
    { label: "missing email", body: { name: "Bob", age: 25, role: "viewer" }, expectedStatus: 400 },
    { label: "extra fields", body: { ...validUser, extra: "field" }, expectedStatus: 200 },
  ];

  for (const { label, body, expectedStatus } of cases) {
    it(`both return ${expectedStatus} for: ${label}`, async () => {
      const [zodRes, aotRes] = await Promise.all([post("/zod", body), post("/zod-aot", body)]);
      expect(zodRes.status).toBe(expectedStatus);
      expect(aotRes.status).toBe(expectedStatus);
    });
  }
});
