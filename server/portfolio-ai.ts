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

// Providers can be registered here without binding the application contract to a vendor.
export function resolvePortfolioAiProvider(): PortfolioAiProvider | null {
  return null;
}
