import { performance } from "node:perf_hooks";

export function benchmark(name: string, fn: () => void, iterations = 100_000): void {
  // Warmup
  for (let i = 0; i < 1_000; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;

  const opsPerSec = Math.round((iterations / elapsed) * 1_000);
  // biome-ignore lint/suspicious/noConsole: benchmark output
  console.log(`  ${name}: ${opsPerSec.toLocaleString()} ops/sec (${elapsed.toFixed(2)}ms)`);
}
