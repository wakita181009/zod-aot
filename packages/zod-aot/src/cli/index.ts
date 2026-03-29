#!/usr/bin/env node

import { createRequire } from "node:module";
import process from "node:process";
import type { CheckOptions } from "./commands/check.js";
import type { GenerateOptions as BaseGenerateOptions } from "./commands/generate.js";
import { getErrorMessage } from "./errors.js";
import { logger } from "./logger.js";

const require = createRequire(import.meta.url);
const VERSION: string = (require("../../package.json") as { version: string }).version;

type GenerateOptions = BaseGenerateOptions & { watch: boolean };

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
  zod-aot check <files...> [--json] [--fail-under <pct>] [--no-color]

Commands:
  generate    Generate optimized validation code from compile() calls
  check       Check schemas with tree view, coverage, Fast Path status, and hints

Options:
  -o, --output <path>        Output file or directory
  -w, --watch                Watch for changes and regenerate
  --no-zod-compat            Minimal output without Zod compatibility (smaller bundle)
  --json                     Output diagnosis as JSON (check only)
  --fail-under <pct>         Exit with code 1 if any schema's coverage < pct (check only)
  --no-color                 Disable colored output (check only)
  -h, --help                 Show this help message
  -v, --version              Show version number

Examples:
  zod-aot generate src/schemas.ts
  zod-aot generate src/schemas.ts -o src/schemas.compiled.ts
  zod-aot generate src/ --watch
  zod-aot check src/schemas.ts
  zod-aot check src/schemas.ts --json --fail-under 80
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
    let zodCompat: boolean | undefined;

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
      } else if (arg === "--no-zod-compat") {
        zodCompat = false;
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

    return {
      kind: "generate",
      options: {
        inputs,
        output,
        watch,
        zodCompat,
      },
    };
  }

  if (command === "check") {
    const inputs: string[] = [];
    let json = false;
    let failUnder: number | undefined;
    let noColor = false;

    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i] as string;
      if (arg === "--json") {
        json = true;
      } else if (arg === "--fail-under") {
        i++;
        const val = rest[i];
        if (!val) {
          logger.error("Missing value for --fail-under");
          process.exit(1);
        }
        const num = Number(val);
        if (Number.isNaN(num) || num < 0 || num > 100) {
          logger.error("--fail-under must be a number between 0 and 100");
          process.exit(1);
        }
        failUnder = num;
      } else if (arg === "--no-color") {
        noColor = true;
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

    return { kind: "check", options: { inputs, json, failUnder, noColor } };
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
  logger.error(getErrorMessage(err));
  process.exit(1);
});
