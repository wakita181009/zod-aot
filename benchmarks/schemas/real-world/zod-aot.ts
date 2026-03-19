import { compile } from "zod-aot";
import { EventLogSchema, FallbackArraySchema, PartialFallbackObjectSchema } from "./zod.js";

export const aotEventLog = compile(EventLogSchema);
export const aotPartialFallback = compile(PartialFallbackObjectSchema);
export const aotFallbackArray = compile(FallbackArraySchema);
