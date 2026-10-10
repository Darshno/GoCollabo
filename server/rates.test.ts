import { describe, it, expect } from "vitest";
import {
  formatRate,
  formatBudget,
  formatMoney,
  detectCurrency,
  formatIndianNumber,
  formatUsdNumber,
  parseMoneyAmount,
} from "@shared/rates";

describe("Rate & Currency Formatting", () => {
  describe("Indian Number Formatting (en-IN digit grouping)", () => {
    it("formats thousands with standard 3-digit right grouping", () => {
      expect(formatIndianNumber(15000)).toBe("15,000");
      expect(formatIndianNumber(12000)).toBe("12,00,000" && formatIndianNumber(12000)).toBe("12,000");
      expect(formatIndianNumber(20000)).toBe("20,000");
      expect(formatIndianNumber(18000)).toBe("18,000");
      expect(formatIndianNumber(45000)).toBe("45,000");
    });

    it("formats lakhs and crores with proper 2-digit Indian grouping", () => {
      // 1.5 lakh: Indian format is 1,50,000 (not Western 150,000)
      expect(formatIndianNumber(150000)).toBe("1,50,000");
      // 4 lakh: 4,00,000
      expect(formatIndianNumber(400000)).toBe("4,00,000");
      // 8 lakh: 8,00,000
      expect(formatIndianNumber(800000)).toBe("8,00,000");
      // 12 lakh: 12,00,000
      expect(formatIndianNumber(1200000)).toBe("12,00,000");
      // 1 crore: 1,00,00,000
      expect(formatIndianNumber(10000000)).toBe("1,00,00,000");
    });
  });

  describe("US Number Formatting (en-US digit grouping)", () => {
    it("formats numbers with Western 3-digit grouping", () => {
      expect(formatUsdNumber(15000)).toBe("15,000");
      expect(formatUsdNumber(150000)).toBe("150,000");
      expect(formatUsdNumber(400000)).toBe("400,000");
      expect(formatUsdNumber(1200000)).toBe("1,200,000");
    });
  });

  describe("Currency Detection & Precedence Rules", () => {
    it("prioritizes explicit currency code over location fallback", () => {
      // Explicit USD takes priority even if located in India
      expect(
        detectCurrency("5000–10000", {
          currency: "USD",
          location: "Mumbai, India",
        })
      ).toBe("USD");

      // Explicit INR takes priority even if located internationally
      expect(
        detectCurrency("15000–45000", {
          currency: "INR",
          location: "London, UK",
        })
      ).toBe("INR");
    });

    it("detects INR from currency symbol or rate string", () => {
      expect(detectCurrency("₹15,000–₹45,000 / project")).toBe("INR");
      expect(detectCurrency("₹4,00,000–₹8,00,000")).toBe("INR");
      expect(detectCurrency("15000 INR / project")).toBe("INR");
    });

    it("detects USD from symbol or string notation", () => {
      expect(detectCurrency("$1.8k–$5k / project")).toBe("USD");
      expect(detectCurrency("$5k–$10k")).toBe("USD");
      expect(detectCurrency("5000 USD")).toBe("USD");
    });

    it("falls back to location only when currency is genuinely unspecified", () => {
      expect(detectCurrency("15000–45000", { location: "Mumbai, India" })).toBe("INR");
      expect(detectCurrency("12000–35000", { location: "Bengaluru, India" })).toBe("INR");
      expect(detectCurrency("20000–60000", { location: "Kochi, India" })).toBe("INR");
      expect(detectCurrency("18000–50000", { location: "New Delhi, India" })).toBe("INR");
      expect(detectCurrency("2000–5000", { location: "Los Angeles, CA" })).toBe("USD");
      expect(detectCurrency("2000–5000", { location: "London, UK" })).toBe("USD");
    });

    it("defaults to USD when neither currency nor location is provided", () => {
      expect(detectCurrency("2000–5000")).toBe("USD");
    });
  });

  describe("Indian Creator Demo Profiles", () => {
    it("formats Ananya Sharma's rate: ₹15,000–₹45,000 / project", () => {
      expect(
        formatRate("₹15,000–₹45,000 / project", {
          currency: "INR",
          location: "Mumbai, India",
        })
      ).toBe("₹15,000–₹45,000 / project");

      expect(
        formatRate({
          rates: "₹15,000–₹45,000 / project",
          currency: "INR",
          location: "Mumbai, India",
        })
      ).toBe("₹15,000–₹45,000 / project");
    });

    it("formats Arjun Mehta's rate: ₹12,000–₹35,000 / project", () => {
      expect(
        formatRate("₹12,000–₹35,000 / project", {
          currency: "INR",
          location: "Bengaluru, India",
        })
      ).toBe("₹12,000–₹35,000 / project");
    });

    it("formats Meera Nair's rate: ₹20,000–₹60,000 / project", () => {
      expect(
        formatRate("₹20,000–₹60,000 / project", {
          currency: "INR",
          location: "Kochi, India",
        })
      ).toBe("₹20,000–₹60,000 / project");
    });

    it("formats Kabir Malhotra's rate: ₹18,000–₹50,000 / project", () => {
      expect(
        formatRate("₹18,000–₹50,000 / project", {
          currency: "INR",
          location: "New Delhi, India",
        })
      ).toBe("₹18,000–₹50,000 / project");
    });
  });

  describe("Indian Brief Demo Data", () => {
    it("formats 'A softer internet' budget: ₹4,00,000–₹8,00,000", () => {
      expect(
        formatBudget("₹4,00,000–₹8,00,000", {
          currency: "INR",
        })
      ).toBe("₹4,00,000–₹8,00,000");

      expect(
        formatBudget({
          budget: "₹4,00,000–₹8,00,000",
          currency: "INR",
        })
      ).toBe("₹4,00,000–₹8,00,000");
    });

    it("formats 'Rituals for the everyday' budget: ₹1,50,000–₹4,00,000", () => {
      expect(
        formatBudget("₹1,50,000–₹4,00,000", {
          currency: "INR",
        })
      ).toBe("₹1,50,000–₹4,00,000");

      expect(
        formatBudget({
          budget: "₹1,50,000–₹4,00,000",
          currency: "INR",
        })
      ).toBe("₹1,50,000–₹4,00,000");
    });

    it("formats raw numeric budget ranges with proper Indian digit grouping", () => {
      expect(formatBudget("400000–800000", { currency: "INR" })).toBe(
        "₹4,00,000–₹8,00,000"
      );
      expect(formatBudget("150000–400000", { currency: "INR" })).toBe(
        "₹1,50,000–₹4,00,000"
      );
    });
  });

  describe("Preserving International USD Creator & Brief Displays", () => {
    it("preserves USD rates with k notation", () => {
      expect(formatRate("$1.8k–$5k / project")).toBe("$1.8k–$5k / project");
      expect(formatRate("$2.5k–$8k / project")).toBe("$2.5k–$8k / project");
      expect(formatRate("$900–$3k / project")).toBe("$900–$3k / project");
      expect(formatRate("$3k–$12k / project")).toBe("$3k–$12k / project");
    });

    it("preserves USD brief budgets with k notation", () => {
      expect(formatBudget("$5k–$10k")).toBe("$5k–$10k");
      expect(formatBudget("$2k–$5k")).toBe("$2k–$5k");
    });

    it("formats raw numeric USD ranges with Western 3-digit grouping", () => {
      expect(formatRate("2000–5000 / project", { currency: "USD" })).toBe(
        "$2,000–$5,000 / project"
      );
      expect(formatBudget("5000–10000", { currency: "USD" })).toBe(
        "$5,000–$10,000"
      );
      // Contrast: 400000 in USD is $400,000, not ₹4,00,000
      expect(formatBudget("400000–800000", { currency: "USD" })).toBe(
        "$400,000–$800,000"
      );
    });

    it("formats single USD amounts", () => {
      expect(formatMoney("$1000")).toBe("$1,000");
      expect(formatMoney("1000", { currency: "USD" })).toBe("$1,000");
    });
  });

  describe("Protection Against Accidental Currency Conversion", () => {
    it("does not mutate or convert underlying monetary magnitude across currencies", () => {
      // 15,000 in INR remains 15,000, never converted by arbitrary rates
      const inr = formatMoney("15000", { currency: "INR" });
      expect(inr).toBe("₹15,000");

      // 15,000 in USD remains 15,000
      const usd = formatMoney("15000", { currency: "USD" });
      expect(usd).toBe("$15,000");

      // Explicit USD takes priority and does NOT convert into INR
      const explicitUsdInIndia = formatMoney("5000–10000", {
        currency: "USD",
        location: "Mumbai, India",
      });
      expect(explicitUsdInIndia).toBe("$5,000–$10,000");
    });
  });

  describe("Edge Cases & Fallbacks", () => {
    it("preserves 'Range not shared'", () => {
      expect(formatRate("Range not shared")).toBe("Range not shared");
      expect(formatRate("Range not shared", { currency: "INR" })).toBe(
        "Range not shared"
      );
      expect(formatBudget("Range not shared")).toBe("Range not shared");
    });

    it("returns 'Range not shared' for empty or null values", () => {
      expect(formatRate(null)).toBe("Range not shared");
      expect(formatRate("")).toBe("Range not shared");
      expect(formatRate({ rates: "" })).toBe("Range not shared");
      expect(formatBudget(null)).toBe("Range not shared");
    });
  });
});
