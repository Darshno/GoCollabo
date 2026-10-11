import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the application base URL for redirects.
 * In production, uses VITE_APP_URL if set, otherwise falls back to window.location.origin.
 * Strips trailing slashes to avoid malformed redirect URLs (e.g., https://domain.com//?reset=1).
 * This ensures auth redirects work correctly in deployed environments like Render.
 */
export function getAppUrl(): string {
  const appUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL)
    ? String(import.meta.env.VITE_APP_URL).trim()
    : "";

  if (appUrl) {
    return appUrl.replace(/\/+$/, "");
  }

  // Fallback to current origin (works for local development and client browser)
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}
