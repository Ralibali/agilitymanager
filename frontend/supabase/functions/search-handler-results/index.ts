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
    const { firstName, lastName, dogName, dogUrl } = await req.json();

    // Direct URL mode: skip search, go straight to dog page
    if (dogUrl) {
      const urlStr = String(dogUrl).trim();
      if (!urlStr.startsWith('https://agilitydata.se/')) {
        return new Response(
          JSON.stringify({ success: false, error: 'URL måste börja med https://agilitydata.se/' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`Direct URL import: ${urlStr}`);

      // Fetch the dog page directly
      const dogPageRes = await fetch(urlStr, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      const dogPageHtml = await dogPageRes.text();
      const dogCookies = extractCookies(dogPageRes.headers);
      console.log('Dog page HTML length:', dogPageHtml.length);

      const dogInfo = parseDogInfo(dogPageHtml);
      const dogFormTokens = extractFormTokens(dogPageHtml);

      const bothResults = await fetchDisciplineResults(urlStr, dogCookies, dogFormTokens, 'Both');
      let allResults: DogResult[];

      if (bothResults.length > 0) {
        allResults = bothResults;
      } else {
        const agilityResults = await fetchDisciplineResults(urlStr, dogCookies, dogFormTokens, 'Agility');
        const hoppResults = await fetchDisciplineResults(urlStr, dogCookies, dogFormTokens, 'Hopp');
        allResults = [...agilityResults, ...hoppResults];
      }
      console.log(`Direct URL results: ${allResults.length}`);

      return new Response(
        JSON.stringify({ success: true, data: { ...dogInfo, results: allResults } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Extract form tokens (ufprt etc.) — supports both single and double quotes
    const formTokens = extractFormTokens(searchPageHtml);
    console.log('Hidden token names:', Object.keys(formTokens));

    // Step 2: Submit search form as multipart/form-data (form's enctype is multipart)
    const searchFormData = new FormData();
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
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://agilitydata.se',
        'Referer': 'https://agilitydata.se/resultat/soek-hund/',
      },
      body: searchFormData,
      redirect: 'manual',
    });
    let searchCookies = mergeCookies(cookies, extractCookies(searchRes.headers));
    console.log('Search POST status:', searchRes.status, 'location:', searchRes.headers.get('location'));

    // Step 2b: Follow PRG-redirect (ASP.NET Post-Redirect-Get pattern)
    let searchResultHtml: string;
    if (searchRes.status === 302 || searchRes.status === 301) {
      const loc = searchRes.headers.get('location') || '/resultat/soek-hund/';
      const followUrl = loc.startsWith('/') ? 'https://agilitydata.se' + loc : loc;
      const followRes = await fetch(followUrl, {
        headers: {
          'Cookie': searchCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://agilitydata.se/resultat/soek-hund/',
        },
      });
      searchResultHtml = await followRes.text();
      searchCookies = mergeCookies(searchCookies, extractCookies(followRes.headers));
    } else {
      searchResultHtml = await searchRes.text();
    }
    console.log('Search result HTML length:', searchResultHtml.length);

    // Step 3: Find first dog link in result table.
    // Real format: /umbraco/Surface/CompetitionResultSurface/RedirectToDogResultPage?regNo=...
    let dogPageUrl = '';
    const redirectLinkMatch = searchResultHtml.match(/href="([^"]*RedirectToDogResultPage[^"]*)"/i);
    if (redirectLinkMatch) {
      dogPageUrl = redirectLinkMatch[1].replace(/&amp;/g, '&');
      if (dogPageUrl.startsWith('/')) dogPageUrl = 'https://agilitydata.se' + dogPageUrl;
    } else {
      // Fallback: older link patterns
      const fallback =
        searchResultHtml.match(/href="([^"]*hund-resultat[^"]*)"/i) ||
        searchResultHtml.match(/data-swhgurl="([^"]*)"/i);
      if (fallback) {
        dogPageUrl = fallback[1].replace(/&amp;/g, '&');
        if (dogPageUrl.startsWith('/')) dogPageUrl = 'https://agilitydata.se' + dogPageUrl;
      }
    }

    if (!dogPageUrl) {
      const noResults = searchResultHtml.includes('Inga uppgifter hittade');
      console.log(noResults ? 'Site says: Inga uppgifter hittade' : 'No dog link found in HTML');
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

    // Step 5: Try submitting with BOTH Agility + Hopp checkboxes at once
    const dogFormTokens = extractFormTokens(dogPageHtml);
    const bothResults = await fetchDisciplineResults(dogPageUrl, dogCookies, dogFormTokens, 'Both');

    let allResults: DogResult[];

    if (bothResults.length > 0) {
      allResults = bothResults;
      console.log(`Total results from combined request: ${allResults.length}`);
    } else {
      // Fallback: fetch each discipline separately
      console.log('Combined request returned 0 results, trying separately...');
      const agilityResults = await fetchDisciplineResults(dogPageUrl, dogCookies, dogFormTokens, 'Agility');
      const hoppResults = await fetchDisciplineResults(dogPageUrl, dogCookies, dogFormTokens, 'Hopp');
      allResults = [...agilityResults, ...hoppResults];
      console.log(`Total results (separate): ${allResults.length} (Agility: ${agilityResults.length}, Hopp: ${hoppResults.length})`);
    }

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
  discipline: 'Agility' | 'Hopp' | 'Both'
): Promise<DogResult[]> {
  const formData = new URLSearchParams();
  for (const [k, v] of Object.entries(formTokens)) {
    formData.append(k, v);
  }
  
  // Set the checkbox(es) for the discipline(s)
  if (discipline === 'Both' || discipline === 'Agility') {
    formData.append('ShowAgility', 'true');
  }
  if (discipline === 'Both' || discipline === 'Hopp') {
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
  const inputRegex = /<input\b[^>]*?>/gi;
  let match;
  while ((match = inputRegex.exec(html)) !== null) {
    const tag = match[0];
    if (!/type\s*=\s*['"]?hidden['"]?/i.test(tag)) continue;
    const nameMatch = tag.match(/name\s*=\s*['"]([^'"]+)['"]/i);
    const valueMatch = tag.match(/value\s*=\s*['"]([^'"]*)['"]/i);
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

  // Endast den explicita resultattabellen. Tidigare matchade vi alla tabeller
  // med "result" eller "grid" i id:t — det fångade in MeasurementGridContent
  // (hundens officiella mätningar) och returnerade dem som tävlingsresultat.
  const tableIds = ['gridContentResultDogResultsTable'];

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

    // Skydd: om tabellen ser ut som en mätningstabell (innehåller "mätning",
    // "domare" eller "kategori") så är det inte en resultattabell — hoppa över.
    const isMeasurement = headers.some((h) => /m\s*ä\s*tning|domare|kategori|notering/.test(h));
    if (isMeasurement) {
      console.log(`Skipping ${tableId} — looks like a measurement table.`);
      continue;
    }

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
      // På agilitydata.se finns både "ekipage" (förare+hund) och "arrangör".
      // Tävlingsnamnet finns sällan i tabellen — vi använder arrangör som
      // bästa tillgängliga etikett, men sätter bara om strängen är meningsfull.
      const organizer = getCol(['arrangör', 'arrangemang']);
      const eventName = getCol(['tävling', 'competition', 'event']);
      const cls = getCol(['klass', 'class']);
      const discCol = getCol(['gren', 'discipline', 'lopp']);
      const placStr = getCol(['plac']);
      const faultStr = getCol(['tot. fel', 'tot fel']);
      const meritStr = getCol(['merit']);
      // Riktig tid (sek) finns oftast i kolumn "tid". m/s är hastighet — får
      // INTE sparas som time_sec. Vi läser dem separat och skickar bara tid.
      const timeStr = getCol(['tid ', 'tid(', 'tid:', 'tid']);
      const refusalStr = getCol(['vägran']);
      const timeFaultStr = getCol(['tidsfel']);
      const rawFaultStr = getCol(['fel']);

      if (!dateStr || !/\d{4}/.test(dateStr)) continue;
      // Extra skydd: en resultatrad MÅSTE ha minst en av klass/merit/plac/fel.
      // Mätningsrader saknar alla dessa.
      if (!cls && !meritStr && !placStr && !faultStr && !rawFaultStr) continue;

      let totalFaults: number | null = null;
      if (faultStr && faultStr.trim() !== '') {
        const parsed = parseInt(faultStr);
        totalFaults = isNaN(parsed) ? null : parsed;
      } else if (rawFaultStr || refusalStr || timeFaultStr) {
        totalFaults = (parseInt(rawFaultStr) || 0) + (parseInt(refusalStr) || 0) + (parseFloat(timeFaultStr) || 0);
      }

      const passed = meritStr ? !['ej', 'disk', '-'].includes(meritStr.toLowerCase().trim()) : true;
      const disqualified = meritStr ? meritStr.toLowerCase().includes('disk') : false;

      // Determine discipline: use column data if available, otherwise fall back to parameter
      let rowDiscipline = discipline;
      if (discCol) {
        const d = discCol.toLowerCase();
        if (d.includes('hopp') || d.includes('jump')) rowDiscipline = 'Hopp';
        else if (d.includes('agility')) rowDiscipline = 'Agility';
      }

      // Försök parsea tid endast om vi faktiskt har en tid-kolumn.
      const parsedTime = timeStr ? parseFloat(timeStr.replace(',', '.')) : NaN;

      results.push({
        date: dateStr,
        competition: eventName || organizer || '',
        discipline: rowDiscipline === 'Both' ? 'Agility' : rowDiscipline,
        class: cls,
        size: '',
        placement: placStr ? parseInt(placStr) || null : null,
        time_sec: Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : null,
        faults: totalFaults,
        passed,
        disqualified,
      });
    }

    console.log(`${discipline}: Parsed ${results.length} from ${rowCount} rows`);
  }

  return results;
}
