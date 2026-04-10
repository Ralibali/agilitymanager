import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip HTML tags, incomplete tags, and decode common entities from a string */
export function stripHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    // Remove complete HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove incomplete/broken tags anywhere (opening < without closing >)
    .replace(/<[^>]*$/g, '')
    // Also remove incomplete tags that appear before normal text (e.g. "<i class='...' text")
    .replace(/<[^>]{0,500}(?=[A-Z0-9])/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}
