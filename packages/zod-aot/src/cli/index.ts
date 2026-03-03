#!/usr/bin/env node

import { createRequire } from "node:module";
import process from "node:process";
import { logger } from "./logger.js";

const require = createRequire(import.meta.url);
const VERSION: string = (require("../../package.json") as { version: string }).version;

interface GenerateOptions {
  inputs: string[];
  output: string | undefined;
  watch: boolean;
}

interface CheckOptions {
  inputs: string[];
}

type Command =
  | { kind: "generate"; options: GenerateOptions }
  | { kind: "check"; options: CheckOptions }
  | { kind: "help" }
  | { kind: "version" };

function printUsage(): void {
  // biome-ignore lint/suspicious/noConsole: CLI output
  console.log(
    `
zod-aot v${VERSION} — Compile Zod schemas into zero-overhead validation functions

Usage:
  zod-aot generate <files...> [-o <output>] [-w]
  zod-aot check <files...>

Commands:
  generate    Generate optimized validation code from compile() calls
  check       Check if schemas are compilable (dry-run)

Options:
  -o, --output <path>   Output file or directory
  -w, --watch           Watch for changes and regenerate
  -h, --help            Show this help message
  -v, --version         Show version number

Examples:
  zod-aot generate src/schemas.ts
  zod-aot generate src/schemas.ts -o src/schemas.compiled.ts
  zod-aot generate src/ --watch
  zod-aot check src/schemas.ts
`.trim(),
  );
}

function parseArgs(argv: string[]): Command {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return { kind: "help" };
  }

  if (args.includes("--version") || args.includes("-v")) {
    return { kind: "version" };
  }

  const command = args[0];
  const rest = args.slice(1);

  if (command === "generate") {
    const inputs: string[] = [];
    let output: string | undefined;
    let watch = false;

    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i] as string;
      if (arg === "-o" || arg === "--output") {
        i++;
        const val = rest[i];
        if (!val) {
          logger.error("Missing value for --output");
          process.exit(1);
        }
        output = val;
      } else if (arg === "-w" || arg === "--watch") {
        watch = true;
      } else if (arg.startsWith("-")) {
        logger.error(`Unknown option: ${arg}`);
        process.exit(1);
      } else {
        inputs.push(arg);
      }
    }

    if (inputs.length === 0) {
      logger.error("No input files specified. Run 'zod-aot --help' for usage.");
      process.exit(1);
    }

    return { kind: "generate", options: { inputs, output, watch } };
  }

  if (command === "check") {
    const inputs = rest.filter((arg) => {
      if (arg.startsWith("-")) {
        logger.error(`Unknown option: ${arg}`);
        process.exit(1);
      }
      return true;
    });

    if (inputs.length === 0) {
      logger.error("No input files specified. Run 'zod-aot --help' for usage.");
      process.exit(1);
    }

    return { kind: "check", options: { inputs } };
  }

  logger.error(`Unknown command: ${command}. Run 'zod-aot --help' for usage.`);
  process.exit(1);
}

async function main(): Promise<void> {
  const command = parseArgs(process.argv);

  switch (command.kind) {
    case "help":
      printUsage();
      break;
    case "version":
      // biome-ignore lint/suspicious/noConsole: CLI output
      console.log(VERSION);
      break;
    case "generate": {
      if (command.options.watch) {
        const { runWatch } = await import("./commands/watch.js");
        await runWatch(command.options);
      } else {
        const { runGenerate } = await import("./commands/generate.js");
        await runGenerate(command.options);
      }
      break;
    }
    case "check": {
      const { runCheck } = await import("./commands/check.js");
      await runCheck(command.options);
      break;
    }
  }
}

void main().catch((err: unknown) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
