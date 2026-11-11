import { validateAddress, validateNotification, validateUser } from "./schemas.js";

// biome-ignore lint/suspicious/noConsole: sample app output
const log = console.log;

// Reproduce issue #143: require of JSON file should still work
const translations = require("./translations/api.json");
log(`translations loaded: ${JSON.stringify(translations)?.slice(0, 40)}`);

let failures = 0;

function test(label: string, expectedSuccess: boolean, fn: () => boolean): void {
  log(`\n--- ${label} ---`);
  try {
    const success = fn();
    if (success !== expectedSuccess) {
      failures++;
      log(`  FAIL: expected success=${expectedSuccess}, got ${success}`);
    }
  } catch (e) {
    failures++;
    log(`  ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }
}

test("User: valid", true, () => {
  const result = validateUser.safeParse({
    name: "Alice",
    email: "alice@example.com",
    age: 30,
    role: "admin",
    isActive: true,
  });
  log(`  success: ${result.success}`);
  if (result.success) log(`  data.name: ${result.data.name}`);
  return result.success;
});

test("User: invalid email", false, () => {
  const result = validateUser.safeParse({
    name: "Bob",
    email: "not-an-email",
    age: 25,
    role: "viewer",
    isActive: false,
  });
  log(`  success: ${result.success}`);
  if (!result.success) log(`  issues: ${result.error?.issues.length}`);
  return result.success;
});

test("Address: valid zip", true, () => {
  const result = validateAddress.safeParse({
    street: "1-2-3 Shibuya",
    city: "Tokyo",
    zip: "150-0002",
  });
  log(`  success: ${result.success}`);
  return result.success;
});

test("Address: invalid zip", false, () => {
  const result = validateAddress.safeParse({
    street: "4-5-6 Umeda",
    city: "Osaka",
    zip: "ABC-DEFG",
  });
  log(`  success: ${result.success}`);
  if (!result.success) log(`  issues: ${result.error?.issues.length}`);
  return result.success;
});

test("Notification: email", true, () => {
  const result = validateNotification.safeParse({
    type: "email",
    to: "user@example.com",
    subject: "Hello",
  });
  log(`  success: ${result.success}`);
  return result.success;
});

test("Notification: invalid type", false, () => {
  const result = validateNotification.safeParse({ type: "fax", number: "03-0000" });
  log(`  success: ${result.success}`);
  if (!result.success) log(`  issues: ${result.error?.issues.length}`);
  return result.success;
});

if (failures > 0) {
  log(`\n${failures} test(s) failed.`);
  process.exit(1);
}
log("\nAll tests completed.");
