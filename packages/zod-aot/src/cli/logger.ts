import process from "node:process";

const isTTY = process.stdout.isTTY === true;

const colors = {
  reset: isTTY ? "\x1b[0m" : "",
  red: isTTY ? "\x1b[31m" : "",
  green: isTTY ? "\x1b[32m" : "",
  yellow: isTTY ? "\x1b[33m" : "",
  cyan: isTTY ? "\x1b[36m" : "",
  dim: isTTY ? "\x1b[2m" : "",
  bold: isTTY ? "\x1b[1m" : "",
};

// biome-ignore lint/suspicious/noConsole: CLI output
const log = console.log;
// biome-ignore lint/suspicious/noConsole: CLI output
const logError = console.error;

export const logger = {
  info(msg: string): void {
    log(`${colors.cyan}info${colors.reset} ${msg}`);
  },
  success(msg: string): void {
    log(`${colors.green}done${colors.reset} ${msg}`);
  },
  warn(msg: string): void {
    logError(`${colors.yellow}warn${colors.reset} ${msg}`);
  },
  error(msg: string): void {
    logError(`${colors.red}error${colors.reset} ${msg}`);
  },
  dim(msg: string): void {
    log(`${colors.dim}${msg}${colors.reset}`);
  },
};
