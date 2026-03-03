import {
  validateAddress,
  validateContact,
  validateEvent,
  validateNotification,
  validateUser,
} from "./schemas.js";

// biome-ignore lint/suspicious/noConsole: sample app output
const log = console.log;

function test(label: string, fn: () => void): void {
  log(`\n--- ${label} ---`);
  try {
    fn();
  } catch (e) {
    log(`  ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// --- User ---

test("User: valid", () => {
  const result = validateUser.safeParse({
    name: "Alice",
    email: "alice@example.com",
    age: 30,
    role: "admin",
    isActive: true,
    tags: ["dev", "lead"],
    nickname: undefined,
    bio: null,
  });
  log(`  success: ${result.success}`);
  if (result.success) log(`  data.name: ${result.data.name}`);
});

test("User: invalid email", () => {
  const result = validateUser.safeParse({
    name: "Bob",
    email: "not-an-email",
    age: 25,
    role: "viewer",
    isActive: false,
    tags: [],
    bio: null,
  });
  log(`  success: ${result.success}`);
  if (!result.success) log(`  issues: ${result.error?.issues.length}`);
});

test("User: is() type guard", () => {
  const data: unknown = {
    name: "Carol",
    email: "carol@example.com",
    age: 28,
    role: "editor",
    isActive: true,
    tags: ["writer"],
    bio: null,
  };
  log(`  is valid: ${validateUser.is(data)}`);
  log(`  is invalid: ${validateUser.is({ name: 123 })}`);
});

// --- Address (regex) ---

test("Address: valid", () => {
  const result = validateAddress.safeParse({
    street: "1-2-3 Shibuya",
    city: "Tokyo",
    zip: "150-0002",
  });
  log(`  success: ${result.success}`);
});

test("Address: invalid zip", () => {
  const result = validateAddress.safeParse({
    street: "4-5-6 Umeda",
    city: "Osaka",
    zip: "ABC-DEFG",
  });
  log(`  success: ${result.success}`);
  if (!result.success) log(`  issues: ${result.error?.issues.length}`);
});

// --- Contact (intersection) ---

test("Contact: valid", () => {
  const result = validateContact.safeParse({ name: "Dave", phone: "090-1234-5678" });
  log(`  success: ${result.success}`);
});

test("Contact: missing phone", () => {
  const result = validateContact.safeParse({ name: "Dave" });
  log(`  success: ${result.success}`);
});

// --- Event (tuple, date, nested object, literal, default) ---

test("Event: valid", () => {
  const result = validateEvent.safeParse({
    title: "Meetup",
    date: new Date("2026-04-01"),
    attendees: ["Room A", 50],
    metadata: { location: "Tokyo", notes: "Bring laptop" },
    status: "scheduled",
  });
  log(`  success: ${result.success}`);
  if (result.success) log(`  data.priority: ${result.data.priority}`);
});

test("Event: wrong literal", () => {
  const result = validateEvent.safeParse({
    title: "Meetup",
    date: new Date(),
    attendees: ["Room A", 50],
    metadata: {},
    status: "cancelled",
  });
  log(`  success: ${result.success}`);
});

// --- Notification (discriminatedUnion) ---

test("Notification: email", () => {
  const result = validateNotification.safeParse({
    type: "email",
    to: "user@example.com",
    subject: "Hello",
  });
  log(`  success: ${result.success}`);
});

test("Notification: sms", () => {
  const result = validateNotification.safeParse({
    type: "sms",
    phone: "090-0000-0000",
    body: "Hi there",
  });
  log(`  success: ${result.success}`);
});

test("Notification: invalid type", () => {
  const result = validateNotification.safeParse({
    type: "fax",
    number: "03-1234-5678",
  });
  log(`  success: ${result.success}`);
});

test("Notification: missing fields", () => {
  const result = validateNotification.safeParse({
    type: "push",
  });
  log(`  success: ${result.success}`);
  if (!result.success) log(`  issues: ${result.error?.issues.length}`);
});

log("\nAll tests completed.");
