export type CopilotFeedbackInput = {
  feedback: string;
  deliverableTitle?: string;
  briefContext?: {
    title?: string;
    objective?: string;
    contentType?: string;
    style?: string;
  };
};

export type ProposedRevisionTask = {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
};

export type CopilotRevisionDraft = {
  summary: string;
  creativeDirection: string;
  suggestedTasks: ProposedRevisionTask[];
};

export interface CopilotAiProvider {
  analyzeFeedback(input: CopilotFeedbackInput): Promise<CopilotRevisionDraft>;
}

export class GeminiCopilotProvider implements CopilotAiProvider {
  constructor(private apiKey: string) {}

  async analyzeFeedback(input: CopilotFeedbackInput): Promise<CopilotRevisionDraft> {
    const feedback = input.feedback.trim();
    if (feedback.length < 5) {
      throw new Error("Feedback must be at least 5 characters long");
    }

    const contextSection = input.briefContext
      ? `Project Context:
- Title: ${input.briefContext.title || "Creative Project"}
- Objective: ${input.briefContext.objective || "Deliver creative asset"}
- Content Type: ${input.briefContext.contentType || "Digital Media"}
- Style Direction: ${input.briefContext.style || "Open"}`
      : "";

    const deliverableContext = input.deliverableTitle
      ? `Deliverable Under Review: ${input.deliverableTitle}`
      : "";

    const systemPrompt = `You are an expert creative director and production manager helping a creator and brand execute revisions on a collaborative project.
Your task is to analyze client/brand feedback and convert it into structured, actionable revision guidance and concrete task items for the creator's checklist.

Rules:
1. "summary": Provide a clear, objective 1-2 sentence breakdown of what the feedback is asking for.
2. "creativeDirection": Provide thoughtful, constructive technical and artistic advice on how the creator should execute these changes without losing creative quality.
3. "suggestedTasks": Break down the feedback into 2-5 concrete, actionable task items with specific descriptions and priority ('high', 'medium', or 'low').

Output valid JSON matching this schema:
{
  "summary": "string",
  "creativeDirection": "string",
  "suggestedTasks": [
    {
      "title": "string",
      "description": "string",
      "priority": "high" | "medium" | "low"
    }
  ]
}
Only output the JSON object, nothing else.`;

    const userPrompt = `${contextSection}
${deliverableContext}

Client Feedback to analyze:
"${feedback}"`;

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
            temperature: 0.6,
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

    const summary =
      (typeof parsed.summary === "string" && parsed.summary.trim()) ||
      "Feedback analyzed. Please review the suggested tasks below.";
    const creativeDirection =
      (typeof parsed.creativeDirection === "string" && parsed.creativeDirection.trim()) ||
      "Follow client guidance while preserving core brand aesthetics.";

    const rawTasks = Array.isArray(parsed.suggestedTasks) ? parsed.suggestedTasks : [];
    const suggestedTasks: ProposedRevisionTask[] = rawTasks
      .filter((t: any) => t && typeof t.title === "string" && t.title.trim())
      .map((t: any) => ({
        title: String(t.title).trim(),
        description: typeof t.description === "string" ? t.description.trim() : "",
        priority: t.priority === "high" || t.priority === "low" ? t.priority : "medium",
      }));

    if (suggestedTasks.length === 0) {
      suggestedTasks.push({
        title: "Address client feedback",
        description: feedback,
        priority: "high",
      });
    }

    return {
      summary,
      creativeDirection,
      suggestedTasks,
    };
  }
}

export function resolveCopilotAiProvider(): CopilotAiProvider | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    return new GeminiCopilotProvider(apiKey);
  }
  return null;
}
