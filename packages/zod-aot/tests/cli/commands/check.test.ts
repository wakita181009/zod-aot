import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { hasFallback } from "#src/cli/fallback.js";
import { extractSchema } from "#src/core/extract/index.js";
import { discoverSchemas } from "#src/discovery.js";

const fixturesDir = path.resolve(import.meta.dirname, "../../fixtures");

describe("check (schema compilability)", () => {
  it("simple schema is fully compilable", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "simple-schema.ts"));

    for (const s of schemas) {
      const ir = extractSchema(s.schema);
      expect(hasFallback(ir)).toBeNull();
    }
  });

  it("multi schema is fully compilable", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "multi-schema.ts"));
    expect(schemas.length).toBe(2);

    for (const s of schemas) {
      const ir = extractSchema(s.schema);
      expect(hasFallback(ir)).toBeNull();
    }
  });

  it("transform schema has fallback", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "with-fallback.ts"));
    expect(schemas.length).toBe(1);

    for (const s of schemas) {
      const ir = extractSchema(s.schema);
      const reason = hasFallback(ir);
      expect(reason).not.toBeNull();
      expect(reason).toContain("transform");
    }
  });

  it("no-compile file has no schemas", async () => {
    const schemas = await discoverSchemas(path.join(fixturesDir, "no-compile.ts"));
    expect(schemas.length).toBe(0);
  });
});

describe("runCheck", () => {
  it("exits with error for non-existent file", async () => {
    const { runCheck } = await import("#src/cli/commands/check.js");
    const logSpy = vi.spyOn(await import("#src/cli/logger.js"), "logger", "get");
    const mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      dim: vi.fn(),
    };
    logSpy.mockReturnValue(mockLogger);

    const exitError = new Error("process.exit");
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw exitError;
    });

    try {
      await expect(runCheck({ inputs: ["/nonexistent/file.ts"] })).rejects.toThrow("process.exit");
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("File not found"));
    } finally {
      mockExit.mockRestore();
      logSpy.mockRestore();
    }
  });

  it("exits with error for directory input", async () => {
    const { runCheck } = await import("#src/cli/commands/check.js");
    const logSpy = vi.spyOn(await import("#src/cli/logger.js"), "logger", "get");
    const mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      dim: vi.fn(),
    };
    logSpy.mockReturnValue(mockLogger);

    const exitError = new Error("process.exit");
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw exitError;
    });

    try {
      await expect(runCheck({ inputs: [fixturesDir] })).rejects.toThrow("process.exit");
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("check command expects file paths, not directories"),
      );
    } finally {
      mockExit.mockRestore();
      logSpy.mockRestore();
    }
  });

  it("succeeds for compilable schema", async () => {
    const { runCheck } = await import("#src/cli/commands/check.js");
    const logSpy = vi.spyOn(await import("#src/cli/logger.js"), "logger", "get");
    const mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      dim: vi.fn(),
    };
    logSpy.mockReturnValue(mockLogger);

    try {
      await runCheck({ inputs: [path.join(fixturesDir, "simple-schema.ts")] });
      expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining("compilable"));
    } finally {
      logSpy.mockRestore();
    }
  });

  it("warns about partial fallback schemas", async () => {
    const { runCheck } = await import("#src/cli/commands/check.js");
    const logSpy = vi.spyOn(await import("#src/cli/logger.js"), "logger", "get");
    const mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      dim: vi.fn(),
    };
    logSpy.mockReturnValue(mockLogger);

    const exitError = new Error("process.exit");
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw exitError;
    });

    try {
      await expect(
        runCheck({ inputs: [path.join(fixturesDir, "with-fallback.ts")] }),
      ).rejects.toThrow("process.exit");
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("partial"));
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("fallback"));
    } finally {
      mockExit.mockRestore();
      logSpy.mockRestore();
    }
  });

  it("warns and exits when no compile() calls found", async () => {
    const { runCheck } = await import("#src/cli/commands/check.js");
    const logSpy = vi.spyOn(await import("#src/cli/logger.js"), "logger", "get");
    const mockLogger = {
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      dim: vi.fn(),
    };
    logSpy.mockReturnValue(mockLogger);

    const exitError = new Error("process.exit");
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw exitError;
    });

    try {
      await expect(runCheck({ inputs: [path.join(fixturesDir, "no-compile.ts")] })).rejects.toThrow(
        "process.exit",
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("no compile() calls"));
    } finally {
      mockExit.mockRestore();
      logSpy.mockRestore();
    }
  });
});
