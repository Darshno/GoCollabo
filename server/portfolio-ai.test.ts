import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GeminiPortfolioProvider, resolvePortfolioAiProvider } from "./portfolio-ai";

describe("Portfolio AI Generation", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("resolvePortfolioAiProvider", () => {
    it("returns null when GEMINI_API_KEY is missing", () => {
      delete process.env.GEMINI_API_KEY;
      expect(resolvePortfolioAiProvider()).toBeNull();
    });

    it("returns an GeminiPortfolioProvider when GEMINI_API_KEY is present", () => {
      process.env.GEMINI_API_KEY = "test-key";
      const provider = resolvePortfolioAiProvider();
      expect(provider).toBeInstanceOf(GeminiPortfolioProvider);
    });
  });

  describe("GeminiPortfolioProvider", () => {
    const provider = new GeminiPortfolioProvider("test-key");

    it("successfully generates a structured portfolio draft", async () => {
      const mockResponse = {
        title: "Test Project",
        description: "A cool project",
        challenge: "Hard stuff",
        approach: "Smart solutions",
        outcomes: "Great success",
        impactSummary: "Did good",
        skills: ["Skill A", "Skill B"],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockResponse) }] } }],
        }),
      } as Response);

      const draft = await provider.generateDraft({
        title: "Initial Title",
        sourceNotes: "Some rough notes here.",
      });

      expect(draft).toEqual(mockResponse);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      
      const fetchArgs = fetchSpy.mock.calls[0];
      expect(fetchArgs[0]).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=test-key");
    });

    it("handles rate limit errors gracefully", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      } as Response);

      await expect(
        provider.generateDraft({ title: "", sourceNotes: "notes" })
      ).rejects.toThrow("AI provider rate limit exceeded. Please try again later.");
    });

    it("handles generic provider errors gracefully", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await expect(
        provider.generateDraft({ title: "", sourceNotes: "notes" })
      ).rejects.toThrow("AI provider error: Internal Server Error");
    });

    it("handles malformed JSON output from the AI", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "this is not json" }] } }],
        }),
      } as Response);

      await expect(
        provider.generateDraft({ title: "", sourceNotes: "notes" })
      ).rejects.toThrow("AI returned malformed output");
    });
  });
});
