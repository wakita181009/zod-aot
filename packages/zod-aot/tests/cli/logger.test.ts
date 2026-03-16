import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("info logs with cyan prefix", async () => {
    const { logger } = await import("#src/cli/logger.js");
    logger.info("test message");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("info"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("test message"));
  });

  it("success logs with green prefix", async () => {
    const { logger } = await import("#src/cli/logger.js");
    logger.success("done message");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("done"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("done message"));
  });

  it("warn logs to stderr", async () => {
    const { logger } = await import("#src/cli/logger.js");
    logger.warn("warning message");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("warn"));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("warning message"));
  });

  it("error logs to stderr", async () => {
    const { logger } = await import("#src/cli/logger.js");
    logger.error("error message");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("error"));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("error message"));
  });

  it("dim logs with dim formatting", async () => {
    const { logger } = await import("#src/cli/logger.js");
    logger.dim("dim message");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("dim message"));
  });
});
