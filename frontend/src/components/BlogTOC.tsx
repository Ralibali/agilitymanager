import { List } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length < 2) return;
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost heading currently in view
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -65% 0px', threshold: [0, 1] },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveId(id);
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
        {items.map((item, i) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id} className="flex gap-2">
              <span
                className={`tabular-nums min-w-[1.25rem] font-semibold transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-primary/60'
                }`}
              >
                {i + 1}.
              </span>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={`relative transition-colors duration-200 ${
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-foreground/80 hover:text-primary'
                }`}
              >
                {item.text}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
