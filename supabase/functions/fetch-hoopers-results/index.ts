const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface HoopersResult {
  placement: number | null;
  handler: string;
  dog_name: string;
  dog_reg_name: string;
  breed: string;
  points: number;
  faults: number;
  time_sec: number | null;
  start_nr: number | null;
  klass: string;
  lopp: number;
  size: string;
  disqualified: boolean;
}

interface CompetitionInfo {
  name: string;
  location: string;
  date: string;
  type: string;
  club: string;
  organizer: string;
  results: HoopersResult[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function parseTime(timeStr: string): number | null {
  if (!timeStr || timeStr === '-' || timeStr === '') return null;
  const cleaned = timeStr.replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parsePlacement(text: string): number | null {
  const match = text.match(/Placering:\s*(\d+)/);
  if (match) return parseInt(match[1]);
  const diskMatch = text.match(/Diskvalificerad|DQ|Disk/i);
  if (diskMatch) return null;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, search_handler, search_dog } = await req.json();

    // Mode 1: Fetch results from a specific competition URL
    if (url) {
      const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (!firecrawlKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['html'],
          onlyMainContent: true,
          waitFor: 2000,
        }),
      });

      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok) {
        console.error('Firecrawl error:', scrapeData);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch page' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const html = scrapeData?.data?.html || scrapeData?.html || '';
      const results = parseCompetitionHtml(html);

      // If search filters provided, filter results
      let filtered = results.results;
      if (search_handler || search_dog) {
        filtered = filtered.filter(r => {
          const handlerMatch = !search_handler || r.handler.toLowerCase().includes(search_handler.toLowerCase());
          const dogMatch = !search_dog || r.dog_name.toLowerCase().includes(search_dog.toLowerCase()) || r.dog_reg_name.toLowerCase().includes(search_dog.toLowerCase());
          return handlerMatch || dogMatch;
        });
      }

      return new Response(
        JSON.stringify({ success: true, competition: { ...results, results: filtered } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode 2: Search results list page for competitions with a specific handler/dog
    if (search_handler || search_dog) {
      const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (!firecrawlKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch multiple years of results
      const years = [2026, 2025, 2024];
      const allCompetitionUrls: string[] = [];

      for (const year of years) {
        const listRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: `https://shoktavling.se/?page=resultat&y=${year}`,
            formats: ['html'],
            onlyMainContent: true,
          }),
        });

        const listData = await listRes.json();
        const listHtml = listData?.data?.html || listData?.html || '';
        
        // Extract competition URLs
        const urlRegex = /href="(https:\/\/shoktavling\.se\/\?page=showres&amp;arr=[^"]+)"/g;
        let match;
        while ((match = urlRegex.exec(listHtml)) !== null) {
          allCompetitionUrls.push(match[1].replace(/&amp;/g, '&'));
        }
      }

      // Fetch each competition and search for the handler/dog (limit to avoid timeouts)
      const maxComps = 10;
      const foundResults: Array<{ competition: CompetitionInfo; matches: HoopersResult[] }> = [];

      for (const compUrl of allCompetitionUrls.slice(0, maxComps)) {
        try {
          const compRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: compUrl,
              formats: ['html'],
              onlyMainContent: true,
              waitFor: 2000,
            }),
          });

          const compData = await compRes.json();
          const compHtml = compData?.data?.html || compData?.html || '';
          const parsed = parseCompetitionHtml(compHtml);

          const matches = parsed.results.filter(r => {
            const handlerMatch = search_handler && r.handler.toLowerCase().includes(search_handler.toLowerCase());
            const dogMatch = search_dog && (r.dog_name.toLowerCase().includes(search_dog.toLowerCase()) || r.dog_reg_name.toLowerCase().includes(search_dog.toLowerCase()));
            return handlerMatch || dogMatch;
          });

          if (matches.length > 0) {
            foundResults.push({ competition: { ...parsed, results: [] }, matches });
          }
        } catch (e) {
          console.error('Error fetching competition:', compUrl, e);
        }
      }

      return new Response(
        JSON.stringify({ success: true, found: foundResults, total_searched: Math.min(allCompetitionUrls.length, maxComps) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Provide url or search_handler/search_dog' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseCompetitionHtml(html: string): CompetitionInfo {
  const info: CompetitionInfo = {
    name: '', location: '', date: '', type: '', club: '', organizer: '', results: [],
  };

  // Parse competition header
  const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/s);
  if (h2Match) {
    const headerText = stripHtml(h2Match[1]).replace(/\s+/g, ' ').trim();
    // "Resultat för officell tävling - Mars hoopen - Kungsör - 2026-03-08"
    const parts = headerText.split(' - ').map(s => s.trim());
    if (parts.length >= 4) {
      info.type = parts[0].replace('Resultat för ', '');
      info.name = parts[1];
      info.location = parts[2];
      info.date = parts[3];
    } else if (parts.length === 3) {
      info.type = parts[0].replace('Resultat för ', '');
      info.name = parts[1];
      // Try to extract date from last part
      const dateMatch = parts[2].match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        info.date = dateMatch[1];
        info.location = parts[2].replace(dateMatch[1], '').trim();
      }
    }
  }

  // Parse club/organizer
  const clubMatch = html.match(/Arrangerande klubb:\s*([^<]+)/);
  if (clubMatch) info.club = clubMatch[1].trim();
  const orgMatch = html.match(/Anordnare:\s*([^<]+)/);
  if (orgMatch) info.organizer = orgMatch[1].trim();

  // Parse each lopp section
  // Pattern: <details> with <summary> containing class/lopp/size info, followed by <ul> with results
  const detailsRegex = /<details[^>]*>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g;
  let detailsMatch;
  
  while ((detailsMatch = detailsRegex.exec(html)) !== null) {
    const summaryText = stripHtml(detailsMatch[1]);
    const content = detailsMatch[2];

    // Parse "Startklass - Lopp 1 Small"
    const classMatch = summaryText.match(/(Startklass|Klass \d)\s*-\s*Lopp\s*(\d+)\s*(Small|Large)/i);
    if (!classMatch) continue;

    const klass = classMatch[1];
    const lopp = parseInt(classMatch[2]);
    const size = classMatch[3];

    // Parse individual results within this section
    const resultBoxRegex = /<li>\s*<div class="resultat_box">([\s\S]*?)<\/div>\s*<\/div>\s*<\/li>/g;
    let resultMatch;

    while ((resultMatch = resultBoxRegex.exec(content)) !== null) {
      const box = resultMatch[1];

      const placText = box.match(/class="placering"[^>]*>([\s\S]*?)<\/div>/);
      const placement = placText ? parsePlacement(stripHtml(placText[1])) : null;
      const disqualified = placText ? /Diskvalificerad|DQ|Disk/i.test(stripHtml(placText[1])) : false;

      const pointsMatch = box.match(/Poäng:\s*(\d+)/);
      const points = pointsMatch ? parseInt(pointsMatch[1]) : 0;

      const faultsMatch = box.match(/Fel:\s*(\d+)/);
      const faults = faultsMatch ? parseInt(faultsMatch[1]) : 0;

      const timeMatch = box.match(/Tid:\s*([\d,\.]+)/);
      const time_sec = timeMatch ? parseTime(timeMatch[1]) : null;

      const startNrMatch = box.match(/Startnr:\s*(\d+)/);
      const start_nr = startNrMatch ? parseInt(startNrMatch[1]) : null;

      const handlerMatch = box.match(/class="forare"[^>]*>Förare:\s*([^<]+)/);
      const handler = handlerMatch ? handlerMatch[1].trim() : '';

      const dogMatch = box.match(/class="hundnamn"[^>]*>Hund:\s*([^<]+)/);
      const dog_reg_name = dogMatch ? dogMatch[1].trim() : '';

      const nameMatch = box.match(/class="namn"[^>]*>([^<]+)/);
      const dog_name = nameMatch ? nameMatch[1].trim().split('&amp;').pop()?.trim() || '' : '';

      const breedMatch = box.match(/class="ras"[^>]*>Ras:\s*([^<]+)/);
      const breed = breedMatch ? breedMatch[1].trim() : '';

      info.results.push({
        placement, handler, dog_name, dog_reg_name, breed,
        points, faults, time_sec, start_nr, klass, lopp, size, disqualified,
      });
    }
  }

  return info;
}
