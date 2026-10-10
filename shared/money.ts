/**
 * shared/money.ts
 *
 * Shared currency display utilities.
 *
 * Design decisions
 * ─────────────────
 * 1. `budget` and `rates` are stored as opaque free-text strings (e.g. "₹4,50,000",
 *    "$2k–$5k / project"). There is no separate numeric amount + currency code column
 *    in the database. Therefore these utilities are helpers for *display* and for
 *    constructing localised seed / placeholder values — they do NOT perform numeric
 *    conversion between currencies.
 *
 * 2. "Explicit currency wins over location" — if a stored string already contains
 *    a currency symbol, that value should be displayed as-is by callers.
 *    We never silently rewrite a value entered by a real user.
 *
 * 3. No exchange-rate conversion is performed or implied anywhere in this file.
 */

/** Supported currency codes. */
export type SupportedCurrency = "INR" | "USD";

/** A structured monetary amount — useful when building seed data programmatically. */
export type MoneyAmount = {
  /** Numeric lower bound. */
  min: number;
  /** Upper bound of a range; omit for a single value. */
  max?: number;
  /** ISO 4217 currency code. */
  currency: SupportedCurrency;
  /** Optional descriptive suffix, e.g. "/ project". */
  suffix?: string;
};

const CURRENCY_META: Record<SupportedCurrency, { locale: string }> = {
  INR: { locale: "en-IN" },
  USD: { locale: "en-US" },
};

/**
 * Format a single numeric amount in the canonical style for a given currency.
 *
 * INR → Indian digit grouping  e.g. ₹4,50,000
 * USD → Western digit grouping e.g. $4,500
 *
 * Fractional digits are omitted because creative rates are typically whole numbers.
 */
export function formatMoneyValue(
  amount: number,
  currency: SupportedCurrency
): string {
  const { locale } = CURRENCY_META[currency];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a {@link MoneyAmount} into a human-readable string.
 *
 * Examples:
 *   { min: 150000, max: 400000, currency: "INR", suffix: "/ project" }
 *   → "₹1,50,000–₹4,00,000 / project"
 *
 *   { min: 2500, max: 8000, currency: "USD", suffix: "/ project" }
 *   → "$2,500–$8,000 / project"
 */
export function formatMoney(amount: MoneyAmount): string {
  const lo = formatMoneyValue(amount.min, amount.currency);
  if (amount.max !== undefined) {
    const hi = formatMoneyValue(amount.max, amount.currency);
    const base = `${lo}–${hi}`;
    return amount.suffix ? `${base} ${amount.suffix}` : base;
  }
  return amount.suffix ? `${lo} ${amount.suffix}` : lo;
}

/**
 * Detect the dominant currency in a free-text monetary string.
 *
 * Returns "INR" if the string contains ₹ or the word "inr" (case-insensitive).
 * Returns "USD" if the string contains $ or the word "usd" (case-insensitive).
 * Returns null if no currency signal is found.
 */
export function detectCurrency(value: string): SupportedCurrency | null {
  if (/₹|\binr\b/i.test(value)) return "INR";
  if (/\$|\busd\b/i.test(value)) return "USD";
  return null;
}

/**
 * Return true when a free-text monetary string already has an explicit currency
 * symbol embedded. Callers should display such strings as-is without further
 * formatting or replacement.
 */
export function hasExplicitCurrency(value: string): boolean {
  return detectCurrency(value) !== null;
}
