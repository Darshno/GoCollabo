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

const AUDIENCE_KEYWORDS = /\b(audience|demographic|target|men|women|teens|gen\s*z|millennials|consumers|buyers|professionals|fans)\b/i;

export class GeminiBriefProvider implements BriefAiProvider {
  constructor(private apiKey: string) {}

  async generateDraft(input: BriefAiInput): Promise<BriefAiDraft> {
    const campaignIdea = (input.idea || input.prompt || "").trim();
    if (campaignIdea.length < 5) {
      throw new Error("A campaign idea of at least 5 characters is required");
    }

    const systemPrompt = `You are an expert creative producer and advertising strategist helping a brand draft a structured creative brief.
Based on the brand's campaign idea, generate a structured creative brief draft.

CRITICAL INSTRUCTIONS FOR STRUCTURED FIELDS:
1. "title": A concise, polished, professional campaign title (e.g., "Skincare Product Launch Film", "Heritage Coffee Brand Story").
   - NEVER repeat or copy the user's raw input sentence.
   - Do NOT output generic filler like "Campaign Brief Draft".
2. "objective": A clear statement explaining the business and marketing outcome (e.g., "Build brand awareness, establish category authority, and introduce the new skincare line to drive trial and preorders.").
   - NEVER repeat the user's raw input sentence.
   - MUST be genuinely distinct from the "title" and describe the marketing outcome.
3. "targetAudience": Suggest an appropriate audience or demographic profile.
   - If the user did not specify the target audience in their input, clearly mark your suggestion as an assumption by appending "(assumed)" (e.g., "Beauty enthusiasts and conscious skincare consumers (assumed)").
4. "contentType": Suitable format, such as "Brand Film", "Product Launch Video", "Social Campaign", "3D Motion", or "Documentary Short".
5. "creativeStyle": Relevant creative direction and aesthetic tone (e.g., "Tactile, luminous, clean, and radiant").
6. "platform": Primary delivery platforms (e.g., "Instagram + TikTok", "YouTube + Website").
7. "aspectRatio": Recommended aspect ratio (e.g., "9:16", "16:9", "4:5").
8. "duration": Recommended video length (e.g., "30–60 sec", "15–30 sec").
9. "deliverables": Suggested integer deliverable asset count (>= 1, e.g., 2 or 3).
10. "workMode": "remote" | "hybrid" | "on-site".
11. "location": Specific location if mentioned, otherwise "Remote".

CRITICAL RULES FOR BUDGET, DEADLINE, AND LICENSING:
- NEVER invent, assume, or guess a budget. If the user's input does not explicitly specify a budget or budget range, you MUST return "" (empty string) for "budget".
- NEVER invent, assume, or guess a deadline. If the user's input does not explicitly specify a deadline date or timeframe, you MUST return "" (empty string) for "deadline".
- NEVER invent, assume, or guess licensing permissions or usage terms. If the user's input does not explicitly mention licensing or commercial use terms, you MUST return "" (empty string) for "licensing".

Output valid JSON matching this schema:
{
  "title": "string (concise, professional title - distinct from raw input)",
  "objective": "string (business or marketing outcome - distinct from title and raw input)",
  "targetAudience": "string (target demographic; clearly mark with '(assumed)' if not provided)",
  "contentType": "string",
  "creativeStyle": "string",
  "platform": "string",
  "aspectRatio": "string",
  "duration": "string",
  "deliverables": number,
  "budget": "string (ONLY if explicitly mentioned in input, otherwise \"\")",
  "deadline": "string (ONLY if explicitly mentioned in input, otherwise \"\")",
  "workMode": "remote" | "hybrid" | "on-site",
  "licensing": "string (ONLY if explicitly mentioned in input, otherwise \"\")",
  "location": "string"
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

    const rawTitle =
      typeof parsed.title === "string" ? parsed.title.trim() : "";
    const rawObjective =
      typeof parsed.objective === "string" ? parsed.objective.trim() : "";

    const normalizedIdea = campaignIdea.toLowerCase();
    // Validate that title and objective are distinct from each other and not duplicates of the raw idea
    if (!rawTitle || rawTitle.toLowerCase() === normalizedIdea) {
      throw new Error("AI returned an invalid brief title matching the raw input");
    }
    if (
      !rawObjective ||
      rawObjective.toLowerCase() === normalizedIdea ||
      rawObjective.toLowerCase() === rawTitle.toLowerCase()
    ) {
      throw new Error("AI returned an invalid campaign objective matching the raw input or title");
    }

    const title = rawTitle;
    const objective = rawObjective;

    let audience =
      (typeof parsed.targetAudience === "string" && parsed.targetAudience.trim()) ||
      (typeof parsed.audience === "string" && parsed.audience.trim()) ||
      "Target audience (assumed)";
    if (!AUDIENCE_KEYWORDS.test(campaignIdea) && !/\bassum/i.test(audience)) {
      audience = `${audience} (assumed)`;
    }

    const contentType =
      (typeof parsed.contentType === "string" && parsed.contentType.trim()) ||
      "Brand film";
    const style =
      (typeof parsed.creativeStyle === "string" && parsed.creativeStyle.trim()) ||
      (typeof parsed.style === "string" && parsed.style.trim()) ||
      "Modern & engaging";
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
    const hasMentionedBudget = BUDGET_KEYWORDS.test(campaignIdea);
    const hasMentionedDeadline = DEADLINE_KEYWORDS.test(campaignIdea);
    const hasMentionedLicensing = LICENSING_KEYWORDS.test(campaignIdea);

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
