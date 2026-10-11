import { describe, it, expect } from "vitest";
import { getAppUrl } from "./utils";

describe("getAppUrl function", () => {
  it("should return a clean valid URL without trailing slash", () => {
    const result = getAppUrl();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/^https?:\/\//);
    expect(result.endsWith("/")).toBe(false);
  });
});