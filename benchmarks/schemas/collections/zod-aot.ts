import { compile } from "zod-aot";
import { MapSchema, PipeSchema, RecordSchema, SetSchema, TupleSchema } from "./zod.js";

export const aotTuple = compile(TupleSchema);
export const aotRecord = compile(RecordSchema);
export const aotSet = compile(SetSchema);
export const aotMap = compile(MapSchema);
export const aotPipe = compile(PipeSchema);
