import type { Extractor } from "../types.js";

export const extractEnum: Extractor = (def) => ({
  type: "enum",
  values: Object.values(def.entries),
});
