import { z } from "zod";

// Bare primitives
export const SimpleString = z.string();
export const SimpleNumber = z.number();
export const SimpleBoolean = z.boolean();

// Primitives with checks
export const StringWithChecks = z.string().min(3).max(50);
export const NumberWithChecks = z.number().int().positive();

// Enum
export const SimpleEnum = z.enum(["admin", "user", "guest", "moderator"]);

// Valid fixtures
export const validSimpleString = "hello world";
export const validStringWithChecks = "hello";
export const validSimpleNumber = 42;
export const validNumberWithChecks = 42;
export const validSimpleBoolean = true;
export const validSimpleEnum = "admin" as const;
