import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the application base URL for redirects.
 * In production, uses VITE_APP_URL if set, otherwise falls back to window.location.origin.
 * This ensures auth redirects work correctly in deployed environments.
 */
export function getAppUrl(): string {
  const appUrl = import.meta.env.VITE_APP_URL?.trim();
  if (appUrl) {
    return appUrl;
  }
  
  // Fallback to current origin (works for local development)
  return window.location.origin;
}
