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

    console.log(`Searching agilitydata.se: ${firstName} ${lastName}, dog: ${dogName || 'any'}`);

    // Step 1: Get the search page to obtain session cookie + form tokens
    const searchPageRes = await fetch('https://agilitydata.se/resultat/soek-hund/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const searchPageHtml = await searchPageRes.text();
    const cookies = extractCookies(searchPageRes.headers);
    console.log('Got search page, cookies:', cookies.substring(0, 50));

    // Extract form tokens (RequestVerificationToken, __RequestVerificationToken, etc.)
    const formTokens = extractFormTokens(searchPageHtml);

    // Step 2: Submit search form
    const searchFormData = new URLSearchParams();
    for (const [k, v] of Object.entries(formTokens)) {
      searchFormData.append(k, v);
    }
    searchFormData.append('CommonName', dogName || '');
    searchFormData.append('FirstName', firstName || '');
    searchFormData.append('LastName', lastName || '');
    searchFormData.append('ClubName', '');
    searchFormData.append('action', 'SearchDogs');

    const searchRes = await fetch('https://agilitydata.se/resultat/soek-hund/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://agilitydata.se',
        'Referer': 'https://agilitydata.se/resultat/soek-hund/',
      },
      body: searchFormData.toString(),
      redirect: 'manual',
    });
    const searchResultHtml = await searchRes.text();
    const searchCookies = mergeCookies(cookies, extractCookies(searchRes.headers));
    console.log('Search result HTML length:', searchResultHtml.length);

    // Step 3: Find first dog link in results
    const dogLinkMatch = searchResultHtml.match(/href="([^"]*hund-resultat[^"]*)"/i) ||
                          searchResultHtml.match(/<a[^>]*href="([^"]*)"[^>]*>\s*Visa\s*<\/a>/i);
    
    // Also try finding the dog link from table rows
    let dogPageUrl = '';
    if (dogLinkMatch) {
      dogPageUrl = dogLinkMatch[1];
      if (dogPageUrl.startsWith('/')) dogPageUrl = 'https://agilitydata.se' + dogPageUrl;
    } else {
      // Try AJAX-style grid link
      const gridLinkMatch = searchResultHtml.match(/data-swhgurl="([^"]*)"/i);
      if (gridLinkMatch) {
        dogPageUrl = gridLinkMatch[1];
        if (dogPageUrl.startsWith('/')) dogPageUrl = 'https://agilitydata.se' + dogPageUrl;
      }
    }

    if (!dogPageUrl) {
      // Try to find any link that looks like a dog result
      const anyLink = searchResultHtml.match(/<td[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>/gi);
      console.log('No dog link found. Table links:', anyLink?.length || 0);
      console.log('Search HTML snippet (grid area):', searchResultHtml.substring(
        Math.max(0, searchResultHtml.indexOf('SearchDogsAdminGridContent') - 100),
        searchResultHtml.indexOf('SearchDogsAdminGridContent') + 2000
      ));
      
      return new Response(
        JSON.stringify({ success: true, data: { dog_name: dogName || '', reg_name: '', reg_nr: '', breed: '', handler: `${firstName} ${lastName}`, results: [], search_only: true, found_dogs: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Dog page URL:', dogPageUrl);

    // Step 4: Get dog details page
    const dogPageRes = await fetch(dogPageUrl, {
      headers: {
        'Cookie': searchCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://agilitydata.se/resultat/soek-hund/',
      },
    });
    const dogPageHtml = await dogPageRes.text();
    const dogCookies = mergeCookies(searchCookies, extractCookies(dogPageRes.headers));
    console.log('Dog page HTML length:', dogPageHtml.length);

    // Parse dog info
    const dogInfo = parseDogInfo(dogPageHtml);

    // Step 5: Submit form with Agility checkbox checked
    const dogFormTokens = extractFormTokens(dogPageHtml);
    const agilityResults = await fetchDisciplineResults(dogPageUrl, dogCookies, dogFormTokens, 'Agility');

    // Step 6: Submit form with Hopp checkbox checked
    const hoppResults = await fetchDisciplineResults(dogPageUrl, dogCookies, dogFormTokens, 'Hopp');

    // Combine results
    const allResults = [...agilityResults, ...hoppResults];
    console.log(`Total results: ${allResults.length} (Agility: ${agilityResults.length}, Hopp: ${hoppResults.length})`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...dogInfo,
          results: allResults,
        },
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

async function fetchDisciplineResults(
  dogPageUrl: string,
  cookies: string,
  formTokens: Record<string, string>,
  discipline: 'Agility' | 'Hopp'
): Promise<DogResult[]> {
  const formData = new URLSearchParams();
  for (const [k, v] of Object.entries(formTokens)) {
    formData.append(k, v);
  }
  
  // Set the checkbox for the discipline
  if (discipline === 'Agility') {
    formData.append('ShowAgility', 'true');
  } else {
    formData.append('ShowHopp', 'true');
  }
  formData.append('action', 'ShowResults');

  try {
    const res = await fetch(dogPageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://agilitydata.se',
        'Referer': dogPageUrl,
      },
      body: formData.toString(),
      redirect: 'manual',
    });
    
    // Handle redirect
    if (res.status === 302 || res.status === 301) {
      const redirectUrl = res.headers.get('Location') || '';
      const fullUrl = redirectUrl.startsWith('/') ? 'https://agilitydata.se' + redirectUrl : redirectUrl;
      const redirectCookies = mergeCookies(cookies, extractCookies(res.headers));
      const redirectRes = await fetch(fullUrl, {
        headers: {
          'Cookie': redirectCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      const html = await redirectRes.text();
      return parseResultsTable(html, discipline);
    }
    
    const html = await res.text();
    console.log(`${discipline} response length: ${html.length}`);
    return parseResultsTable(html, discipline);
  } catch (err) {
    console.error(`Error fetching ${discipline} results:`, err);
    return [];
  }
}

function extractCookies(headers: Headers): string {
  const setCookies = headers.getSetCookie?.() || [];
  if (setCookies.length === 0) {
    const raw = headers.get('set-cookie') || '';
    if (!raw) return '';
    return raw.split(',')
      .map(c => c.split(';')[0].trim())
      .filter(c => c.includes('='))
      .join('; ');
  }
  return setCookies
    .map(c => c.split(';')[0].trim())
    .filter(c => c.includes('='))
    .join('; ');
}

function mergeCookies(existing: string, newCookies: string): string {
  if (!newCookies) return existing;
  if (!existing) return newCookies;
  const map = new Map<string, string>();
  for (const c of existing.split(';').map(s => s.trim())) {
    const [k, ...v] = c.split('=');
    if (k) map.set(k.trim(), v.join('='));
  }
  for (const c of newCookies.split(';').map(s => s.trim())) {
    const [k, ...v] = c.split('=');
    if (k) map.set(k.trim(), v.join('='));
  }
  return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

function extractFormTokens(html: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const inputRegex = /<input[^>]*type="hidden"[^>]*>/gi;
  let match;
  while ((match = inputRegex.exec(html)) !== null) {
    const nameMatch = match[0].match(/name="([^"]*)"/);
    const valueMatch = match[0].match(/value="([^"]*)"/);
    if (nameMatch && valueMatch) {
      tokens[nameMatch[1]] = valueMatch[1];
    }
  }
  return tokens;
}

function extractText(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function parseDogInfo(html: string): Omit<DogSearchResult, 'results'> {
  let dogName = '';
  let regName = '';
  let regNr = '';
  let breed = '';
  let handler = '';

  const tilltalsMatch = html.match(/Tilltalsnamn\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (tilltalsMatch) dogName = tilltalsMatch[1].trim();

  const regNrMatch = html.match(/Regnr\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (regNrMatch) regNr = regNrMatch[1].trim();

  const regNameMatch = html.match(/Registreringsnamn\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (regNameMatch) regName = regNameMatch[1].trim();

  const rasMatch = html.match(/Ras\s*(?:<[^>]*>)*\s*:\s*(?:<[^>]*>)*\s*([^<]+)/i);
  if (rasMatch) breed = rasMatch[1].trim();

  return { dog_name: dogName, reg_name: regName, reg_nr: regNr, breed, handler };
}

function parseResultsTable(html: string, discipline: string): DogResult[] {
  const results: DogResult[] = [];
  
  // Find result table - try multiple IDs
  const tableIds = ['gridContentResultDogResultsTable'];
  const tableIdRegex = /<table[^>]*id="([^"]*)"[^>]*/gi;
  let idMatch;
  while ((idMatch = tableIdRegex.exec(html)) !== null) {
    const id = idMatch[1];
    if (!tableIds.includes(id) && (id.toLowerCase().includes('result') || id.toLowerCase().includes('grid'))) {
      tableIds.push(id);
    }
  }

  for (const tableId of tableIds) {
    const tableRegex = new RegExp(`<table[^>]*id="${tableId}"[^>]*>([\\s\\S]*?)<\\/table>`, 'i');
    const tableMatch = html.match(tableRegex);
    if (!tableMatch) continue;

    const tableHtml = tableMatch[1];
    console.log(`Parsing table ${tableId} for ${discipline}, length: ${tableHtml.length}`);

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
    console.log(`Headers: ${headers.join(', ')}`);

    // Extract body rows
    const bodyMatch = tableHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : tableHtml;
    console.log(`tbody length: ${bodyHtml.length}`);

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
        console.log(`${discipline} Row ${rowCount}:`, vals.join(' | '));
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

      if (!dateStr || !/\d{4}/.test(dateStr)) continue;

      let totalFaults: number | null = null;
      if (faultStr && faultStr.trim() !== '') {
        const parsed = parseInt(faultStr);
        totalFaults = isNaN(parsed) ? null : parsed;
      } else if (rawFaultStr || refusalStr || timeFaultStr) {
        totalFaults = (parseInt(rawFaultStr) || 0) + (parseInt(refusalStr) || 0) + (parseFloat(timeFaultStr) || 0);
      }

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

    console.log(`${discipline}: Parsed ${results.length} from ${rowCount} rows`);
  }

  return results;
}
