import type { IntersectionIR, ObjectIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";
import { fastObjectChecks, fastUnknownKeyGuard } from "./object.js";

export function slowIntersection(ir: SchemaIR & { type: "intersection" }, g: SlowGen): string {
  if (ir.left.type !== "object" || ir.right.type !== "object") {
    // The extractor admits other pairs only when neither side rewrites the value.
    return `${g.visit(ir.left)}${g.visit(ir.right, { input: g.output, output: g.output })}`;
  }
  // Each side builds its own output from the original input, as in Zod; the
  // extractor guarantees shared keys come out identical, so a shallow merge
  // equals Zod's mergeValues.
  const left = g.temp("il");
  const right = g.temp("ir");
  return (
    `var ${left}=${g.input},${right}=${g.input};` +
    g.visit(ir.left, { input: left, output: left }) +
    g.visit(ir.right, { input: right, output: right }) +
    `if(${left}!==${g.input}&&${right}!==${g.input})${g.output}=Object.assign({},${left},${right});`
  );
}

export function fastIntersection(ir: IntersectionIR, g: FastGen): string | null {
  if (ir.left.type === "object" && ir.right.type === "object") {
    return fastObjectIntersection(ir.left, ir.right, g);
  }
  const left = g.visit(ir.left);
  if (left === null) return null;
  const right = g.visit(ir.right);
  if (right === null) return null;
  return left === "true" ? right : right === "true" ? left : `${left}&&${right}`;
}

/**
 * Each side alone would reject the other side's keys as unknown, so the guard
 * covers the union of both shapes. The merged output keeps every input key
 * once either side is loose.
 */
function fastObjectIntersection(left: ObjectIR, right: ObjectIR, g: FastGen): string | null {
  // A side's refine sees only its own stripped output in Zod, not the input.
  if (left.checks || right.checks) return null;
  const leftParts = fastObjectChecks(left, g);
  if (leftParts === null) return null;
  const rightParts = fastObjectChecks(right, g);
  if (rightParts === null) return null;

  const keys = [...new Set([...Object.keys(left.properties), ...Object.keys(right.properties)])];
  const catchall: SchemaIR | undefined =
    left.catchall === undefined && right.catchall === undefined ? undefined : { type: "unknown" };
  const guard = fastUnknownKeyGuard(keys, catchall, g);
  if (guard === null) return null;
  return [...leftParts, ...rightParts, guard].join("&&");
}
