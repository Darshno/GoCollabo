export type CurrencyCode = "INR" | "USD";

export interface MoneyFormatOptions {
  currency?: string | null;
  location?: string | null;
}

export type RateFormatOptions = MoneyFormatOptions;

/**
 * Formats a number using Indian grouping:
 * Rightmost 3 digits grouped, then grouped by pairs of 2 digits.
 * e.g., 15000 -> "15,000", 150000 -> "1,50,000", 1200000 -> "12,00,000"
 */
export function formatIndianNumber(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Formats a number using Western/US grouping:
 * Digits grouped in triplets.
 * e.g., 15000 -> "15,000", 150000 -> "150,000"
 */
export function formatUsdNumber(val: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Parses numeric monetary values like "15,000", "15000", "15k", "1.5L", "2.5lac", "1cr" into raw numbers.
 */
export function parseMoneyAmount(str: string): number | null {
  if (!str) return null;
  const s = str.trim().toLowerCase();

  const kMatch = s.match(/^([\d.]+)\s*k$/);
  if (kMatch) {
    const val = parseFloat(kMatch[1]);
    return isNaN(val) ? null : val * 1000;
  }

  const lMatch = s.match(/^([\d.]+)\s*(?:l|lac|lakh)$/);
  if (lMatch) {
    const val = parseFloat(lMatch[1]);
    return isNaN(val) ? null : val * 100000;
  }

  const crMatch = s.match(/^([\d.]+)\s*(?:cr|crore)$/);
  if (crMatch) {
    const val = parseFloat(crMatch[1]);
    return isNaN(val) ? null : val * 10000000;
  }

  const num = parseFloat(s.replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

export const parseRateAmount = parseMoneyAmount;

/**
 * Detects currency from explicit options, monetary string, or creator/brief location.
 * Explicitly specified currency ALWAYS takes priority over location fallback.
 * Falls back to "USD" for international creators/briefs when currency is unspecified.
 */
export function detectCurrency(
  monetaryString?: string | null,
  options?: MoneyFormatOptions
): CurrencyCode {
  // 1. Explicit currency code takes highest priority
  if (options?.currency) {
    const cur = options.currency.toUpperCase();
    if (cur === "INR" || cur === "₹") return "INR";
    if (cur === "USD" || cur === "$") return "USD";
  }

  // 2. Explicit currency symbol or code within the string
  if (monetaryString) {
    if (monetaryString.includes("₹") || /\bINR\b/i.test(monetaryString)) {
      return "INR";
    }
    if (monetaryString.includes("$") || /\bUSD\b/i.test(monetaryString)) {
      return "USD";
    }
  }

  // 3. Location fallback (only when currency is genuinely unspecified)
  if (options?.location) {
    const loc = options.location.toLowerCase();
    if (
      loc.includes("india") ||
      loc.includes("mumbai") ||
      loc.includes("bengaluru") ||
      loc.includes("bangalore") ||
      loc.includes("kochi") ||
      loc.includes("delhi")
    ) {
      return "INR";
    }
  }

  // 4. Default to USD for international records
  return "USD";
}

/**
 * General money formatter that formats rates, budgets, and amounts:
 * - For INR: outputs readable Indian currency with proper Indian digit grouping (e.g. ₹4,00,000–₹8,00,000, ₹15,000–₹45,000 / project)
 * - For USD: preserves standard USD notation (e.g. $5k–$10k, $1.8k–$5k / project, $2,000–$5,000)
 */
export function formatMoney(
  amountOrItem?:
    | string
    | number
    | null
    | {
        budget?: string | null;
        rates?: string | null;
        amount?: string | number | null;
        price?: string | number | null;
        currency?: string | null;
        location?: string | null;
      },
  options?: MoneyFormatOptions
): string {
  let valStr = "";
  let currency = options?.currency;
  let location = options?.location;

  if (typeof amountOrItem === "object" && amountOrItem !== null) {
    valStr =
      amountOrItem.budget ||
      amountOrItem.rates ||
      (amountOrItem.amount !== undefined && amountOrItem.amount !== null
        ? String(amountOrItem.amount)
        : "") ||
      (amountOrItem.price !== undefined && amountOrItem.price !== null
        ? String(amountOrItem.price)
        : "") ||
      "";
    currency = currency || amountOrItem.currency;
    location = location || amountOrItem.location;
  } else if (typeof amountOrItem === "string") {
    valStr = amountOrItem;
  } else if (typeof amountOrItem === "number") {
    valStr = String(amountOrItem);
  }

  if (
    !valStr ||
    valStr === "Range not shared" ||
    valStr === "Budget not shared"
  ) {
    return valStr || "Range not shared";
  }

  const resolvedCurrency = detectCurrency(valStr, { currency, location });

  if (resolvedCurrency === "INR") {
    const clean = valStr.replace(/[₹]/g, "").trim();

    // Check for range: "4,00,000–8,00,000" or "15000-45000 / project"
    const rangeMatch = clean.match(
      /^([\d.,\s]+[kKlLcrCR]?)\s*(?:–|-|—|to)\s*([\d.,\s]+[kKlLcrCR]?)(.*)$/i
    );
    if (rangeMatch) {
      const min = parseMoneyAmount(rangeMatch[1]);
      const max = parseMoneyAmount(rangeMatch[2]);
      const suffix = rangeMatch[3].trim()
        ? ` ${rangeMatch[3].trim().replace(/^\/\s*/, "/ ")}`
        : "";
      if (min !== null && max !== null) {
        return `₹${formatIndianNumber(min)}–₹${formatIndianNumber(max)}${suffix}`;
      }
    }

    // Check for single amount: "400000" or "50,000 / project"
    const singleMatch = clean.match(/^([\d.,\s]+[kKlLcrCR]?)(.*)$/i);
    if (singleMatch) {
      const val = parseMoneyAmount(singleMatch[1]);
      const suffix = singleMatch[2].trim()
        ? ` ${singleMatch[2].trim().replace(/^\/\s*/, "/ ")}`
        : "";
      if (val !== null) {
        return `₹${formatIndianNumber(val)}${suffix}`;
      }
    }

    return valStr.startsWith("₹") ? valStr : `₹${valStr}`;
  } else {
    // USD
    // If it already uses 'k' notation like "$5k–$10k" or "$1.8k–$5k / project", preserve it
    if (/[kK]/.test(valStr)) {
      return valStr.startsWith("$") ? valStr : `$${valStr}`;
    }

    const clean = valStr.replace(/[$]/g, "").trim();
    const rangeMatch = clean.match(
      /^([\d.,\s]+)\s*(?:–|-|—|to)\s*([\d.,\s]+)(.*)$/i
    );
    if (rangeMatch) {
      const min = parseMoneyAmount(rangeMatch[1]);
      const max = parseMoneyAmount(rangeMatch[2]);
      const suffix = rangeMatch[3].trim()
        ? ` ${rangeMatch[3].trim().replace(/^\/\s*/, "/ ")}`
        : "";
      if (min !== null && max !== null) {
        return `$${formatUsdNumber(min)}–$${formatUsdNumber(max)}${suffix}`;
      }
    }

    const singleMatch = clean.match(/^([\d.,\s]+)(.*)$/i);
    if (singleMatch) {
      const val = parseMoneyAmount(singleMatch[1]);
      const suffix = singleMatch[2].trim()
        ? ` ${singleMatch[2].trim().replace(/^\/\s*/, "/ ")}`
        : "";
      if (val !== null) {
        return `$${formatUsdNumber(val)}${suffix}`;
      }
    }

    return valStr.startsWith("$") ? valStr : `$${valStr}`;
  }
}

/**
 * Formats a creator rate string or profile object according to currency and location.
 */
export function formatRate(
  rateOrCreator?:
    | string
    | null
    | {
        rates?: string | null;
        currency?: string | null;
        location?: string | null;
      },
  options?: MoneyFormatOptions
): string {
  if (typeof rateOrCreator === "object" && rateOrCreator !== null) {
    return formatMoney(rateOrCreator.rates, {
      currency: options?.currency || rateOrCreator.currency,
      location: options?.location || rateOrCreator.location,
    });
  }
  return formatMoney(rateOrCreator, options);
}

/**
 * Formats a brief budget string or brief object according to currency and location.
 */
export function formatBudget(
  budgetOrBrief?:
    | string
    | null
    | {
        budget?: string | null;
        currency?: string | null;
        location?: string | null;
      },
  options?: MoneyFormatOptions
): string {
  if (typeof budgetOrBrief === "object" && budgetOrBrief !== null) {
    return formatMoney(budgetOrBrief.budget, {
      currency: options?.currency || budgetOrBrief.currency,
      location: options?.location || budgetOrBrief.location,
    });
  }
  return formatMoney(budgetOrBrief, options);
}
