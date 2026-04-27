/**
 * Virtual module "virtual:zod-aot/runtime".
 *
 * Hosts shared helpers and well-known regexes so that lean-mode generated code
 * (emitted by the unplugin transform) can `import { __mkv, __zaTS, __zaReEmail }`
 * instead of inlining these declarations per IIFE.
 *
 * Bundlers tree-shake unused exports during minification, so the virtual module
 * never bloats the final bundle with helpers that no schema actually references.
 *
 * The virtual module is rebuilt on each plugin instantiation but its content is
 * static (no per-build state), so caching the source string is safe.
 */

import {
  ISSUE_DECLS,
  ZA_IF_DECL,
  ZA_IT_DECL,
  ZA_IV_DECL,
  ZA_TB_DECL,
  ZA_TB_EXACT_DECL,
  ZA_TS_DECL,
  ZA_TS_EXACT_DECL,
} from "#src/core/codegen/issue-decls.js";
import { WELL_KNOWN_REGEXES } from "#src/core/codegen/well-known-regex.js";
import {
  FIN_DECL,
  MK_VALIDATOR_DECL,
  ZOD_CONFIG_IMPORT,
  ZOD_MSG_DECLARATION,
} from "#src/core/iife.js";

export const VIRTUAL_RUNTIME_ID = "virtual:zod-aot/runtime";
/** Resolved id (Rollup convention: leading null byte hides the module from other plugins). */
export const RESOLVED_RUNTIME_ID = "\0virtual:zod-aot/runtime";

function buildRuntimeSource(): string {
  const parts: string[] = [
    ZOD_CONFIG_IMPORT,
    ZOD_MSG_DECLARATION,
    `export ${MK_VALIDATOR_DECL}`,
    `export ${FIN_DECL}`,
    `export ${ZA_TS_DECL}`,
    `export ${ZA_TS_EXACT_DECL}`,
    `export ${ZA_TB_DECL}`,
    `export ${ZA_TB_EXACT_DECL}`,
    `export ${ZA_IT_DECL}`,
    `export ${ZA_IF_DECL}`,
    `export ${ZA_IV_DECL}`,
  ];
  for (const r of WELL_KNOWN_REGEXES) {
    parts.push(`export const ${r.name}=new RegExp(${JSON.stringify(r.source)});`);
  }
  return parts.join("\n");
}

const RUNTIME_SOURCE = buildRuntimeSource();

export function resolveVirtualId(id: string): string | null {
  if (id === VIRTUAL_RUNTIME_ID) return RESOLVED_RUNTIME_ID;
  return null;
}

export function loadVirtual(id: string): string | null {
  if (id === RESOLVED_RUNTIME_ID) return RUNTIME_SOURCE;
  return null;
}

/** Names of all helpers exported by the virtual module. */
export const ALL_HELPER_NAMES: readonly string[] = [
  "__mkv",
  "__fin",
  ...Object.keys(ISSUE_DECLS),
  ...WELL_KNOWN_REGEXES.map((r) => r.name),
];
