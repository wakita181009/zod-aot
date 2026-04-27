/**
 * Well-known regex sources hosted in the virtual module "virtual:zod-aot/runtime".
 *
 * In lean mode (unplugin), `g.regex()` consults this registry and emits a reference
 * like `__zaReEmail` instead of declaring `var __re_email_*=new RegExp(...)`.
 * The bundler then deduplicates the regex literal across all transformed files.
 *
 * Pattern sources are matched verbatim (string equality). Add new entries as Zod
 * exposes additional well-known formats and we want bundle-wide dedup.
 */

/** Zod v4's email regex source (string.ts uses this directly when format === "email"). */
export const EMAIL_REGEX_SOURCE = String.raw`^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$`;

/** Fallback UUID regex used when the extractor doesn't provide a pattern (e.g. in unit tests). */
export const UUID_REGEX_SOURCE =
  "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$";

export interface WellKnownRegex {
  /** Stable virtual-module export name. Always starts with "__zaRe". */
  name: string;
  /** Pattern source string (verbatim match against `g.regex()` 2nd argument). */
  source: string;
}

export const WELL_KNOWN_REGEXES: readonly WellKnownRegex[] = [
  { name: "__zaReEmail", source: EMAIL_REGEX_SOURCE },
  { name: "__zaReUuid", source: UUID_REGEX_SOURCE },
  { name: "__zaReCuid", source: "^[cC][^\\s-]{8,}$" },
  { name: "__zaReCuid2", source: "^[0-9a-z]+$" },
  { name: "__zaReUlid", source: "^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$" },
  { name: "__zaReNanoid", source: "^[a-zA-Z0-9_-]{21}$" },
  { name: "__zaReXid", source: "^[0-9a-vA-V]{20}$" },
  { name: "__zaReKsuid", source: "^[A-Za-z0-9]{27}$" },
  {
    name: "__zaReIpv4",
    source:
      "^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$",
  },
  {
    name: "__zaReIpv6",
    source:
      "^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$",
  },
  {
    name: "__zaReBase64",
    source: "^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$",
  },
  { name: "__zaReBase64Url", source: "^[A-Za-z0-9_-]*$" },
  { name: "__zaReE164", source: "^\\+[1-9]\\d{6,14}$" },
  {
    name: "__zaReGuid",
    source: "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$",
  },
];

const SOURCE_TO_NAME: ReadonlyMap<string, string> = new Map(
  WELL_KNOWN_REGEXES.map((r) => [r.source, r.name]),
);

/**
 * Look up a well-known regex by its pattern source string.
 * Returns the virtual-module export name or null if the pattern is user-defined.
 */
export function lookupWellKnownRegex(source: string): string | null {
  return SOURCE_TO_NAME.get(source) ?? null;
}
