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

interface HandlerSearchResponse {
  dogs: DogSearchResult[];
  source_url: string;
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

    // Build Firecrawl actions to fill in the search form and click search
    const actions: any[] = [];
    
    if (dogName) {
      actions.push({ type: 'write', selector: '#DogName', value: dogName });
    }
    if (firstName) {
      actions.push({ type: 'write', selector: '#FirstName', value: firstName });
    }
    if (lastName) {
      actions.push({ type: 'write', selector: '#LastName', value: lastName });
    }
    actions.push({ type: 'click', selector: '#SearchDogs' });
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
        waitFor: 3000,
        actions,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', data);
      return new Response(
        JSON.stringify({ success: false, error: `Sökning misslyckades (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = data?.data?.html || '';
    const markdown = data?.data?.markdown || '';
    
    console.log('Search result markdown length:', markdown.length);
    console.log('Search result HTML length:', html.length);

    // Parse the search results from the HTML
    const dogs = parseSearchResults(html, markdown);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          dogs, 
          source_url: 'https://agilitydata.se/resultat/soek-hund/' 
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

  // Try parsing from HTML table rows in the search results grid
  // The grid has columns like: Tilltalsnamn, Reg.namn, Regnr, Ras, Förare
  // Look for table rows with links
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

    // Try to find a link in the first cell (dog name usually links to results)
    const link = extractLink(cells[0]);
    const dogName = extractText(cells[0]);
    
    // Skip header rows
    if (dogName.toLowerCase().includes('tilltalsnamn') || !dogName) continue;

    const regName = cells.length > 1 ? extractText(cells[1]) : '';
    const regNr = cells.length > 2 ? extractText(cells[2]) : '';
    const breed = cells.length > 3 ? extractText(cells[3]) : '';
    const handler = cells.length > 4 ? extractText(cells[4]) : '';

    let resultsUrl: string | null = null;
    if (link) {
      resultsUrl = link.startsWith('http') ? link : `https://agilitydata.se${link}`;
    }

    dogs.push({
      dog_name: dogName,
      reg_name: regName,
      reg_nr: regNr,
      breed,
      handler,
      results_url: resultsUrl,
    });
  }

  // Fallback: parse markdown tables if HTML parsing didn't work
  if (dogs.length === 0 && markdown) {
    const lines = markdown.split('\n');
    for (const line of lines) {
      if (!line.includes('|')) continue;
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length < 3) continue;
      if (cells[0].includes('---') || cells[0].toLowerCase().includes('tilltalsnamn')) continue;
      
      // Extract link from markdown format [text](url)
      const linkMatch = cells[0].match(/\[([^\]]+)\]\(([^)]+)\)/);
      const dogName = linkMatch ? linkMatch[1] : cells[0];
      const resultsUrl = linkMatch ? (linkMatch[2].startsWith('http') ? linkMatch[2] : `https://agilitydata.se${linkMatch[2]}`) : null;

      dogs.push({
        dog_name: dogName,
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
