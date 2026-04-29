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

interface ExtractedData {
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
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL krävs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('https://agilitydata.se/')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Endast agilitydata.se-länkar stöds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl är inte konfigurerat' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI-nyckeln är inte konfigurerad' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Scrape with Firecrawl - get both screenshot and markdown
    console.log('Firecrawl scraping:', trimmedUrl);
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: trimmedUrl,
        formats: ['screenshot', 'markdown'],
        onlyMainContent: false,
        waitFor: 5000,
      }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      console.error('Firecrawl error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: `Firecrawl-fel (${scrapeRes.status})` }),
        { status: scrapeRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const screenshot = scrapeData?.data?.screenshot || scrapeData?.screenshot;
    const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
    console.log('Firecrawl response: screenshot=' + (screenshot ? 'yes' : 'no') + ', markdown length=' + markdown.length);

    if (!screenshot && !markdown) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ingen data kunde hämtas från sidan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Use AI to extract structured data
    console.log('Calling AI for visual extraction...');

    const messages: any[] = [
      {
        role: 'system',
        content: `Du är en dataextraherare för svenska agility-tävlingsresultat från agilitydata.se.

Extrahera ALLA resultatrader du ser. Varje rad i resultattabellen är ett tävlingsresultat.

Returnera data via tool call med exakt struktur. Var noga med:
- Datum i format YYYY-MM-DD
- "discipline" ska vara "Agility" eller "Hopp" (eller "Jumping")
- "class" är tävlingsklassen (t.ex. "K1", "K2", "K3", "Nollklass")
- "placement" som nummer eller null
- "time_sec" i sekunder (konvertera m/s om det visas som hastighet)
- "faults" som antal fel (heltal)
- "passed" true/false baserat på merit/godkänd
- "disqualified" true/false baserat på disk-markering
- Extrahera hundinfo: tilltalsnamn, registreringsnamn, regnr, ras, förare`
      },
    ];

    // Build user message with both image and markdown context
    const userContent: any[] = [];

    if (screenshot) {
      // Screenshot is a base64 data URL or URL
      const imageUrl = screenshot.startsWith('data:') ? screenshot : screenshot;
      userContent.push({
        type: 'image_url',
        image_url: { url: imageUrl },
      });
      userContent.push({
        type: 'text',
        text: 'Ovan ser du en screenshot av hundens resultatsida på agilitydata.se.',
      });
    }

    if (markdown) {
      userContent.push({
        type: 'text',
        text: `Här är sidans innehåll i markdown-format:\n\n${markdown.substring(0, 15000)}`,
      });
    }

    userContent.push({
      type: 'text',
      text: 'Extrahera all hundinfo och alla tävlingsresultat från denna sida. Använd tool call.',
    });

    messages.push({ role: 'user', content: userContent });

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_dog_results',
              description: 'Extract dog info and competition results from an agilitydata.se page',
              parameters: {
                type: 'object',
                properties: {
                  dog_name: { type: 'string', description: 'Tilltalsnamn' },
                  reg_name: { type: 'string', description: 'Registreringsnamn' },
                  reg_nr: { type: 'string', description: 'Registreringsnummer' },
                  breed: { type: 'string', description: 'Ras' },
                  handler: { type: 'string', description: 'Förare/ägare' },
                  results: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string', description: 'Datum YYYY-MM-DD' },
                        competition: { type: 'string', description: 'Arrangör/tävlingsnamn' },
                        discipline: { type: 'string', enum: ['Agility', 'Hopp'] },
                        class: { type: 'string', description: 'Klass (K1, K2, K3, Nollklass)' },
                        size: { type: 'string', description: 'Storleksklass om tillgänglig' },
                        placement: { type: ['number', 'null'] },
                        time_sec: { type: ['number', 'null'], description: 'Tid i sekunder eller m/s' },
                        faults: { type: ['number', 'null'], description: 'Totalt antal fel' },
                        passed: { type: 'boolean' },
                        disqualified: { type: 'boolean' },
                      },
                      required: ['date', 'competition', 'discipline', 'class', 'passed', 'disqualified'],
                    },
                  },
                },
                required: ['dog_name', 'results'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_dog_results' } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI-tjänsten har för många anrop just nu, försök igen om en stund' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI-kredit slut, kontakta support' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await aiRes.text();
      console.error('AI gateway error:', aiRes.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI-extraheringen misslyckades' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiRes.json();
    console.log('AI response received, choices:', aiData?.choices?.length);

    // Extract tool call result
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_dog_results') {
      console.error('No tool call in AI response:', JSON.stringify(aiData?.choices?.[0]?.message).substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'AI kunde inte extrahera resultat' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let extracted: ExtractedData;
    try {
      extracted = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Failed to parse AI tool call arguments:', toolCall.function.arguments?.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'Kunde inte tolka AI-svaret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracted: ${extracted.dog_name}, ${extracted.results?.length || 0} results`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          dog_name: extracted.dog_name || '',
          reg_name: extracted.reg_name || '',
          reg_nr: extracted.reg_nr || '',
          breed: extracted.breed || '',
          handler: extracted.handler || '',
          results: extracted.results || [],
        },
        method: 'visual-ai',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Oväntat fel vid visuell extraktion' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
