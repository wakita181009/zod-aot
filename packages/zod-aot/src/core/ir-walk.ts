import type { SchemaIR } from "./types.js";

/** Direct child schemas of `ir`, each with its diagnostic path under `parentPath`. */
export function* iterChildren(ir: SchemaIR, parentPath: string): Generator<[string, SchemaIR]> {
  switch (ir.type) {
    case "object":
      for (const [key, child] of Object.entries(ir.properties)) {
        yield [`${parentPath}.${key}`, child];
      }
      if (ir.catchall) yield [`${parentPath}[catchall]`, ir.catchall];
      break;
    case "array":
      yield [`${parentPath}[]`, ir.element];
      break;
    case "tuple":
      for (const [i, item] of ir.items.entries()) {
        yield [`${parentPath}[${i}]`, item];
      }
      if (ir.rest) yield [`${parentPath}[...rest]`, ir.rest];
      break;
    case "record":
      yield [`${parentPath}[key]`, ir.keyType];
      yield [`${parentPath}[value]`, ir.valueType];
      break;
    case "set":
      yield [`${parentPath}[element]`, ir.valueType];
      break;
    case "map":
      yield [`${parentPath}[key]`, ir.keyType];
      yield [`${parentPath}[value]`, ir.valueType];
      break;
    case "union":
    case "discriminatedUnion":
      for (const [i, opt] of ir.options.entries()) {
        yield [`${parentPath}[${i}]`, opt];
      }
      break;
    case "intersection":
      yield [`${parentPath}[left]`, ir.left];
      yield [`${parentPath}[right]`, ir.right];
      break;
    case "optional":
    case "nullable":
    case "readonly":
      yield [parentPath, ir.inner];
      break;
    case "default":
    case "catch":
      yield [parentPath, ir.inner];
      break;
    case "pipe":
      yield [`${parentPath}[in]`, ir.in];
      yield [`${parentPath}[out]`, ir.out];
      break;
    case "effect":
      yield [`${parentPath}[inner]`, ir.inner];
      break;
  }
}

/**
 * Whether `pred` holds for `ir` or any schema nested in it. A recursive
 * reference has no children here, so predicates decide it themselves.
 */
export function someNode(ir: SchemaIR, pred: (node: SchemaIR) => boolean): boolean {
  if (pred(ir)) return true;
  for (const [, child] of iterChildren(ir, "")) {
    if (someNode(child, pred)) return true;
  }
  return false;
}
