import { describe, expect, it } from "vitest";
import {
  detectCurrency,
  formatMoney,
  formatMoneyValue,
  hasExplicitCurrency,
} from "./money";

describe("formatMoneyValue — INR", () => {
  it("formats a round lakh with Indian grouping", () => {
    const result = formatMoneyValue(400000, "INR");
    // Intl may render ₹4,00,000 or "₹ 4,00,000" depending on Node locale data
    expect(result.replace(/\s/g, "")).toContain("4,00,000");
    expect(result).toContain("₹");
  });

  it("formats 150000 as ₹1,50,000", () => {
    const result = formatMoneyValue(150000, "INR").replace(/\s/g, "");
    expect(result).toContain("1,50,000");
    expect(result).toContain("₹");
  });

  it("formats 450000 as ₹4,50,000", () => {
    const result = formatMoneyValue(450000, "INR").replace(/\s/g, "");
    expect(result).toContain("4,50,000");
  });

  it("omits fractional digits", () => {
    const result = formatMoneyValue(450000, "INR");
    expect(result).not.toContain(".");
  });
});

describe("formatMoneyValue — USD", () => {
  it("formats a round thousand with Western grouping", () => {
    const result = formatMoneyValue(4500, "USD");
    expect(result).toContain("4,500");
    expect(result).toContain("$");
  });

  it("formats 2500 as $2,500", () => {
    const result = formatMoneyValue(2500, "USD");
    expect(result).toContain("2,500");
    expect(result).toContain("$");
  });

  it("omits fractional digits", () => {
    const result = formatMoneyValue(2500, "USD");
    expect(result).not.toContain(".");
  });
});

describe("formatMoney — single values and ranges", () => {
  it("formats an INR range with suffix", () => {
    const result = formatMoney({ min: 150000, max: 400000, currency: "INR", suffix: "/ project" });
    expect(result).toContain("1,50,000");
    expect(result).toContain("4,00,000");
    expect(result).toContain("/ project");
    expect(result).toContain("₹");
  });

  it("formats a USD range without suffix", () => {
    const result = formatMoney({ min: 2500, max: 8000, currency: "USD" });
    expect(result).toContain("2,500");
    expect(result).toContain("8,000");
    expect(result).toContain("$");
    expect(result).not.toContain("/ project");
  });

  it("formats a single INR value", () => {
    const result = formatMoney({ min: 400000, currency: "INR" });
    expect(result).toContain("4,00,000");
    expect(result).not.toContain("–");
  });

  it("formats a single USD value with suffix", () => {
    const result = formatMoney({ min: 5000, currency: "USD", suffix: "flat" });
    expect(result).toContain("5,000");
    expect(result).toContain("flat");
  });
});

describe("detectCurrency", () => {
  it("detects INR from ₹ symbol", () => {
    expect(detectCurrency("₹4,50,000")).toBe("INR");
  });

  it("detects INR from the word 'inr' (case-insensitive)", () => {
    expect(detectCurrency("Budget: INR 450000")).toBe("INR");
    expect(detectCurrency("inr 1.5L")).toBe("INR");
  });

  it("detects USD from $ symbol", () => {
    expect(detectCurrency("$2k–$5k")).toBe("USD");
    expect(detectCurrency("Budget: $8,000")).toBe("USD");
  });

  it("detects USD from the word 'usd' (case-insensitive)", () => {
    expect(detectCurrency("5000 USD")).toBe("USD");
  });

  it("returns null when no currency signal is present", () => {
    expect(detectCurrency("Range not shared")).toBeNull();
    expect(detectCurrency("")).toBeNull();
    expect(detectCurrency("2k–5k")).toBeNull();
  });

  it("INR takes priority over USD when both symbols appear (rare edge case)", () => {
    // ₹ is checked first; if a string bizarrely contains both, INR wins
    expect(detectCurrency("₹4,50,000 (approx $5,000)")).toBe("INR");
  });
});

describe("hasExplicitCurrency", () => {
  it("returns true for strings with ₹", () => {
    expect(hasExplicitCurrency("₹1,50,000–₹4,00,000")).toBe(true);
  });

  it("returns true for strings with $", () => {
    expect(hasExplicitCurrency("$2k–$5k / project")).toBe(true);
  });

  it("returns false for strings without a currency signal", () => {
    expect(hasExplicitCurrency("Range not shared")).toBe(false);
    expect(hasExplicitCurrency("")).toBe(false);
    expect(hasExplicitCurrency("2 lakhs")).toBe(false);
  });
});

describe("No silent conversion guarantee", () => {
  /**
   * The money utilities must NEVER convert numeric values between currencies.
   * formatMoneyValue(450000, "INR") must not produce "$450,000".
   * formatMoneyValue(4500, "USD") must not produce "₹4,500".
   */
  it("INR formatting never produces a $ symbol", () => {
    expect(formatMoneyValue(450000, "INR")).not.toContain("$");
  });

  it("USD formatting never produces a ₹ symbol", () => {
    expect(formatMoneyValue(4500, "USD")).not.toContain("₹");
  });

  it("formatMoney INR range never contains $", () => {
    const result = formatMoney({ min: 400000, max: 800000, currency: "INR" });
    expect(result).not.toContain("$");
  });

  it("formatMoney USD range never contains ₹", () => {
    const result = formatMoney({ min: 5000, max: 10000, currency: "USD" });
    expect(result).not.toContain("₹");
  });
});

describe("Backward compatibility — creator rates and brief budgets", () => {
  /**
   * Existing data in the database is stored as opaque strings.
   * detectCurrency / hasExplicitCurrency must faithfully recognise previously stored values.
   */
  it("recognises legacy USD creator rate strings", () => {
    expect(detectCurrency("$2.5k–$8k / project")).toBe("USD");
    expect(detectCurrency("$1.8k–$5k / project")).toBe("USD");
    expect(detectCurrency("$900–$3k / project")).toBe("USD");
    expect(detectCurrency("$3k–$12k / project")).toBe("USD");
  });

  it("recognises INR seed brief budget strings", () => {
    expect(detectCurrency("₹4,00,000–₹8,00,000")).toBe("INR");
    expect(detectCurrency("₹1,50,000–₹4,00,000")).toBe("INR");
    expect(detectCurrency("₹4,50,000")).toBe("INR");
  });

  it("returns null for 'Range not shared' fallback", () => {
    expect(detectCurrency("Range not shared")).toBeNull();
  });

  it("returns null for empty budget (omitted from brief)", () => {
    expect(detectCurrency("")).toBeNull();
  });

  it("recognises INR Indian creator rate strings", () => {
    // Ananya Sharma
    expect(detectCurrency("₹15,000–₹45,000 / project")).toBe("INR");
    // Arjun Mehta
    expect(detectCurrency("₹12,000–₹35,000 / project")).toBe("INR");
    // Meera Nair
    expect(detectCurrency("₹20,000–₹60,000 / project")).toBe("INR");
    // Kabir Malhotra
    expect(detectCurrency("₹18,000–₹50,000 / project")).toBe("INR");
  });

  it("Indian creator rates never trigger USD detection", () => {
    for (const rate of [
      "₹15,000–₹45,000 / project",
      "₹12,000–₹35,000 / project",
      "₹20,000–₹60,000 / project",
      "₹18,000–₹50,000 / project",
    ]) {
      expect(detectCurrency(rate)).not.toBe("USD");
    }
  });
});
