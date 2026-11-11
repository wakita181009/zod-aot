import type * as Schemas from "./schemas";

type Validators = Pick<typeof Schemas, "validateAddress" | "validateNotification" | "validateUser">;

// biome-ignore lint/suspicious/noConsole: sample app output
const log = console.log;

function check(label: string, actual: boolean, expected: boolean): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected success=${expected}, got ${actual}`);
  }
  log(`  ok  ${label}`);
}

export function runChecks(name: string, v: Validators): void {
  log(`\n--- ${name} ---`);
  check(
    "User: valid",
    v.validateUser.safeParse({
      name: "Alice",
      email: "alice@example.com",
      age: 30,
      role: "admin",
      isActive: true,
    }).success,
    true,
  );
  check(
    "User: invalid email",
    v.validateUser.safeParse({
      name: "Bob",
      email: "not-an-email",
      age: 25,
      role: "viewer",
      isActive: false,
    }).success,
    false,
  );
  check(
    "Address: valid zip",
    v.validateAddress.safeParse({ street: "1-2-3 Shibuya", city: "Tokyo", zip: "150-0002" })
      .success,
    true,
  );
  check(
    "Address: invalid zip",
    v.validateAddress.safeParse({ street: "4-5-6 Umeda", city: "Osaka", zip: "ABC-DEFG" }).success,
    false,
  );
  check(
    "Notification: email",
    v.validateNotification.safeParse({ type: "email", to: "user@example.com", subject: "Hello" })
      .success,
    true,
  );
  check(
    "Notification: invalid type",
    v.validateNotification.safeParse({ type: "fax", number: "03-0000" }).success,
    false,
  );
  log("All checks passed.");
}
