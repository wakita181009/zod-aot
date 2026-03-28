import path from "node:path";
import process from "node:process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { hasFallback } from "#src/cli/fallback.js";
import { extractSchema } from "#src/core/extract/index.js";
import { discoverSchemas } from "#src/discovery.js";

// Mock discoverSchemas: delegates to real implementation by default,
// can be overridden per-test with mockResolvedValueOnce.
vi.mock("#src/discovery.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("#src/discovery.js")>();
  return {
    ...original,
    discoverSchemas: vi.fn().mockImplementation(original.discoverSchemas),
  };
});

const mockDiscoverSchemas = vi.mocked(discoverSchemas);
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
      expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining("compiled"));
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
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("compiled"));
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

// ─── countNodes branch coverage via runCheck with mocked discoverSchemas ─────

describe("runCheck — countNodes coverage", () => {
  // Use a real file path so fs.promises.stat succeeds
  const existingFilePath = path.join(fixturesDir, "simple-schema.ts");
  // Cache the real implementation once — vi.importActual is module-cached so
  // the promise resolves immediately after first load.
  const realModule = vi.importActual<typeof import("#src/discovery.js")>("#src/discovery.js");

  beforeEach(async () => {
    const { discoverSchemas: real } = await realModule;
    // mockImplementation resets the once-queue AND restores the default delegate
    mockDiscoverSchemas.mockImplementation(real);
  });

  /** Run runCheck with a mocked schema and assert it completes without process.exit. */
  async function runWithSchema(schema: z.ZodType, exportName = "testSchema") {
    mockDiscoverSchemas.mockResolvedValueOnce([{ exportName, schema }]);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    try {
      const { runCheck } = await import("#src/cli/commands/check.js");
      await runCheck({ inputs: [existingFilePath] });
      expect(exitSpy).not.toHaveBeenCalled();
    } finally {
      exitSpy.mockRestore();
    }
  }

  /** Run runCheck with a mocked schema and assert it calls process.exit(1). */
  async function runWithSchemaExpectExit(schema: z.ZodType, exportName = "testSchema") {
    mockDiscoverSchemas.mockResolvedValueOnce([{ exportName, schema }]);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    try {
      const { runCheck } = await import("#src/cli/commands/check.js");
      await expect(runCheck({ inputs: [existingFilePath] })).rejects.toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  }

  // ── Compilable IR types (all branches in countNodes) ──

  it("traverses array schema", async () => {
    await runWithSchema(z.array(z.string()));
  });

  it("traverses optional schema", async () => {
    await runWithSchema(z.string().optional());
  });

  it("traverses nullable schema", async () => {
    await runWithSchema(z.string().nullable());
  });

  it("traverses readonly schema", async () => {
    await runWithSchema(z.readonly(z.string()));
  });

  it("traverses default schema", async () => {
    await runWithSchema(z.string().default("x"));
  });

  it("traverses catch schema", async () => {
    await runWithSchema(z.string().catch("x"));
  });

  it("traverses union schema", async () => {
    await runWithSchema(z.union([z.string(), z.number()]));
  });

  it("traverses discriminatedUnion schema", async () => {
    await runWithSchema(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("a"), value: z.string() }),
        z.object({ type: z.literal("b"), count: z.number() }),
      ]),
    );
  });

  it("traverses tuple schema", async () => {
    await runWithSchema(z.tuple([z.string(), z.number()]));
  });

  it("traverses tuple with rest schema", async () => {
    await runWithSchema(z.tuple([z.string()]).rest(z.number()));
  });

  it("traverses record schema", async () => {
    await runWithSchema(z.record(z.string(), z.number()));
  });

  it("traverses intersection schema", async () => {
    await runWithSchema(z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() })));
  });

  it("traverses set schema", async () => {
    await runWithSchema(z.set(z.string()));
  });

  it("traverses map schema", async () => {
    await runWithSchema(z.map(z.string(), z.number()));
  });

  it("traverses pipe schema", async () => {
    await runWithSchema(z.string().pipe(z.string().min(3)));
  });

  // ── Fallback paths (transform inside each container type) ──

  it("reports fallback in nested array element", async () => {
    await runWithSchemaExpectExit(z.array(z.string().transform((s) => s.toUpperCase())));
  });

  it("reports fallback in union option", async () => {
    await runWithSchemaExpectExit(
      z.union([z.string(), z.string().transform((s) => s.toUpperCase())]),
    );
  });

  it("reports fallback in tuple item", async () => {
    await runWithSchemaExpectExit(z.tuple([z.string(), z.string().transform((s) => s)]));
  });

  it("reports fallback in tuple rest", async () => {
    await runWithSchemaExpectExit(z.tuple([z.string()]).rest(z.string().transform((s) => s)));
  });

  it("reports fallback in record value", async () => {
    await runWithSchemaExpectExit(
      z.record(
        z.string(),
        z.string().transform((s) => s),
      ),
    );
  });

  it("reports fallback in intersection", async () => {
    await runWithSchemaExpectExit(
      z.intersection(z.object({ a: z.string() }), z.object({ b: z.string().transform((s) => s) })),
    );
  });

  it("reports fallback in set element", async () => {
    await runWithSchemaExpectExit(z.set(z.string().transform((s) => s)));
  });

  it("reports fallback in map value", async () => {
    await runWithSchemaExpectExit(
      z.map(
        z.string(),
        z.string().transform((s) => s),
      ),
    );
  });

  it("reports fallback in pipe", async () => {
    await runWithSchemaExpectExit(
      z
        .string()
        .transform((s) => s)
        .pipe(z.string()),
    );
  });

  // ── Edge cases ──

  it("reports top-level fallback with root path", async () => {
    await runWithSchemaExpectExit(z.string().transform((s) => s));
  });

  it("handles empty object (total=0) as 100% compiled", async () => {
    await runWithSchema(z.object({}));
  });

  it("exits with error when discoverSchemas throws", async () => {
    mockDiscoverSchemas.mockRejectedValueOnce(new Error("load failed"));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      const { runCheck } = await import("#src/cli/commands/check.js");
      await expect(runCheck({ inputs: [existingFilePath] })).rejects.toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  });
});
