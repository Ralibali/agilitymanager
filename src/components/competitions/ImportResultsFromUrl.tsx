import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Link, Loader2, Sparkles, Code, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import type { Dog } from '@/types';

interface HistoricalDogResult {
  dog_name: string;
  reg_name: string;
  reg_nr: string;
  breed: string;
  handler: string;
  results: any[];
  searched_dog: string;
  dog_id: string;
}

interface Props {
  dogs: Dog[];
  userId: string;
  onImported: (result: HistoricalDogResult) => void;
}

type ImportMode = 'url' | 'paste';
type ImportMethod = 'visual-ai' | 'html-parse';

function parseTableText(text: string): any[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Try tab-separated first, then multiple spaces
  const detectSeparator = (line: string) => {
    if (line.includes('\t')) return '\t';
    return /\s{2,}/;
  };

  const sep = detectSeparator(lines[0]);
  const headerLine = lines[0].split(sep).map(h => h.trim().toLowerCase());

  // Map Swedish column names
  const colMap: Record<string, string[]> = {
    date: ['datum', 'date'],
    competition: ['arrangör', 'tävling', 'competition', 'arrangemang', 'arr'],
    discipline: ['gren', 'discipline', 'lopp'],
    class: ['klass', 'class'],
    placement: ['plac', 'placering', 'placement'],
    faults: ['tot. fel', 'tot fel', 'fel', 'faults'],
    merit: ['merit'],
    speed: ['m/s', 'hastighet', 'speed'],
  };

  const getColIndex = (keywords: string[]) =>
    headerLine.findIndex(h => keywords.some(k => h.includes(k)));

  const indices = Object.fromEntries(
    Object.entries(colMap).map(([key, keywords]) => [key, getColIndex(keywords)])
  );

  // Need at least date column
  if (indices.date < 0) return [];

  const results: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map(v => v.trim());
    const dateStr = indices.date >= 0 ? vals[indices.date] : '';
    if (!dateStr || !/\d{4}/.test(dateStr)) continue;

    const meritVal = indices.merit >= 0 ? vals[indices.merit] || '' : '';
    const faultStr = indices.faults >= 0 ? vals[indices.faults] || '' : '';
    const placStr = indices.placement >= 0 ? vals[indices.placement] || '' : '';

    let totalFaults: number | null = null;
    if (faultStr) {
      const parsed = parseInt(faultStr);
      totalFaults = isNaN(parsed) ? null : parsed;
    }

    const passed = meritVal ? !['ej', 'disk', '-'].includes(meritVal.toLowerCase().trim()) : true;
    const disqualified = meritVal ? meritVal.toLowerCase().includes('disk') : false;

    let disc = indices.discipline >= 0 ? vals[indices.discipline] || '' : '';
    if (disc.toLowerCase().includes('hopp') || disc.toLowerCase().includes('jump')) disc = 'Hopp';
    else if (disc.toLowerCase().includes('agility') || !disc) disc = 'Agility';

    results.push({
      date: dateStr,
      competition: indices.competition >= 0 ? vals[indices.competition] || '' : '',
      discipline: disc,
      class: indices.class >= 0 ? vals[indices.class] || '' : '',
      size: '',
      placement: placStr ? parseInt(placStr) || null : null,
      time_sec: indices.speed >= 0 ? parseFloat((vals[indices.speed] || '').replace(',', '.')) || null : null,
      faults: totalFaults,
      passed,
      disqualified,
    });
  }

  return results;
}

export default function ImportResultsFromUrl({ dogs, userId, onImported }: Props) {
  const [url, setUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [selectedDogId, setSelectedDogId] = useState<string>(dogs.length === 1 ? dogs[0].id : '');
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<ImportMethod>('visual-ai');
  const [mode, setMode] = useState<ImportMode>('url');

  const handleUrlImport = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast.error('Klistra in en URL från agilitydata.se');
      return;
    }
    if (!trimmedUrl.startsWith('https://agilitydata.se/')) {
      toast.error('URL:en måste vara från agilitydata.se');
      return;
    }
    if (!selectedDogId) {
      toast.error('Välj vilken hund resultaten tillhör');
      return;
    }

    setLoading(true);
    try {
      let data: any;
      let error: any;

      if (method === 'visual-ai') {
        const res = await supabase.functions.invoke('visual-extract-results', {
          body: { url: trimmedUrl },
        });
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase.functions.invoke('search-handler-results', {
          body: { dogUrl: trimmedUrl },
        });
        data = res.data;
        error = res.error;
      }

      if (error || !data?.success || !data.data) {
        throw new Error(data?.error || 'Kunde inte hämta resultat');
      }

      const dog = dogs.find(d => d.id === selectedDogId);
      const result: HistoricalDogResult = {
        ...data.data,
        searched_dog: dog?.name || data.data.dog_name,
        dog_id: selectedDogId,
      };

      await cacheResult(result);
      onImported(result);
      const methodLabel = data.method === 'visual-ai' ? ' (AI)' : '';
      toast.success(`Importerade ${result.results.length} resultat för ${result.dog_name || dog?.name}${methodLabel}`);
      setUrl('');
    } catch (e: any) {
      toast.error(e.message || 'Import misslyckades');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteImport = async () => {
    if (!pasteText.trim()) {
      toast.error('Klistra in tabelldata');
      return;
    }
    if (!selectedDogId) {
      toast.error('Välj vilken hund resultaten tillhör');
      return;
    }

    setLoading(true);
    try {
      const parsed = parseTableText(pasteText);
      if (parsed.length === 0) {
        throw new Error('Kunde inte tolka tabellen. Kontrollera att du kopierat hela resultattabellen inkl. rubriker.');
      }

      const dog = dogs.find(d => d.id === selectedDogId);
      const result: HistoricalDogResult = {
        dog_name: dog?.name || '',
        reg_name: '',
        reg_nr: '',
        breed: dog?.breed || '',
        handler: '',
        results: parsed,
        searched_dog: dog?.name || '',
        dog_id: selectedDogId,
      };

      await cacheResult(result);
      onImported(result);
      toast.success(`Importerade ${parsed.length} resultat från inklistrad text`);
      setPasteText('');
    } catch (e: any) {
      toast.error(e.message || 'Import misslyckades');
    } finally {
      setLoading(false);
    }
  };

  const cacheResult = async (result: HistoricalDogResult) => {
    await supabase.from('cached_dog_results').upsert(
      {
        user_id: userId,
        dog_id: result.dog_id,
        dog_name: result.dog_name,
        reg_name: result.reg_name,
        reg_nr: result.reg_nr,
        breed: result.breed,
        handler: result.handler,
        results: result.results as any,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,dog_id' }
    );
  };

  return (
    <div className="bg-card rounded-xl p-3 border border-border shadow-card space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Link size={14} className="text-primary" />
        <h4 className="text-xs font-semibold text-foreground">Importera resultat</h4>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setMode('url')}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors ${
            mode === 'url'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Link size={10} /> Via URL
        </button>
        <button
          type="button"
          onClick={() => setMode('paste')}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors ${
            mode === 'paste'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <ClipboardPaste size={10} /> Klistra in tabell
        </button>
      </div>

      {mode === 'url' ? (
        <>
          <p className="text-[10px] text-muted-foreground">
            Klistra in länken till hundens resultatsida på{' '}
            <a href="https://agilitydata.se/resultat/soek-hund/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
              agilitydata.se <ExternalLink size={9} />
            </a>
          </p>
          <Input
            placeholder="https://agilitydata.se/resultat/hund-resultat/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="h-8 text-xs"
            disabled={loading}
          />
          {/* Method toggle for URL mode */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMethod('visual-ai')}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                method === 'visual-ai'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Sparkles size={10} /> AI-extraktion
            </button>
            <button
              type="button"
              onClick={() => setMethod('html-parse')}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                method === 'html-parse'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Code size={10} /> HTML-parsning
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[10px] text-muted-foreground">
            Markera och kopiera resultattabellen från agilitydata.se (inkl. rubriker) och klistra in nedan.
          </p>
          <Textarea
            placeholder={"Datum\tArrangör\tGren\tKlass\tPlac\tTot. fel\tMerit\n2025-01-15\tClub ABC\tAgility\tK2\t3\t0\tGodkänd"}
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            className="text-xs min-h-[80px] font-mono"
            disabled={loading}
          />
        </>
      )}

      {dogs.length > 1 && (
        <Select value={selectedDogId} onValueChange={setSelectedDogId} disabled={loading}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Välj hund..." />
          </SelectTrigger>
          <SelectContent>
            {dogs.map(dog => (
              <SelectItem key={dog.id} value={dog.id}>{dog.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        size="sm"
        className="w-full gap-1.5 text-xs"
        onClick={mode === 'url' ? handleUrlImport : handlePasteImport}
        disabled={loading || (mode === 'url' ? !url.trim() : !pasteText.trim()) || !selectedDogId}
      >
        {loading ? (
          <><Loader2 size={12} className="animate-spin" /> {mode === 'url' && method === 'visual-ai' ? 'AI analyserar sidan...' : 'Importerar...'}</>
        ) : (
          <>{mode === 'url' ? <Link size={12} /> : <ClipboardPaste size={12} />} Importera resultat</>
        )}
      </Button>
    </div>
  );
}
