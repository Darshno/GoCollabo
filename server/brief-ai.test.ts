import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GeminiBriefProvider, resolveBriefAiProvider } from "./brief-ai";

describe("Brief AI Generation", () => {
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

  describe("resolveBriefAiProvider", () => {
    it("returns null when GEMINI_API_KEY is missing", () => {
      delete process.env.GEMINI_API_KEY;
      expect(resolveBriefAiProvider()).toBeNull();
    });

    it("returns a GeminiBriefProvider when GEMINI_API_KEY is present", () => {
      process.env.GEMINI_API_KEY = "test-key";
      const provider = resolveBriefAiProvider();
      expect(provider).toBeInstanceOf(GeminiBriefProvider);
    });
  });

  describe("GeminiBriefProvider", () => {
    const provider = new GeminiBriefProvider("test-key");

    it("successfully generates a structured brief draft and omits unmentioned budget, deadline, and licensing", async () => {
      const mockAiOutput = {
        title: "Sustainable Skincare Launch Campaign",
        objective: "Introduce eco-friendly skincare line to conscious millennials and Gen Z.",
        targetAudience: "Eco-conscious beauty consumers aged 20-35",
        contentType: "Launch Video",
        creativeStyle: "Organic, tactile, and radiant",
        platform: "Instagram + TikTok",
        aspectRatio: "9:16",
        duration: "30-45 sec",
        deliverables: 2,
        budget: "$5,000", // Model hallucinated budget even though user didn't mention it
        deadline: "Nov 30, 2026", // Model hallucinated deadline
        workMode: "remote",
        licensing: "Full commercial buyout", // Model hallucinated licensing
        location: "Remote",
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockAiOutput) }] } }],
        }),
      } as Response);

      const draft = await provider.generateDraft({
        idea: "I need a launch video for my sustainable skincare brand.",
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy.mock.calls[0][0]).toBe(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=test-key"
      );

      // Verify fields generated
      expect(draft.title).toBe("Sustainable Skincare Launch Campaign");
      expect(draft.objective).toBe(mockAiOutput.objective);
      expect(draft.targetAudience).toBe("Eco-conscious beauty consumers aged 20-35 (assumed)");
      expect(draft.audience).toBe("Eco-conscious beauty consumers aged 20-35 (assumed)");
      expect(draft.contentType).toBe("Launch Video");
      expect(draft.creativeStyle).toBe("Organic, tactile, and radiant");
      expect(draft.style).toBe("Organic, tactile, and radiant");
      expect(draft.platform).toBe("Instagram + TikTok");
      expect(draft.aspectRatio).toBe("9:16");
      expect(draft.duration).toBe("30-45 sec");
      expect(draft.deliverables).toBe(2);
      expect(draft.workMode).toBe("remote");
      expect(draft.location).toBe("Remote");

      // Critical requirement: Never invent budget, deadline, or licensing when omitted from input!
      expect(draft.budget).toBe("");
      expect(draft.deadline).toBe("");
      expect(draft.licensing).toBe("");
    });

    it("preserves budget, deadline, and licensing when explicitly stated in input", async () => {
      const mockAiOutput = {
        title: "Product Launch Video",
        objective: "Drive initial preorders.",
        targetAudience: "Tech enthusiasts",
        contentType: "Product Demo",
        creativeStyle: "Minimalist",
        platform: "YouTube",
        aspectRatio: "16:9",
        duration: "60 sec",
        deliverables: 1,
        budget: "$8,000",
        deadline: "by Dec 15",
        workMode: "remote",
        licensing: "Full commercial rights for digital ads",
        location: "Remote",
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockAiOutput) }] } }],
        }),
      } as Response);

      const draft = await provider.generateDraft({
        idea: "Launch video with budget of $8,000, deadline by Dec 15, and commercial rights for ads.",
      });

      expect(draft.budget).toBe("$8,000");
      expect(draft.deadline).toBe("by Dec 15");
      expect(draft.licensing).toBe("Full commercial rights for digital ads");
    });

    it("rejects campaign idea that is too short", async () => {
      await expect(provider.generateDraft({ idea: "hi" })).rejects.toThrow(
        "A campaign idea of at least 5 characters is required"
      );
    });

    it("ensures acceptance test behavior for skincare launch video with distinct title, objective, and assumed audience", async () => {
      const mockAiOutput = {
        title: "Skincare Product Launch Film",
        objective: "Build awareness, establish brand credibility, and introduce the new skincare collection.",
        targetAudience: "Eco-conscious skincare consumers aged 22-38",
        contentType: "Product Launch Video",
        creativeStyle: "Radiant, tactile, and minimalist",
        platform: "Instagram + TikTok",
        aspectRatio: "9:16",
        duration: "30–60 sec",
        deliverables: 3,
        budget: "",
        deadline: "",
        workMode: "remote",
        licensing: "",
        location: "Remote",
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockAiOutput) }] } }],
        }),
      } as Response);

      const draft = await provider.generateDraft({
        idea: "i need a launch video for skincare",
      });

      // Title and objective must be genuinely distinct from each other and the raw input
      expect(draft.title).toBe("Skincare Product Launch Film");
      expect(draft.title).not.toBe("i need a launch video for skincare");
      expect(draft.objective).toBe(
        "Build awareness, establish brand credibility, and introduce the new skincare collection."
      );
      expect(draft.objective).not.toBe(draft.title);
      expect(draft.objective).not.toBe("i need a launch video for skincare");

      // Target audience must be marked as an assumption because input did not specify audience
      expect(draft.targetAudience).toMatch(/assumed/i);

      // Other fields
      expect(draft.contentType).toBe("Product Launch Video");
      expect(draft.creativeStyle).toBe("Radiant, tactile, and minimalist");
      expect(draft.deliverables).toBe(3);
      expect(draft.budget).toBe("");
      expect(draft.deadline).toBe("");
      expect(draft.licensing).toBe("");
    });

    it("rejects response where AI blindly copies user input into the title", async () => {
      const mockAiOutput = {
        title: "i need a launch video for skincare",
        objective: "Build awareness and introduce product.",
        targetAudience: "General audience",
        contentType: "Brand film",
        creativeStyle: "Modern",
        deliverables: 1,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockAiOutput) }] } }],
        }),
      } as Response);

      await expect(
        provider.generateDraft({ idea: "i need a launch video for skincare" })
      ).rejects.toThrow("AI returned an invalid brief title matching the raw input");
    });

    it("rejects response where AI copies user input or title into objective", async () => {
      const mockAiOutput = {
        title: "Skincare Launch Film",
        objective: "i need a launch video for skincare",
        targetAudience: "General audience",
        contentType: "Brand film",
        creativeStyle: "Modern",
        deliverables: 1,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockAiOutput) }] } }],
        }),
      } as Response);

      await expect(
        provider.generateDraft({ idea: "i need a launch video for skincare" })
      ).rejects.toThrow("AI returned an invalid campaign objective matching the raw input or title");
    });

    it("handles rate limit errors gracefully (429)", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      } as Response);

      await expect(
        provider.generateDraft({ idea: "Campaign idea for a new product" })
      ).rejects.toThrow("AI provider rate limit exceeded. Please try again later.");
    });

    it("handles generic provider errors gracefully (500)", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await expect(
        provider.generateDraft({ idea: "Campaign idea for a new product" })
      ).rejects.toThrow("AI provider error: Internal Server Error");
    });

    it("handles malformed JSON output from AI", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "not-json-content" }] } }],
        }),
      } as Response);

      await expect(
        provider.generateDraft({ idea: "Campaign idea for a new product" })
      ).rejects.toThrow("AI returned malformed output");
    });
  });
});
