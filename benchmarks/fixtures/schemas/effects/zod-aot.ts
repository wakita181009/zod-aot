import { compile } from "zod-aot";
import {
  CapturedRefineSchema,
  CapturedTransformObjectSchema,
  CapturedTransformSchema,
  ZeroCaptureRefineObjectSchema,
  ZeroCaptureRefineStringSchema,
  ZeroCaptureTransformObjectSchema,
  ZeroCaptureTransformStringSchema,
} from "./zod.js";

export const aotZeroCaptureTransformString = compile(ZeroCaptureTransformStringSchema);
export const aotZeroCaptureTransformObject = compile(ZeroCaptureTransformObjectSchema);
export const aotZeroCaptureRefineString = compile(ZeroCaptureRefineStringSchema);
export const aotZeroCaptureRefineObject = compile(ZeroCaptureRefineObjectSchema);
export const aotCapturedTransform = compile(CapturedTransformSchema);
export const aotCapturedTransformObject = compile(CapturedTransformObjectSchema);
export const aotCapturedRefine = compile(CapturedRefineSchema);
