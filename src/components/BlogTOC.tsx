import { List } from 'lucide-react';

export interface TOCItem {
  id: string;
  text: string;
}

/**
 * Slugify a heading text into a URL-friendly anchor id.
 * Handles Swedish characters (å, ä, ö).
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Extract H2 headings from markdown content for the TOC.
 */
export function extractTOCItems(content: string): TOCItem[] {
  const items: TOCItem[] = [];
  const lines = content.split('\n');
  const usedIds = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      // Strip inline markdown (bold, links) for clean TOC text
      const rawText = trimmed.slice(3);
      const cleanText = rawText
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim();

      let id = slugifyHeading(cleanText);
      // Ensure uniqueness
      let suffix = 2;
      const baseId = id;
      while (usedIds.has(id)) {
        id = `${baseId}-${suffix++}`;
      }
      usedIds.add(id);
      items.push({ id, text: cleanText });
    }
  }
  return items;
}

interface BlogTOCProps {
  items: TOCItem[];
}

export function BlogTOC({ items }: BlogTOCProps) {
  if (items.length < 2) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
      // Update URL hash without jump
      history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <nav
      aria-label="Innehållsförteckning"
      className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-6 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <List size={16} className="text-primary" />
        <h2 className="font-display font-semibold text-foreground text-sm">
          Innehåll
        </h2>
      </div>
      <ol className="space-y-1.5 text-sm">
        {items.map((item, i) => (
          <li key={item.id} className="flex gap-2">
            <span className="text-primary font-semibold tabular-nums min-w-[1.25rem]">
              {i + 1}.
            </span>
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className="text-foreground/80 hover:text-primary hover:underline transition-colors"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
