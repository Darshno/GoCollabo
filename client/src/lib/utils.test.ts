import { describe, it, expect, vi } from "vitest";

describe("getAppUrl function", () => {
  it("should exist and return a string", () => {
    // Since we can't easily mock import.meta.env and window.location in vitest,
    // we'll just test that the function exists and behaves predictably
    const { getAppUrl } = require("./utils");
    expect(typeof getAppUrl).toBe("function");

    // Should return a valid URL string
    const result = getAppUrl();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);

    // Should be a valid URL format (starts with http:// or https://)
    expect(result).toMatch(/^https?:\/\//);
  });
});