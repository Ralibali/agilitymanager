import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Link, Loader2 } from 'lucide-react';
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

export default function ImportResultsFromUrl({ dogs, userId, onImported }: Props) {
  const [url, setUrl] = useState('');
  const [selectedDogId, setSelectedDogId] = useState<string>(dogs.length === 1 ? dogs[0].id : '');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
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
      const { data, error } = await supabase.functions.invoke('search-handler-results', {
        body: { dogUrl: trimmedUrl },
      });

      if (error || !data?.success || !data.data) {
        throw new Error(data?.error || 'Kunde inte hämta resultat');
      }

      const dog = dogs.find(d => d.id === selectedDogId);
      const result: HistoricalDogResult = {
        ...data.data,
        searched_dog: dog?.name || data.data.dog_name,
        dog_id: selectedDogId,
      };

      // Cache results
      await supabase.from('cached_dog_results').upsert(
        {
          user_id: userId,
          dog_id: selectedDogId,
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

      onImported(result);
      toast.success(`Importerade ${result.results.length} resultat för ${result.dog_name || dog?.name}`);
      setUrl('');
    } catch (e: any) {
      toast.error(e.message || 'Import misslyckades');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-3 border border-border shadow-card space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Link size={14} className="text-primary" />
        <h4 className="text-xs font-semibold text-foreground">Importera via URL</h4>
      </div>
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
        onClick={handleImport}
        disabled={loading || !url.trim() || !selectedDogId}
      >
        {loading ? (
          <><Loader2 size={12} className="animate-spin" /> Hämtar resultat...</>
        ) : (
          <><Link size={12} /> Importera resultat</>
        )}
      </Button>
    </div>
  );
}
