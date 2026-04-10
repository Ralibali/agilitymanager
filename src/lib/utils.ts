import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip HTML tags, incomplete tags, and decode common entities from a string */
export function stripHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    // Remove everything from an opening < that may not close (incomplete tags like <i class='...' title='...')
    .replace(/<[^>]*$/, '')
    // Remove complete HTML tags
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
