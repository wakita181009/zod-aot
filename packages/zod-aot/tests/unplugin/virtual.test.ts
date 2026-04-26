import { describe, expect, it } from "vitest";
import {
  ALL_HELPER_NAMES,
  loadVirtual,
  RESOLVED_RUNTIME_ID,
  resolveVirtualId,
  VIRTUAL_RUNTIME_ID,
} from "#src/unplugin/virtual.js";

describe("unplugin/virtual", () => {
  describe("resolveVirtualId", () => {
    it("returns the resolved id (\\0-prefixed) for the public virtual id", () => {
      expect(resolveVirtualId(VIRTUAL_RUNTIME_ID)).toBe(RESOLVED_RUNTIME_ID);
    });

    it("returns null for any other id", () => {
      expect(resolveVirtualId("zod")).toBeNull();
      expect(resolveVirtualId("./schemas.ts")).toBeNull();
      expect(resolveVirtualId(RESOLVED_RUNTIME_ID)).toBeNull();
    });
  });

  describe("loadVirtual", () => {
    it("returns ESM source for the resolved id", () => {
      const src = loadVirtual(RESOLVED_RUNTIME_ID);
      expect(src).not.toBeNull();
      expect(src).toContain("export function __mkv");
      expect(src).toContain("export function __fin");
    });

    it("returns null for unrelated ids", () => {
      expect(loadVirtual(VIRTUAL_RUNTIME_ID)).toBeNull();
      expect(loadVirtual("zod")).toBeNull();
    });

    it("exports every issue factory under its `__za*` name", () => {
      const src = loadVirtual(RESOLVED_RUNTIME_ID) ?? "";
      for (const name of ["__zaTS", "__zaTSx", "__zaTB", "__zaTBx", "__zaIT", "__zaIF", "__zaIV"]) {
        expect(src, `missing factory: ${name}`).toContain(`export function ${name}(`);
      }
    });

    it("exports each well-known regex constant", () => {
      const src = loadVirtual(RESOLVED_RUNTIME_ID) ?? "";
      for (const name of ["__zaReEmail", "__zaReUuid", "__zaReCuid2", "__zaReIpv4"]) {
        expect(src, `missing regex export: ${name}`).toMatch(
          new RegExp(`export const ${name}=new RegExp\\(`),
        );
      }
    });
  });

  describe("ALL_HELPER_NAMES", () => {
    it("includes the wrapper, finalizer, every issue factory, and every well-known regex", () => {
      expect(ALL_HELPER_NAMES).toContain("__mkv");
      expect(ALL_HELPER_NAMES).toContain("__fin");
      expect(ALL_HELPER_NAMES).toContain("__zaTS");
      expect(ALL_HELPER_NAMES).toContain("__zaReEmail");
      expect(ALL_HELPER_NAMES).toContain("__zaReUuid");
    });

    it("contains no duplicate names", () => {
      const unique = new Set(ALL_HELPER_NAMES);
      expect(unique.size).toBe(ALL_HELPER_NAMES.length);
    });
  });
});
