import type { SchemaIR } from "#src/core/types.js";

/**
 * Recursively check if a SchemaIR contains a fallback node.
 * Returns the fallback reason string if found, or null if fully compilable.
 */
export function hasFallback(ir: SchemaIR): string | null {
  if (ir.type === "fallback") {
    return ir.reason;
  }
  if (ir.type === "object") {
    for (const [key, prop] of Object.entries(ir.properties)) {
      const reason = hasFallback(prop);
      if (reason) return `${reason} at .${key}`;
    }
  }
  if (ir.type === "array") {
    return hasFallback(ir.element);
  }
  if (ir.type === "optional" || ir.type === "nullable" || ir.type === "readonly") {
    return hasFallback(ir.inner);
  }
  if (ir.type === "default" || ir.type === "catch") {
    return hasFallback(ir.inner);
  }
  if (ir.type === "templateLiteral") {
    return null;
  }
  if (ir.type === "union" || ir.type === "discriminatedUnion") {
    for (const opt of ir.options) {
      const reason = hasFallback(opt);
      if (reason) return reason;
    }
  }
  if (ir.type === "tuple") {
    for (const item of ir.items) {
      const reason = hasFallback(item);
      if (reason) return reason;
    }
    if (ir.rest) return hasFallback(ir.rest);
  }
  if (ir.type === "record") {
    return hasFallback(ir.keyType) ?? hasFallback(ir.valueType);
  }
  if (ir.type === "intersection") {
    return hasFallback(ir.left) ?? hasFallback(ir.right);
  }
  return null;
}
