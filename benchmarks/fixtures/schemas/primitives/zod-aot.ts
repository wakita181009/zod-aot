import { compile } from "zod-aot";
import {
  BigIntSchema,
  NumberWithChecks,
  SimpleEnum,
  SimpleString,
  StringWithChecks,
} from "./zod.js";

export const aotSimpleString = compile(SimpleString);
export const aotStringChecks = compile(StringWithChecks);
export const aotNumberChecks = compile(NumberWithChecks);
export const aotEnum = compile(SimpleEnum);
export const aotBigInt = compile(BigIntSchema);
