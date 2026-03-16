import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WatchDeps } from "#src/cli/commands/watch.js";
import { debounce, isWatchTarget, resolveWatchDirs, runWatch } from "#src/cli/commands/watch.js";
import { resolveOutputPath } from "#src/cli/emitter.js";

const fixturesDir = path.resolve(import.meta.dirname, "../../fixtures");
const outputFiles: string[] = [];

afterEach(async () => {
  for (const f of outputFiles) {
    await fs.promises.unlink(f).catch(() => undefined);
  }
  outputFiles.length = 0;
});

describe("isWatchTarget", () => {
  it("accepts .ts files", () => {
    expect(isWatchTarget("src/schemas.ts")).toBe(true);
  });

  it("accepts .mts files", () => {
    expect(isWatchTarget("src/schemas.mts")).toBe(true);
  });

  it("accepts .js files", () => {
    expect(isWatchTarget("src/schemas.js")).toBe(true);
  });

  it("accepts .mjs files", () => {
    expect(isWatchTarget("src/schemas.mjs")).toBe(true);
  });

  it("rejects .compiled.ts files", () => {
    expect(isWatchTarget("src/schemas.compiled.ts")).toBe(false);
  });

  it("rejects .compiled.js files", () => {
    expect(isWatchTarget("src/schemas.compiled.js")).toBe(false);
  });

  it("rejects .test.ts files", () => {
    expect(isWatchTarget("src/schemas.test.ts")).toBe(false);
  });

  it("rejects .test.js files", () => {
    expect(isWatchTarget("src/schemas.test.js")).toBe(false);
  });

  it("rejects .d.ts files", () => {
    expect(isWatchTarget("src/schemas.d.ts")).toBe(false);
  });

  it("rejects node_modules paths", () => {
    expect(isWatchTarget("node_modules/zod/index.ts")).toBe(false);
  });

  it("accepts paths with 'node_modules' as substring in directory name", () => {
    expect(isWatchTarget("/home/user/node_modules_backup/schema.ts")).toBe(true);
  });

  it("rejects nested node_modules paths", () => {
    expect(isWatchTarget("/project/node_modules/@scope/pkg/index.ts")).toBe(false);
  });

  it("rejects non-script files", () => {
    expect(isWatchTarget("src/styles.css")).toBe(false);
    expect(isWatchTarget("README.md")).toBe(false);
    expect(isWatchTarget("package.json")).toBe(false);
  });
});

describe("resolveWatchDirs", () => {
  const testsDir = path.resolve(import.meta.dirname, "../..");
  const cliDir = path.join(testsDir, "cli");
  const coreDir = path.join(testsDir, "core");

  it("resolves file inputs to parent directories", () => {
    const result = resolveWatchDirs([path.join(cliDir, "emitter.test.ts")]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(cliDir);
  });

  it("deduplicates subdirectories", () => {
    const result = resolveWatchDirs([testsDir, cliDir]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(testsDir);
  });

  it("keeps sibling directories", () => {
    const result = resolveWatchDirs([cliDir, coreDir]);
    expect(result).toHaveLength(2);
  });

  it("deduplicates identical directories", () => {
    const result = resolveWatchDirs([
      path.join(cliDir, "emitter.test.ts"),
      path.join(cliDir, "commands/watch.test.ts"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(cliDir);
  });

  it("falls back to parent dir for non-existent paths", () => {
    const result = resolveWatchDirs(["/nonexistent/dir/file.ts"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("/nonexistent/dir");
  });
});

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays execution", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("coalesces rapid calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets timer on each call", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(80);
    expect(fn).not.toHaveBeenCalled();

    debounced();
    vi.advanceTimersByTime(80);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("runWatch", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let mockLogger: {
    info: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    dim: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const loggerMod = await import("#src/cli/logger.js");
    mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      dim: vi.fn(),
    };
    logSpy = vi.spyOn(loggerMod, "logger", "get").mockReturnValue(mockLogger);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function createMockDeps(): {
    deps: WatchDeps;
    callbacks: Array<(event: string, filename: string | null) => void>;
  } {
    const callbacks: Array<(event: string, filename: string | null) => void> = [];
    const deps: WatchDeps = {
      createWatcher: (_dir, _opts, cb) => {
        callbacks.push(cb);
        return { close: vi.fn() } as unknown as fs.FSWatcher;
      },
    };
    return { deps, callbacks };
  }

  it("performs initial generation and starts watching", async () => {
    const { deps } = createMockDeps();
    const filePath = path.join(fixturesDir, "simple-schema.ts");
    outputFiles.push(resolveOutputPath(filePath, undefined));

    const watchPromise = runWatch({ inputs: [filePath], output: undefined }, deps);

    try {
      await vi.waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Watching"));
      });

      expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining("validateUser"));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Generated 1 schema"));
    } finally {
      process.emit("SIGINT", "SIGINT");
      await watchPromise;
    }

    expect(mockLogger.dim).toHaveBeenCalledWith(expect.stringContaining("Stopping"));
  });

  it("exits when input path does not exist", async () => {
    const { deps } = createMockDeps();
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        runWatch({ inputs: ["/nonexistent/path.ts"], output: undefined }, deps),
      ).rejects.toThrow("process.exit");
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      mockExit.mockRestore();
    }
  });

  it("warns when no compile() calls found in files", async () => {
    const { deps } = createMockDeps();
    const filePath = path.join(fixturesDir, "no-compile.ts");

    const watchPromise = runWatch({ inputs: [filePath], output: undefined }, deps);

    try {
      await vi.waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Watching"));
      });

      expect(mockLogger.warn).toHaveBeenCalledWith("No compile() calls found in any source file.");
    } finally {
      process.emit("SIGINT", "SIGINT");
      await watchPromise;
    }
  });

  it("regenerates on watcher callback", async () => {
    const { deps, callbacks } = createMockDeps();
    const filePath = path.join(fixturesDir, "simple-schema.ts");
    outputFiles.push(resolveOutputPath(filePath, undefined));

    const watchPromise = runWatch({ inputs: [filePath], output: undefined }, deps);

    try {
      // Wait for initial generation to complete and watcher to start
      await vi.waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Watching"));
      });
      mockLogger.success.mockClear();

      // Fire watcher callback directly — no real fs.watch event needed
      callbacks[0]?.("change", "simple-schema.ts");

      // Wait for debounced regeneration (150ms debounce + async file processing)
      await vi.waitFor(
        () => {
          expect(mockLogger.success).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );
    } finally {
      process.emit("SIGINT", "SIGINT");
      await watchPromise;
    }
  });
});
