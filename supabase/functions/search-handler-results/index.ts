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

    // Step 1: Search for the dog
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
    actions.push({ type: 'wait', milliseconds: 5000 });
    // Click the first checkbox to show Agility results
    actions.push({ type: 'click', selector: 'input[type="checkbox"]' });
    actions.push({ type: 'wait', milliseconds: 5000 });

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
    const markdown = data?.data?.markdown || '';

    console.log('Result page HTML length:', html.length);

    // Log all table IDs found
    const tableIdRegex = /<table[^>]*id="([^"]*)"[^>]*/gi;
    let tableMatch;
    const tableIds: string[] = [];
    while ((tableMatch = tableIdRegex.exec(html)) !== null) {
      tableIds.push(tableMatch[1]);
    }
    console.log('Table IDs found:', tableIds.join(', '));

    // Parse the dog's results page
    const dogInfo = parseDogResultsPage(html, markdown);

    console.log(`Parsed ${dogInfo.results.length} results for ${dogInfo.dog_name}`);

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
  let dogName = '';
  let regName = '';
  let regNr = '';
  let breed = '';
  let handler = '';

  // Extract dog info from text fields on the page
  const tilltalsMatch = html.match(/Tilltalsnamn\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (tilltalsMatch) dogName = tilltalsMatch[1].trim();

  const regNrMatch = html.match(/Regnr\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (regNrMatch) regNr = regNrMatch[1].trim();

  const regNameMatch = html.match(/Registreringsnamn\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (regNameMatch) regName = regNameMatch[1].trim();

  const rasMatch = html.match(/Ras\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (rasMatch) breed = rasMatch[1].trim();

  // Parse ALL tables, but skip MeasurementGridContent
  const results: DogResult[] = [];
  
  // Split HTML by table tags to process each table separately
  const tableSections = html.split(/<table[^>]*/gi);
  
  for (let i = 1; i < tableSections.length; i++) {
    const tableStart = html.indexOf(tableSections[i]) - 6;
    // Get the full table tag to check ID
    const fullTableTag = html.substring(tableStart, tableStart + 200);
    
    // Skip measurement table
    if (fullTableTag.includes('MeasurementGridContent')) {
      console.log('Skipping MeasurementGridContent table');
      continue;
    }
    
    // Get table content until closing tag
    const tableContent = tableSections[i];
    const closeIdx = tableContent.indexOf('</table>');
    const tableHtml = closeIdx >= 0 ? tableContent.substring(0, closeIdx) : tableContent;
    
    // Look for result-like headers
    const headerMatch = tableHtml.match(/<thead>([\s\S]*?)<\/thead>/i);
    if (!headerMatch) continue;
    
    const headerHtml = headerMatch[1];
    const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    const headers: string[] = [];
    let thMatch;
    while ((thMatch = thRegex.exec(headerHtml)) !== null) {
      headers.push(thMatch[1].replace(/<[^>]+>/g, '').trim().toLowerCase());
    }
    
    console.log('Found table with headers:', headers.join(', '));
    
    // Check if this looks like a results table (has date + competition-related columns)
    const hasDate = headers.some(h => h.includes('datum') || h.includes('date'));
    const hasCompetition = headers.some(h => 
      h.includes('tävling') || h.includes('arrangemang') || h.includes('gren') || 
      h.includes('klass') || h.includes('tid') || h.includes('fel') ||
      h.includes('plac') || h.includes('competition')
    );
    
    if (!hasDate || !hasCompetition) {
      console.log('Skipping table - not a results table');
      continue;
    }
    
    console.log('Processing results table with headers:', headers.join(', '));
    
    // Parse body rows
    const bodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i) || 
                      [null, tableHtml.substring(tableHtml.indexOf('</thead>') + 8)];
    if (!bodyMatch[1]) continue;
    
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(bodyMatch[1])) !== null) {
      const row = rowMatch[1];
      // Skip header rows
      if (row.includes('<th')) continue;
      
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (!cells || cells.length < 3) continue;
      
      const extractText = (cell: string) => cell.replace(/<[^>]+>/g, '').trim();
      const vals = cells.map(c => extractText(c));
      
      const getCol = (keywords: string[]) => {
        const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
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
      
      // Skip summary rows (like "Antal starter", "Felfria", etc.)
      if (!dateStr || dateStr.length < 6 || !/\d{4}/.test(dateStr)) continue;
      
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
  }

  // Fallback: parse markdown tables if no HTML results found
  if (results.length === 0 && markdown) {
    const lines = markdown.split('\n');
    let mdHeaders: string[] = [];
    let foundMdHeader = false;

    for (const line of lines) {
      if (!line.includes('|')) continue;
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length < 3) continue;
      if (cells[0].includes('---')) continue;

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
      if (!dateStr || !/\d{4}/.test(dateStr)) continue;

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

  // Extract handler from markdown if not found in HTML
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
