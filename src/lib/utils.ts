import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse an ISO date string (YYYY-MM-DD) without timezone conversion
 * This prevents dates from shifting due to UTC interpretation
 */
export function parseDateSafe(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
