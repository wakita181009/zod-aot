import { runChecks } from "./checks";
import * as schemas from "./schemas.compiled";

runChecks("webpack + zod-aot generate (CLI output)", schemas);
