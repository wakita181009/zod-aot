import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { appRouter } from "./router.js";

const server = createHTTPServer({
  router: appRouter,
});

const port = 3001;
server.listen(port);
// biome-ignore lint/suspicious/noConsole: app startup log
console.log(`tRPC server running on http://localhost:${port}`);
