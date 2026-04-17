import { useParams, useNavigate, Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPostBySlug, fetchBlogPosts, type BlogPost } from '@/lib/blogData';
import { SEO, buildArticleSchema, buildBreadcrumbSchema } from '@/components/SEO';
import { BLOG_FAQS, buildFaqJsonLd } from '@/lib/blogFaqs';
import { BlogFAQ } from '@/components/BlogFAQ';
import { BlogTOC, extractTOCItems, slugifyHeading } from '@/components/BlogTOC';

// Parse inline markdown: **bold** and [link](/url)
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold** or [text](url)
  const regex = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={`b${i}`} className="text-foreground">{match[1]}</strong>);
    } else if (match[2] && match[3]) {
      const isExternal = match[3].startsWith('http');
      parts.push(
        isExternal
          ? <a key={`a${i}`} href={match[3]} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">{match[2]}</a>
          : <Link key={`a${i}`} to={match[3]} className="text-primary underline hover:text-primary/80">{match[2]}</Link>
      );
    }
    lastIndex = match.index + match[0].length;
    i++;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

// Simple markdown-ish renderer for our content
function renderContent(content: string) {
  const lines = content.trim().split('\n');
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  let tableRows: string[][] = [];
  let inTable = false;
  const usedH2Ids = new Set<string>();

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 text-foreground/90 text-sm leading-relaxed mb-4">
          {listItems.map((item, i) => (
            <li key={i}>{parseInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 1) {
      const [header, ...rows] = tableRows;
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto mb-4">
          <table className="w-full text-sm border border-border rounded-lg">
            <thead>
              <tr className="bg-muted">
                {header.map((cell, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-foreground">{cell}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {row.map((cell, j) => <td key={j} className="px-3 py-2 text-muted-foreground">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const cells = trimmed.split('|').filter(Boolean).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) continue; // separator row
      tableRows.push(cells);
      inTable = true;
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      flushList();
      const rawText = trimmed.slice(3);
      const cleanText = rawText.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
      let id = slugifyHeading(cleanText);
      let suffix = 2;
      const baseId = id;
      while (usedH2Ids.has(id)) {
        id = `${baseId}-${suffix++}`;
      }
      usedH2Ids.add(id);
      elements.push(<h2 id={id} key={`h2-${elements.length}`} className="font-display font-bold text-foreground text-lg mt-6 mb-3 scroll-mt-20">{parseInline(rawText)}</h2>);
    } else if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={`h3-${elements.length}`} className="font-display font-semibold text-foreground mt-4 mb-2">{parseInline(trimmed.slice(4))}</h3>);
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      const text = trimmed.replace(/^\d+\.\s/, '');
      elements.push(
        <div key={`ol-${elements.length}`} className="flex gap-2 text-sm text-foreground/90 mb-1.5 ml-1">
          <span className="text-primary font-semibold">{trimmed.match(/^\d+/)![0]}.</span>
          <span>{parseInline(text)}</span>
        </div>
      );
    } else if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p key={`p-${elements.length}`} className="text-sm text-foreground/90 leading-relaxed mb-3">{parseInline(trimmed)}</p>);
    }
  }

  flushList();
  flushTable();
  return elements;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | undefined>(undefined);
  const [otherPosts, setOtherPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([fetchPostBySlug(slug), fetchBlogPosts()]).then(([p, all]) => {
      setPost(p);
      setOtherPosts(all.filter(a => a.slug !== slug).slice(0, 3));
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 pt-8 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display font-bold text-foreground text-xl mb-2">Artikeln hittades inte</h1>
          <Button variant="ghost" onClick={() => navigate('/blogg')}>← Tillbaka till kunskapsbanken</Button>
        </div>
      </div>
    );
  }

  const canonicalPath = `/blogg/${post.slug}`;
  const canonicalUrl = `https://agilitymanager.se${canonicalPath}`;
  // SEO-fält faller tillbaka till UI-fält om de inte är ifyllda i databasen.
  const seoTitle = post.seoTitle?.trim() || post.title;
  const seoDescription = post.seoDescription?.trim() || post.excerpt;
  const faqSection = BLOG_FAQS[post.slug];

  const jsonLdSchemas: Record<string, unknown>[] = [
    buildArticleSchema({
      title: seoTitle,
      description: seoDescription,
      url: canonicalUrl,
      publishedTime: post.date,
      modifiedTime: (post as { updatedAt?: string }).updatedAt ?? post.date,
      author: post.author,
      type: "BlogPosting",
      section: post.category,
    }),
    buildBreadcrumbSchema([
      { name: 'Hem', url: '/' },
      { name: 'Kunskapsbank', url: '/blogg' },
      { name: post.title, url: canonicalPath },
    ]),
  ];
  if (faqSection) {
    jsonLdSchemas.push(buildFaqJsonLd(faqSection));
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonicalPath}
        ogType="article"
        article={{
          publishedTime: post.date,
          author: post.author,
          section: post.category,
        }}
        jsonLd={jsonLdSchemas}
      />

      <article className="px-4 pt-8 pb-12 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/blogg')} className="mb-6 -ml-2 text-muted-foreground">
          <ArrowLeft size={16} className="mr-1" /> Kunskapsbank
        </Button>

        <header className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{post.category}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> {post.readTime} min läsning</span>
          </div>
          <h1 className="font-display font-bold text-foreground text-2xl leading-tight mb-2">{post.title}</h1>
          <p className="text-muted-foreground text-sm">{post.excerpt}</p>
        </header>

        <div className="bg-card rounded-xl p-5 sm:p-8 shadow-card">
          {renderContent(post.content)}
        </div>
      </article>

      {/* FAQ – endast på artiklar med definierad FAQ-data */}
      {faqSection && <BlogFAQ section={faqSection} />}

      {/* Related */}
      <section className="px-4 pb-8 max-w-2xl mx-auto">
        <h2 className="font-display font-semibold text-foreground mb-4">Fler artiklar</h2>
        <div className="space-y-3">
          {otherPosts.map(p => (
            <Link key={p.slug} to={`/blogg/${p.slug}`} className="block bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow">
              <h3 className="font-display font-semibold text-foreground text-sm mb-1">{p.title}</h3>
              <p className="text-xs text-muted-foreground">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-16 max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl p-6 shadow-card text-center">
          <h2 className="font-display font-bold text-foreground mb-2">Redo att börja träna smartare?</h2>
          <p className="text-sm text-muted-foreground mb-4">Skapa ett gratis konto och använd alla verktyg i AgilityManager.</p>
          <Button className="gradient-primary text-primary-foreground font-semibold gap-2" onClick={() => navigate('/auth')}>
            Kom igång gratis <ArrowRight size={16} />
          </Button>
        </div>
      </section>
    </div>
  );
}
