import type { FileCheckIR, SchemaIR } from "../../types.js";
import {
  type CheckFallbackReason,
  checkedExtractor,
  mapSizeCheck,
  uncompiledCheckReason,
} from "../checks.js";
import type { ExtractorContext, ZodCheckDef, ZodDef } from "../types.js";

function mapFileCheck(def: ZodCheckDef): FileCheckIR | CheckFallbackReason {
  if (def.check === "mime_type") return { kind: "mime_type", mime: [...def.mime] };
  return mapSizeCheck(def) ?? uncompiledCheckReason(def);
}

function extractFile(_def: ZodDef, _ctx: ExtractorContext, checks: FileCheckIR[]): SchemaIR {
  return { type: "file", ...(checks.length > 0 ? { checks } : {}) };
}

export const fileExtractor = checkedExtractor(mapFileCheck, extractFile);
