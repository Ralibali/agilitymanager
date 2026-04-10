const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DogResult {
  date: string;
  competition: string;
  discipline: string;
  class: string;
  size: string;
  placement: number | null;
  time_sec: number | null;
  faults: number | null;
  passed: boolean;
  disqualified: boolean;
}

interface DogSearchResult {
  dog_name: string;
  reg_name: string;
  reg_nr: string;
  breed: string;
  handler: string;
  results: DogResult[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { firstName, lastName, dogName } = await req.json();

    if (!firstName && !lastName && !dogName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ange minst förnamn/efternamn eller hundnamn' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl är inte konfigurerat' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching agilitydata.se: ${firstName} ${lastName}, dog: ${dogName || 'any'}`);

    // Step 1: Search for the dog, click the first result, and scrape the results page
    const actions: any[] = [
      { type: 'wait', milliseconds: 2000 },
    ];

    if (dogName) {
      actions.push({ type: 'click', selector: '#CommonName' });
      actions.push({ type: 'write', text: dogName });
    }
    if (firstName) {
      actions.push({ type: 'click', selector: '#FirstName' });
      actions.push({ type: 'write', text: firstName });
    }
    if (lastName) {
      actions.push({ type: 'click', selector: '#LastName' });
      actions.push({ type: 'write', text: lastName });
    }
    // Click search
    actions.push({ type: 'click', selector: 'button[name="action"][value="SearchDogs"]' });
    actions.push({ type: 'wait', milliseconds: 4000 });
    // Click the first dog result link to navigate to results page
    actions.push({ type: 'click', selector: '#SearchDogsAdminGridContent tbody tr:first-child td:last-child a' });
    actions.push({ type: 'wait', milliseconds: 8000 });

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://agilitydata.se/resultat/soek-hund/',
        formats: ['markdown', 'html'],
        onlyMainContent: false,
        waitFor: 3000,
        actions,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', JSON.stringify(data));
      
      // If clicking the result link fails, try without the click (just return search results)
      if (data?.code === 'SCRAPE_ACTION_ERROR') {
        console.log('Click failed, trying search-only mode...');
        return await searchOnly(apiKey, firstName, lastName, dogName);
      }

      return new Response(
        JSON.stringify({ success: false, error: `Sökning misslyckades (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = data?.data?.html || '';
    const markdown = data?.data?.markdown || '';

    console.log('Result page markdown length:', markdown.length);
    console.log('Markdown preview (first 300):', markdown.substring(0, 300));

    // Parse the dog's results page
    const dogInfo = parseDogResultsPage(html, markdown);

    return new Response(
      JSON.stringify({
        success: true,
        data: dogInfo,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Kunde inte söka just nu' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback: just search without clicking through to results
async function searchOnly(apiKey: string, firstName: string, lastName: string, dogName: string) {
  const actions: any[] = [
    { type: 'wait', milliseconds: 2000 },
  ];

  if (dogName) {
    actions.push({ type: 'click', selector: '#CommonName' });
    actions.push({ type: 'write', text: dogName });
  }
  if (firstName) {
    actions.push({ type: 'click', selector: '#FirstName' });
    actions.push({ type: 'write', text: firstName });
  }
  if (lastName) {
    actions.push({ type: 'click', selector: '#LastName' });
    actions.push({ type: 'write', text: lastName });
  }
  actions.push({ type: 'click', selector: 'button[name="action"][value="SearchDogs"]' });
  actions.push({ type: 'wait', milliseconds: 4000 });

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://agilitydata.se/resultat/soek-hund/',
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      waitFor: 2000,
      actions,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return new Response(
      JSON.stringify({ success: false, error: 'Sökning misslyckades' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const html = data?.data?.html || '';
  const dogs = parseSearchList(html);

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        dog_name: dogs[0]?.dog_name || dogName || '',
        reg_name: dogs[0]?.reg_name || '',
        reg_nr: dogs[0]?.reg_nr || '',
        breed: dogs[0]?.breed || '',
        handler: dogs[0]?.handler || `${firstName} ${lastName}`,
        results: [],
        search_only: true,
        found_dogs: dogs.length,
      },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function parseSearchList(html: string) {
  const dogs: any[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1];
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells || cells.length < 3) continue;

    const extractText = (cell: string) => cell.replace(/<[^>]+>/g, '').trim();
    const dogName = extractText(cells[0]);
    if (!dogName || dogName.toLowerCase().includes('tilltalsnamn')) continue;

    dogs.push({
      dog_name: dogName,
      reg_nr: cells.length > 1 ? extractText(cells[1]) : '',
      reg_name: cells.length > 2 ? extractText(cells[2]) : '',
      breed: cells.length > 3 ? extractText(cells[3]) : '',
      handler: cells.length > 4 ? extractText(cells[4]) : '',
    });
  }
  return dogs;
}

function parseDogResultsPage(html: string, markdown: string): DogSearchResult {
  // Extract dog info from the page header
  let dogName = '';
  let regName = '';
  let regNr = '';
  let breed = '';
  let handler = '';

  // Try to extract from headings or info sections
  const h3Match = markdown.match(/###?\s+(.+)/);
  if (h3Match) dogName = h3Match[1].trim();

  // Parse table of results
  const results: DogResult[] = [];

  // Look for result table rows in HTML
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  let headerCols: string[] = [];
  let foundHeader = false;

  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1];

    // Check for header row
    const thCells = row.match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
    if (thCells && thCells.length >= 3) {
      headerCols = thCells.map(c => c.replace(/<[^>]+>/g, '').trim().toLowerCase());
      foundHeader = true;
      continue;
    }

    if (!foundHeader) continue;

    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells || cells.length < 3) continue;

    const extractText = (cell: string) => cell.replace(/<[^>]+>/g, '').trim();
    const vals = cells.map(c => extractText(c));

    // Map columns by header names
    const getCol = (keywords: string[]) => {
      const idx = headerCols.findIndex(h => keywords.some(k => h.includes(k)));
      return idx >= 0 && idx < vals.length ? vals[idx] : '';
    };

    const dateStr = getCol(['datum', 'date']);
    const comp = getCol(['tävling', 'competition', 'arrangemang']);
    const disc = getCol(['gren', 'discipline']);
    const cls = getCol(['klass', 'class']);
    const size = getCol(['storl', 'size']);
    const placStr = getCol(['plac', 'placement', '#']);
    const timeStr = getCol(['tid', 'time']);
    const faultStr = getCol(['fel', 'fault']);
    const passedStr = getCol(['godkänd', 'passed', 'ok', 'resultat']);
    const dqStr = getCol(['disk', 'dq']);

    if (!dateStr && !comp) continue;

    results.push({
      date: dateStr,
      competition: comp,
      discipline: disc,
      class: cls,
      size,
      placement: placStr ? parseInt(placStr) || null : null,
      time_sec: timeStr ? parseFloat(timeStr.replace(',', '.')) || null : null,
      faults: faultStr ? parseInt(faultStr) || null : null,
      passed: passedStr ? !['nej', 'ej', 'no'].includes(passedStr.toLowerCase()) : true,
      disqualified: dqStr ? ['ja', 'yes', 'disk'].some(k => dqStr.toLowerCase().includes(k)) : false,
    });
  }

  // Fallback: parse markdown tables
  if (results.length === 0 && markdown) {
    const lines = markdown.split('\n');
    let mdHeaders: string[] = [];
    let foundMdHeader = false;

    for (const line of lines) {
      if (!line.includes('|')) continue;
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length < 3) continue;

      if (cells[0].includes('---')) continue;

      // Detect header row
      const lower = cells.map(c => c.toLowerCase());
      if (lower.some(c => c.includes('datum') || c.includes('date')) &&
          lower.some(c => c.includes('tävling') || c.includes('gren') || c.includes('klass'))) {
        mdHeaders = lower;
        foundMdHeader = true;
        continue;
      }

      if (!foundMdHeader) continue;

      const getCol = (keywords: string[]) => {
        const idx = mdHeaders.findIndex(h => keywords.some(k => h.includes(k)));
        return idx >= 0 && idx < cells.length ? cells[idx] : '';
      };

      const dateStr = getCol(['datum', 'date']);
      const comp = getCol(['tävling', 'competition', 'arrangemang']);
      if (!dateStr && !comp) continue;

      results.push({
        date: dateStr,
        competition: comp,
        discipline: getCol(['gren', 'discipline']),
        class: getCol(['klass', 'class']),
        size: getCol(['storl', 'size']),
        placement: (() => { const v = getCol(['plac', '#']); return v ? parseInt(v) || null : null; })(),
        time_sec: (() => { const v = getCol(['tid', 'time']); return v ? parseFloat(v.replace(',', '.')) || null : null; })(),
        faults: (() => { const v = getCol(['fel', 'fault']); return v ? parseInt(v) || null : null; })(),
        passed: true,
        disqualified: false,
      });
    }
  }

  // Extract additional dog info from markdown
  const regMatch = markdown.match(/(?:Reg\.?nr|Regnr)[:\s]+(\S+)/i);
  if (regMatch) regNr = regMatch[1];
  const breedMatch = markdown.match(/(?:Ras)[:\s]+(.+?)(?:\n|$)/i);
  if (breedMatch) breed = breedMatch[1].trim();
  const handlerMatch = markdown.match(/(?:Förare|Ägare)[:\s]+(.+?)(?:\n|$)/i);
  if (handlerMatch) handler = handlerMatch[1].trim();

  return {
    dog_name: dogName,
    reg_name: regName,
    reg_nr: regNr,
    breed,
    handler,
    results,
  };
}
