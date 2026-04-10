const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ResultEntry {
  placement: number | null;
  handler_name: string;
  dog_name: string;
  time_sec: number | null;
  faults: number | null;
  size_class: string;
  passed: boolean;
  disqualified: boolean;
}

interface CompetitionResults {
  competition_name: string;
  date: string;
  total_starters: number;
  results: ResultEntry[];
  source_url: string;
  fetched_at: string;
}

// Simple in-memory cache (max 1 hour)
const cache = new Map<string, { data: CompetitionResults; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function cleanCache() {
  const now = Date.now();
  for (const [key, val] of cache) {
    if (now - val.ts > CACHE_TTL) cache.delete(key);
  }
}

function parseResults(markdown: string, sourceUrl: string): CompetitionResults {
  const lines = markdown.split('\n').filter(l => l.trim());
  
  // Try to extract competition name from heading
  let competitionName = 'Tävlingsresultat';
  let date = '';
  
  for (const line of lines) {
    if (line.startsWith('#')) {
      const cleaned = line.replace(/^#+\s*/, '').trim();
      if (cleaned.length > 3) {
        competitionName = cleaned;
        break;
      }
    }
  }

  // Try to find a date pattern
  const dateMatch = markdown.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) date = dateMatch[1];

  // Parse table rows - look for markdown tables
  const results: ResultEntry[] = [];
  const tableLines = lines.filter(l => l.includes('|'));
  
  // Find the header row to understand column positions
  let headerIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < tableLines.length; i++) {
    const cells = tableLines[i].split('|').map(c => c.trim()).filter(Boolean);
    const lower = cells.map(c => c.toLowerCase());
    if (lower.some(c => c.includes('förare') || c.includes('namn') || c.includes('handler')) &&
        lower.some(c => c.includes('hund') || c.includes('dog') || c.includes('tid') || c.includes('time'))) {
      headerIdx = i;
      headers = lower;
      break;
    }
  }

  if (headerIdx >= 0) {
    // Skip separator row (---) 
    const dataStart = headerIdx + 2;
    for (let i = dataStart; i < tableLines.length; i++) {
      const cells = tableLines[i].split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length < 2) continue;
      if (cells[0].includes('---')) continue;

      // Map columns by header names
      const getCol = (keywords: string[]) => {
        const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
        return idx >= 0 && idx < cells.length ? cells[idx] : '';
      };

      const placStr = getCol(['plac', 'placement', '#']);
      const handler = getCol(['förare', 'handler', 'namn', 'name']);
      const dog = getCol(['hund', 'dog']);
      const timeStr = getCol(['tid', 'time']);
      const faultStr = getCol(['fel', 'fault', 'error']);
      const sizeStr = getCol(['storl', 'size', 'klass']);
      const passedStr = getCol(['godkänd', 'passed', 'ok']);
      const dqStr = getCol(['disk', 'dq', 'disq']);

      if (!handler && !dog) continue;

      const placement = placStr ? parseInt(placStr) || null : null;
      const time_sec = timeStr ? parseFloat(timeStr.replace(',', '.')) || null : null;
      const faults = faultStr ? parseInt(faultStr) || 0 : null;

      results.push({
        placement,
        handler_name: handler || '-',
        dog_name: dog || '-',
        time_sec,
        faults,
        size_class: sizeStr || '-',
        passed: passedStr ? passedStr.toLowerCase() !== 'nej' : !dqStr,
        disqualified: dqStr ? dqStr.toLowerCase() === 'ja' || dqStr.toLowerCase() === 'yes' : false,
      });
    }
  }

  // If no table found, try line-by-line parsing for common formats
  if (results.length === 0) {
    // Try to parse numbered list format: "1. Anna Svensson - Fido - 34.5s - 0 fel"
    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s+(.+?)\s*[-–]\s+(.+?)\s*[-–]\s+([\d.,]+)\s*s/i);
      if (match) {
        results.push({
          placement: parseInt(match[1]),
          handler_name: match[2].trim(),
          dog_name: match[3].trim(),
          time_sec: parseFloat(match[4].replace(',', '.')),
          faults: 0,
          size_class: '-',
          passed: true,
          disqualified: false,
        });
      }
    }
  }

  return {
    competition_name: competitionName,
    date,
    total_starters: results.length,
    results,
    source_url: sourceUrl,
    fetched_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL krävs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate it's an agilitydata.se URL
    const parsed = new URL(url);
    if (!parsed.hostname.includes('agilitydata.se')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Endast agilitydata.se-länkar stöds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    cleanCache();
    const cached = cache.get(url);
    if (cached) {
      return new Response(
        JSON.stringify({ success: true, data: cached.data, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl är inte konfigurerat' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping agilitydata.se:', url);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', data);
      return new Response(
        JSON.stringify({ success: false, error: `Kunde inte hämta resultat (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = data?.data?.markdown || data?.markdown || '';
    if (!markdown) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ingen data hittades på sidan' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = parseResults(markdown, url);

    // Cache result
    cache.set(url, { data: results, ts: Date.now() });

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Kunde inte hämta resultat just nu' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
