import { compile } from "zod-aot";
import { ApiResponseSchema, UserSchema } from "./zod.js";

export const aotUser = compile(UserSchema);
export const aotApiResponse = compile(ApiResponseSchema);
