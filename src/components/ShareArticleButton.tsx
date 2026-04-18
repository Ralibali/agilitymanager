import { useState } from 'react';
import { Share2, Check, Copy, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareArticleButtonProps {
  title: string;
  url: string;
  excerpt?: string;
}

/**
 * Dela artikel-knapp med Web Share API på mobil och kopiera-länk-fallback på desktop.
 * Visar även snabbval för Facebook och X (Twitter) som komplement.
 */
export function ShareArticleButton({ title, url, excerpt }: ShareArticleButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleNativeShare = async () => {
    // Web Share API – framförallt mobil
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: excerpt,
          url,
        });
        return;
      } catch (err) {
        // AbortError = användaren stängde share-sheet, ignorera tyst
        if ((err as Error).name === 'AbortError') return;
        // Fallback till kopiera om share misslyckas
      }
    }
    // Desktop / share saknas → kopiera länk
    await handleCopy();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Länk kopierad!', { description: 'Klistra in var du vill dela artikeln.' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Kunde inte kopiera länken');
    }
  };

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-card">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary/10 text-secondary">
          <Share2 size={18} />
        </div>
        <div>
          <h3 className="font-display font-bold text-foreground">Dela artikeln</h3>
          <p className="text-xs text-muted-foreground">Hjälp andra hundförare hitta hit</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleNativeShare}
          className="gradient-primary text-primary-foreground font-semibold gap-2 flex-1 sm:flex-none"
        >
          <Share2 size={16} />
          Dela
        </Button>
        <Button
          variant="outline"
          onClick={handleCopy}
          className="gap-2"
          aria-label="Kopiera länk"
        >
          {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
          {copied ? 'Kopierad' : 'Kopiera länk'}
        </Button>
        <Button
          variant="outline"
          size="icon"
          asChild
          aria-label="Dela på Facebook"
        >
          <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
            <Facebook size={16} />
          </a>
        </Button>
        <Button
          variant="outline"
          size="icon"
          asChild
          aria-label="Dela på X"
        >
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </Button>
      </div>
    </div>
  );
}
