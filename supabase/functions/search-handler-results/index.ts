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
    actions.push({ type: 'click', selector: '#SearchDogsAdminGridContent tbody tr:first-child td:last-child a' });
    actions.push({ type: 'wait', milliseconds: 5000 });
    // Click first checkbox (Agility) to load results
    actions.push({ type: 'click', selector: 'input[type="checkbox"]:first-of-type' });
    actions.push({ type: 'wait', milliseconds: 4000 });
    // Click second checkbox (Hopp) to load those results too
    actions.push({ type: 'click', selector: 'input[type="checkbox"]:nth-of-type(2)' });
    actions.push({ type: 'wait', milliseconds: 4000 });

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://agilitydata.se/resultat/soek-hund/',
        formats: ['html'],
        onlyMainContent: false,
        waitFor: 3000,
        actions,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', JSON.stringify(data));
      if (data?.code === 'SCRAPE_ACTION_ERROR') {
        console.log('Action failed, trying search-only mode...');
        return await searchOnly(apiKey, firstName, lastName, dogName);
      }
      return new Response(
        JSON.stringify({ success: false, error: `Sökning misslyckades (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = data?.data?.html || '';
    console.log('Result page HTML length:', html.length);

    const dogInfo = parseDogResultsPage(html);

    return new Response(
      JSON.stringify({ success: true, data: dogInfo }),
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

async function searchOnly(apiKey: string, firstName: string, lastName: string, dogName: string) {
  const actions: any[] = [{ type: 'wait', milliseconds: 2000 }];
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
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://agilitydata.se/resultat/soek-hund/',
      formats: ['html'],
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
    const dn = extractText(cells[0]);
    if (!dn || dn.toLowerCase().includes('tilltalsnamn')) continue;
    dogs.push({
      dog_name: dn,
      reg_nr: cells.length > 1 ? extractText(cells[1]) : '',
      reg_name: cells.length > 2 ? extractText(cells[2]) : '',
      breed: cells.length > 3 ? extractText(cells[3]) : '',
      handler: cells.length > 4 ? extractText(cells[4]) : '',
    });
  }
  return dogs;
}

function extractText(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function parseDogResultsPage(html: string): DogSearchResult {
  let dogName = '';
  let regName = '';
  let regNr = '';
  let breed = '';
  let handler = '';

  // Extract dog info
  const tilltalsMatch = html.match(/Tilltalsnamn\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (tilltalsMatch) dogName = tilltalsMatch[1].trim();

  const regNrMatch = html.match(/Regnr\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (regNrMatch) regNr = regNrMatch[1].trim();

  const regNameMatch = html.match(/Registreringsnamn\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (regNameMatch) regName = regNameMatch[1].trim();

  const rasMatch = html.match(/Ras\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (rasMatch) breed = rasMatch[1].trim();

  // Find ALL result tables - there may be one per discipline (Agility, Hopp)
  const results: DogResult[] = [];
  
  // Try specific table ID first, then find all tables with result-like IDs
  const tableIds = ['gridContentResultDogResultsTable'];
  const tableIdRegex = /<table[^>]*id="([^"]*)"[^>]*/gi;
  let idMatch;
  while ((idMatch = tableIdRegex.exec(html)) !== null) {
    const id = idMatch[1];
    if (!tableIds.includes(id) && (id.toLowerCase().includes('result') || id.toLowerCase().includes('grid'))) {
      tableIds.push(id);
    }
  }
  console.log('Table IDs to parse:', tableIds.join(', '));

  for (const tableId of tableIds) {
    const tableRegex = new RegExp(`<table[^>]*id="${tableId}"[^>]*>([\\s\\S]*?)<\\/table>`, 'i');
    const resultsTableMatch = html.match(tableRegex);
    
    if (!resultsTableMatch) continue;
    
    console.log(`Parsing table ${tableId}, length:`, resultsTableMatch[1].length);
    const tableHtml = resultsTableMatch[1];
    
    // Determine discipline from context (look for heading before the table)
    let discipline = '';
    const tablePos = html.indexOf(resultsTableMatch[0]);
    const precedingHtml = html.substring(Math.max(0, tablePos - 500), tablePos);
    if (/hopp/i.test(precedingHtml)) discipline = 'Hopp';
    else if (/agility/i.test(precedingHtml)) discipline = 'Agility';
    
    // Extract headers
    const headerMatch = tableHtml.match(/<thead>([\s\S]*?)<\/thead>/i);
    const headers: string[] = [];
    if (headerMatch) {
      const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
      let thMatch;
      while ((thMatch = thRegex.exec(headerMatch[1])) !== null) {
        headers.push(extractText(thMatch[1]).toLowerCase());
      }
    }
    console.log(`Table ${tableId} headers:`, headers.join(', '), '| discipline:', discipline);
    
    // Extract body rows
    const bodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : tableHtml;
    console.log('tbody found:', !!bodyMatch, 'bodyHtml length:', bodyHtml.length);
    if (bodyHtml.length < 2000) {
      console.log('bodyHtml content:', bodyHtml.substring(0, 1500));
    }
    
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let rowCount = 0;
    
    while ((rowMatch = rowRegex.exec(bodyHtml)) !== null) {
      const row = rowMatch[1];
      if (row.includes('<th')) continue;
      
      const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (!cellMatches || cellMatches.length < 3) continue;
      
      const vals = cellMatches.map(c => extractText(c));
      rowCount++;
      
      if (rowCount <= 2) {
        console.log(`Row ${rowCount} values:`, vals.join(' | '));
      }
      
      const getCol = (keywords: string[]) => {
        const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
        return idx >= 0 && idx < vals.length ? vals[idx] : '';
      };
      
      const dateStr = getCol(['datum', 'date']);
      const comp = getCol(['arrangör', 'tävling', 'competition', 'arrangemang']);
      const cls = getCol(['klass', 'class']);
      const placStr = getCol(['plac']);
      const faultStr = getCol(['tot. fel', 'tot fel']);
      const meritStr = getCol(['merit']);
      const speedStr = getCol(['m/s']);
      const refusalStr = getCol(['vägran']);
      const timeFaultStr = getCol(['tidsfel']);
      const rawFaultStr = getCol(['fel']);
      
      // Skip non-date rows
      if (!dateStr || !/\d{4}/.test(dateStr)) continue;
      
      // Calculate total faults
      let totalFaults: number | null = null;
      if (faultStr && faultStr.trim() !== '') {
        const parsed = parseInt(faultStr);
        totalFaults = isNaN(parsed) ? null : parsed;
      } else if (rawFaultStr || refusalStr || timeFaultStr) {
        const f = parseInt(rawFaultStr) || 0;
        const r = parseInt(refusalStr) || 0;
        const t = parseFloat(timeFaultStr) || 0;
        totalFaults = f + r + t;
      }
      
      // Determine pass/DQ from merit
      const passed = meritStr ? !['ej', 'disk', '-'].includes(meritStr.toLowerCase().trim()) : true;
      const disqualified = meritStr ? meritStr.toLowerCase().includes('disk') : false;
      
      results.push({
        date: dateStr,
        competition: comp,
        discipline,
        class: cls,
        size: '',
        placement: placStr ? parseInt(placStr) || null : null,
        time_sec: speedStr ? parseFloat(speedStr.replace(',', '.')) || null : null,
        faults: totalFaults,
        passed,
        disqualified,
      });
    }
    
    console.log(`Parsed ${results.length} results from ${rowCount} rows in table ${tableId}`);
  }
  
  if (results.length === 0) {
    console.log('No results found in any table');
    const allTableIds: string[] = [];
    const allIdRegex = /<table[^>]*id="([^"]*)"[^>]*/gi;
    let tm;
    while ((tm = allIdRegex.exec(html)) !== null) {
      allTableIds.push(tm[1]);
    }
    console.log('All table IDs in HTML:', allTableIds.join(', '));
  }

  return { dog_name: dogName, reg_name: regName, reg_nr: regNr, breed, handler, results };
}
