export type BriefAiInput = {
  idea?: string;
  prompt?: string;
};

export type BriefAiDraft = {
  title: string;
  objective: string;
  targetAudience: string;
  audience: string;
  contentType: string;
  creativeStyle: string;
  style: string;
  platform: string;
  aspectRatio: string;
  duration: string;
  deliverables: number;
  budget: string;
  deadline: string;
  workMode: "remote" | "hybrid" | "on-site";
  licensing: string;
  location: string;
};

export interface BriefAiProvider {
  generateDraft(input: BriefAiInput): Promise<BriefAiDraft>;
}

const BUDGET_KEYWORDS = /\$|€|£|¥|budget|cost|\bpay\b|\busd\b|\binr\b|\beur\b|\b[0-9]+k\b/i;
const DEADLINE_KEYWORDS = /\bdeadline\b|\bdue\b|\bby\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[0-9]{1,2}\/[0-9]{1,2}|end of|next week|next month|q[1-4]|tomorrow|[0-9]+\s+days|[0-9]+\s+weeks)\b/i;
const LICENSING_KEYWORDS = /\blicens(e|ing)\b|\bcommercial\b|\brights\b|\bbuyout\b|\bcopyright\b|\busage\b/i;

export class GeminiBriefProvider implements BriefAiProvider {
  constructor(private apiKey: string) {}

  async generateDraft(input: BriefAiInput): Promise<BriefAiDraft> {
    const campaignIdea = (input.idea || input.prompt || "").trim();
    if (campaignIdea.length < 5) {
      throw new Error("A campaign idea of at least 5 characters is required");
    }

    const systemPrompt = `You are an expert creative producer and advertising strategist helping a brand draft a structured creative brief.
Based on the brand's campaign idea, generate a structured creative brief draft.

CRITICAL RULES FOR BUDGET, DEADLINE, AND LICENSING:
- NEVER invent, assume, or guess a budget. If the user's input does not explicitly specify a budget or budget range, you MUST return "" (empty string) for "budget".
- NEVER invent, assume, or guess a deadline. If the user's input does not explicitly specify a deadline date or timeframe, you MUST return "" (empty string) for "deadline".
- NEVER invent, assume, or guess licensing permissions or usage terms. If the user's input does not explicitly mention licensing or commercial use terms, you MUST return "" (empty string) for "licensing".

Output valid JSON matching this schema:
{
  "title": "string (concise, professional title for the brief)",
  "objective": "string (clear campaign objective explaining what the work should achieve)",
  "targetAudience": "string (target demographic or audience description)",
  "contentType": "string (e.g., Launch Video, Brand Film, Social Campaign, 3D Motion)",
  "creativeStyle": "string (visual aesthetic or creative tone, e.g., Tactile, Organic, Warm, Cinematic)",
  "platform": "string (primary delivery platforms, e.g., Instagram + TikTok, YouTube, Website)",
  "aspectRatio": "string (e.g., 9:16, 16:9, 1:1, 4:5)",
  "duration": "string (e.g., 30-60 sec, 15 sec, or N/A)",
  "deliverables": number (integer >= 1, count of deliverables expected),
  "budget": "string (ONLY if explicitly mentioned in input, otherwise \"\")",
  "deadline": "string (ONLY if explicitly mentioned in input, otherwise \"\")",
  "workMode": "remote" | "hybrid" | "on-site",
  "licensing": "string (ONLY if explicitly mentioned in input, otherwise \"\")",
  "location": "string (e.g., Remote, or specific city if mentioned)"
}
Only output the JSON object, nothing else.`;

    const userPrompt = `Campaign idea:\n${campaignIdea}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("AI provider rate limit exceeded. Please try again later.");
      }
      throw new Error(`AI provider error: ${response.statusText}`);
    }

    const data = await response.json();
    let parsed: any;
    try {
      const content = data.candidates[0].content.parts[0].text;
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned malformed output");
    }

    const hasMentionedBudget = BUDGET_KEYWORDS.test(campaignIdea);
    const hasMentionedDeadline = DEADLINE_KEYWORDS.test(campaignIdea);
    const hasMentionedLicensing = LICENSING_KEYWORDS.test(campaignIdea);

    const title =
      (typeof parsed.title === "string" && parsed.title.trim()) ||
      "Campaign Brief Draft";
    const objective =
      (typeof parsed.objective === "string" && parsed.objective.trim()) ||
      campaignIdea;
    const audience =
      (typeof parsed.targetAudience === "string" && parsed.targetAudience.trim()) ||
      (typeof parsed.audience === "string" && parsed.audience.trim()) ||
      "";
    const contentType =
      (typeof parsed.contentType === "string" && parsed.contentType.trim()) ||
      "Brand film";
    const style =
      (typeof parsed.creativeStyle === "string" && parsed.creativeStyle.trim()) ||
      (typeof parsed.style === "string" && parsed.style.trim()) ||
      "";
    const platform =
      (typeof parsed.platform === "string" && parsed.platform.trim()) ||
      "Instagram + site";
    const aspectRatio =
      (typeof parsed.aspectRatio === "string" && parsed.aspectRatio.trim()) ||
      "16:9";
    const duration =
      (typeof parsed.duration === "string" && parsed.duration.trim()) ||
      "30–60 sec";
    const deliverables =
      typeof parsed.deliverables === "number" && parsed.deliverables > 0
        ? Math.floor(parsed.deliverables)
        : 1;

    // Critical constraint: Never invent budget, deadline, or licensing
    const rawBudget = typeof parsed.budget === "string" ? parsed.budget.trim() : "";
    const budget = hasMentionedBudget ? rawBudget : "";

    const rawDeadline = typeof parsed.deadline === "string" ? parsed.deadline.trim() : "";
    const deadline = hasMentionedDeadline ? rawDeadline : "";

    const rawLicensing = typeof parsed.licensing === "string" ? parsed.licensing.trim() : "";
    const licensing = hasMentionedLicensing ? rawLicensing : "";

    const workMode =
      parsed.workMode === "hybrid" || parsed.workMode === "on-site"
        ? parsed.workMode
        : "remote";
    const location =
      (typeof parsed.location === "string" && parsed.location.trim()) ||
      "Remote";

    return {
      title,
      objective,
      targetAudience: audience,
      audience,
      contentType,
      creativeStyle: style,
      style,
      platform,
      aspectRatio,
      duration,
      deliverables,
      budget,
      deadline,
      workMode,
      licensing,
      location,
    };
  }
}

export function resolveBriefAiProvider(): BriefAiProvider | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    return new GeminiBriefProvider(apiKey);
  }
  return null;
}
