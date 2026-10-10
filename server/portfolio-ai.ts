export type PortfolioAiInput = {
  title: string;
  sourceNotes: string;
};

export type PortfolioAiDraft = {
  title: string;
  description: string;
  challenge: string;
  approach: string;
  outcomes: string;
  impactSummary: string;
  skills: string[];
};

export interface PortfolioAiProvider {
  generateDraft(input: PortfolioAiInput): Promise<PortfolioAiDraft>;
}

export class GeminiPortfolioProvider implements PortfolioAiProvider {
  constructor(private apiKey: string) {}

  async generateDraft(input: PortfolioAiInput): Promise<PortfolioAiDraft> {
    const systemPrompt = `You are an expert creative director helping a creator draft a portfolio project description.
Based on the provided source notes and title (if any), generate a structured portfolio draft.
Output valid JSON matching the following schema:
{
  "title": "string (the project title)",
  "description": "string (short overview)",
  "challenge": "string (the problem or goal)",
  "approach": "string (how it was solved)",
  "outcomes": "string (the results)",
  "impactSummary": "string (1-2 sentence summary of impact)",
  "skills": ["string"]
}
Only output the JSON object, nothing else.`;

    const userPrompt = `Title: ${input.title}\nNotes:\n${input.sourceNotes}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          parts: [{ text: userPrompt }]
        }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.7,
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("AI provider rate limit exceeded. Please try again later.");
      }
      throw new Error(`AI provider error: ${response.statusText}`);
    }

    const data = await response.json();
    try {
      const content = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(content);
      return {
        title: parsed.title || input.title || "Untitled Project",
        description: parsed.description || "",
        challenge: parsed.challenge || "",
        approach: parsed.approach || "",
        outcomes: parsed.outcomes || "",
        impactSummary: parsed.impactSummary || "",
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      };
    } catch (e) {
      throw new Error("AI returned malformed output");
    }
  }
}

// Providers can be registered here without binding the application contract to a vendor.
export function resolvePortfolioAiProvider(): PortfolioAiProvider | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    return new GeminiPortfolioProvider(apiKey);
  }
  return null;
}
