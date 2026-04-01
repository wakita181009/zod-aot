import { app } from "./app.js";

const port = 3000;
// biome-ignore lint/suspicious/noConsole: app startup log
console.log(`Server running on http://localhost:${port}`);
Bun.serve({ fetch: app.fetch, port });
