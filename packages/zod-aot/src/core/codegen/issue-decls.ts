/**
 * Issue factory function bodies (statement form).
 *
 * These functions produce the same `{code, ...}` shapes that lean-mode
 * generated code would otherwise inline at every check site.
 * Hosted in "virtual:zod-aot/runtime" and called as `__zaTS(...)` etc.
 *
 * Argument convention (positional, kept short to minimize call-site bytes):
 *   __zaTS(minimum, origin, inclusive, input, path)        — too_small
 *   __zaTB(maximum, origin, inclusive, input, path)        — too_big
 *   __zaIT(expected, input, path)                          — invalid_type
 *   __zaIF(format, input, path, extra?)                    — invalid_format (extra merged into result)
 *   __zaIV(values, input, path)                            — invalid_value
 */

export const ZA_TS_DECL =
  'function __zaTS(m,o,i,inp,p){return{code:"too_small",minimum:m,origin:o,inclusive:i,input:inp,path:p};}';

export const ZA_TS_EXACT_DECL =
  'function __zaTSx(m,o,inp,p){return{code:"too_small",minimum:m,origin:o,inclusive:true,exact:true,input:inp,path:p};}';

export const ZA_TB_DECL =
  'function __zaTB(m,o,i,inp,p){return{code:"too_big",maximum:m,origin:o,inclusive:i,input:inp,path:p};}';

export const ZA_TB_EXACT_DECL =
  'function __zaTBx(m,o,inp,p){return{code:"too_big",maximum:m,origin:o,inclusive:true,exact:true,input:inp,path:p};}';

export const ZA_IT_DECL =
  'function __zaIT(e,inp,p){return{code:"invalid_type",expected:e,input:inp,path:p};}';

export const ZA_IF_DECL =
  'function __zaIF(f,inp,p,extra){var r={code:"invalid_format",format:f,input:inp,path:p};if(extra)Object.assign(r,extra);return r;}';

export const ZA_IV_DECL =
  'function __zaIV(values,inp,p){return{code:"invalid_value",values:values,input:inp,path:p};}';

/** All issue factory declarations indexed by helper name. */
export const ISSUE_DECLS: Readonly<Record<string, string>> = {
  __zaTS: ZA_TS_DECL,
  __zaTSx: ZA_TS_EXACT_DECL,
  __zaTB: ZA_TB_DECL,
  __zaTBx: ZA_TB_EXACT_DECL,
  __zaIT: ZA_IT_DECL,
  __zaIF: ZA_IF_DECL,
  __zaIV: ZA_IV_DECL,
};

/** Helper names emitted by the issue factory call helpers in lean mode. */
export const ISSUE_HELPER_NAMES: readonly string[] = Object.keys(ISSUE_DECLS);
