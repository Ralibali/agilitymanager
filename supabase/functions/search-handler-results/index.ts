const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DogSearchResult {
  dog_name: string;
  reg_name: string;
  reg_nr: string;
  breed: string;
  handler: string;
  results_url: string | null;
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

    // Build Firecrawl actions: click into fields, type, then search
    // The form has: #DogName, #FirstName, #LastName, #SearchDogs
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
        onlyMainContent: true,
        waitFor: 2000,
        actions,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: `Sökning misslyckades (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = data?.data?.html || '';
    const markdown = data?.data?.markdown || '';
    
    console.log('Search result markdown length:', markdown.length);
    // Log a section around the table for debugging
    const tableIdx = html.indexOf('SearchDogsAdminGridContent');
    if (tableIdx >= 0) {
      console.log('Table HTML snippet:', html.substring(tableIdx, tableIdx + 1000));
    }

    // Parse the search results
    const dogs = parseSearchResults(html, markdown);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          dogs, 
          source_url: 'https://agilitydata.se/resultat/soek-hund/',
          debug_markdown_length: markdown.length,
        } 
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

function parseSearchResults(html: string, markdown: string): DogSearchResult[] {
  const dogs: DogSearchResult[] = [];

  // Try parsing from HTML - look for table rows in the search results grid
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  
  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1];
    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells || cells.length < 3) continue;

    const extractText = (cell: string) => cell.replace(/<[^>]+>/g, '').trim();
    const extractLink = (cell: string) => {
      const linkMatch = cell.match(/href="([^"]+)"/);
      return linkMatch ? linkMatch[1] : null;
    };

    // Find any link in any cell
    let resultsUrl: string | null = null;
    for (const cell of cells) {
      const link = extractLink(cell);
      if (link && (link.includes('resultat') || link.includes('hund') || link.includes('soek'))) {
        resultsUrl = link.startsWith('http') ? link : `https://agilitydata.se${link}`;
        break;
      }
    }
    // Fallback: any link
    if (!resultsUrl) {
      for (const cell of cells) {
        const link = extractLink(cell);
        if (link && !link.includes('javascript') && !link.includes('#')) {
          resultsUrl = link.startsWith('http') ? link : `https://agilitydata.se${link}`;
          break;
        }
      }
    }

    const dogName = extractText(cells[0]);
    if (dogName.toLowerCase().includes('tilltalsnamn') || !dogName) continue;

    // Columns: Tilltalsnamn | Registreringsnamn | Regnr | Ras | Förare
    const regName = cells.length > 1 ? extractText(cells[1]) : '';
    const regNr = cells.length > 2 ? extractText(cells[2]) : '';
    const breed = cells.length > 3 ? extractText(cells[3]) : '';
    const handler = cells.length > 4 ? extractText(cells[4]) : '';

    dogs.push({ dog_name: dogName, reg_name: regName, reg_nr: regNr, breed, handler, results_url: resultsUrl });
  }

  // Fallback: parse markdown tables
  if (dogs.length === 0 && markdown) {
    const lines = markdown.split('\n');
    for (const line of lines) {
      if (!line.includes('|')) continue;
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length < 3) continue;
      if (cells[0].includes('---') || cells[0].toLowerCase().includes('tilltalsnamn')) continue;
      
      const linkMatch = cells[0].match(/\[([^\]]+)\]\(([^)]+)\)/);
      const dogNameParsed = linkMatch ? linkMatch[1] : cells[0];
      const resultsUrl = linkMatch ? (linkMatch[2].startsWith('http') ? linkMatch[2] : `https://agilitydata.se${linkMatch[2]}`) : null;

      dogs.push({
        dog_name: dogNameParsed,
        reg_name: cells.length > 1 ? cells[1] : '',
        reg_nr: cells.length > 2 ? cells[2] : '',
        breed: cells.length > 3 ? cells[3] : '',
        handler: cells.length > 4 ? cells[4] : '',
        results_url: resultsUrl,
      });
    }
  }

  return dogs;
}
