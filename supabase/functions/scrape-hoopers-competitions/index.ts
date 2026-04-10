import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HoopersCompetition {
  competition_id: string;
  competition_name: string;
  date: string | null;
  location: string;
  county: string;
  club_name: string;
  organizer: string;
  type: string;
  classes: string[];
  lopp_per_class: Record<string, number>;
  price_per_lopp: string;
  registration_opens: string | null;
  registration_closes: string | null;
  registration_status: string;
  contact_person: string;
  contact_email: string;
  judge: string;
  source_url: string;
  extra_info: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code))).trim();
}

function parseCompetitions(html: string): HoopersCompetition[] {
  const competitions: HoopersCompetition[] = [];

  // Each competition card is in a <li> with class "competition-card" or similar
  // Based on the markdown structure, competitions are listed as blocks with specific patterns
  // Let's parse the HTML for competition blocks

  // Split by competition entries - look for the date/location pattern
  // The HTML from shoktavling.se has competition blocks we need to parse
  
  // Try to find competition blocks - they appear between <li> tags or similar containers
  const blocks = html.split(/(?=<(?:li|div)[^>]*class="[^"]*(?:calendar-item|comp-item|tavling)[^"]*")/i);
  
  if (blocks.length <= 1) {
    // Fallback: parse from the text content using date patterns
    return parseFromText(html);
  }

  for (const block of blocks) {
    const comp = parseBlock(block);
    if (comp) competitions.push(comp);
  }

  return competitions;
}

function parseFromText(html: string): HoopersCompetition[] {
  const competitions: HoopersCompetition[] = [];
  const text = stripHtml(html);
  
  // Parse date patterns like "2026-04-11" followed by competition info
  // From the markdown we see the pattern: date, type (Officiell/Inofficiell), location, classes, name, arrangör
  
  // Split by "Officiell tävling" or "Inofficell tävling" markers
  const sections = text.split(/(?=(?:Officiell|Inofficell|Inofficiell)\s+tävling)/i);
  
  for (const section of sections) {
    if (section.length < 20) continue;
    
    const dateMatch = section.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    
    const isOfficial = /Officiell\s+tävling/i.test(section);
    const type = isOfficial ? "Officiell" : "Inofficiell";
    
    // Extract location - usually after the type
    const locationMatch = section.match(/(?:Officiell|Inofficiell|Inofficell)\s+tävling[^A-Za-zÀ-ÿ]*([A-Za-zÀ-ÿ\s]+?)(?:,|\n|Arrangör)/i);
    const location = locationMatch ? locationMatch[1].trim() : "";
    
    // Extract county
    const countyMatch = section.match(/([A-Za-zÀ-ÿ\s]+)\s+län/);
    const county = countyMatch ? countyMatch[1].trim() + " län" : "";
    
    // Extract classes
    const classes: string[] = [];
    const loppPerClass: Record<string, number> = {};
    
    if (/Startklass/i.test(section)) {
      classes.push("Startklass");
      const skMatch = section.match(/Startklass[:\s]*(\d+)\s*lopp/i);
      if (skMatch) loppPerClass["Startklass"] = parseInt(skMatch[1]);
    }
    if (/Klass\s*1/i.test(section)) {
      classes.push("Klass 1");
      const k1Match = section.match(/Klass\s*1[:\s]*(\d+)\s*lopp/i);
      if (k1Match) loppPerClass["Klass 1"] = parseInt(k1Match[1]);
    }
    if (/Klass\s*2/i.test(section)) {
      classes.push("Klass 2");
      const k2Match = section.match(/Klass\s*2[:\s]*(\d+)\s*lopp/i);
      if (k2Match) loppPerClass["Klass 2"] = parseInt(k2Match[1]);
    }
    if (/Klass\s*3/i.test(section)) {
      classes.push("Klass 3");
      const k3Match = section.match(/Klass\s*3[:\s]*(\d+)\s*lopp/i);
      if (k3Match) loppPerClass["Klass 3"] = parseInt(k3Match[1]);
    }
    
    // Extract name (usually in italics or after specific markers)
    const nameMatch = section.match(/(?:_|")([^_"]+?)(?:_|")/);
    const compName = nameMatch ? nameMatch[1].trim() : "";
    
    // Extract club name
    const clubMatch = section.match(/Arrangör:\s*(.+?)(?:\n|$)/i);
    const clubName = clubMatch ? clubMatch[1].trim() : "";
    
    // Extract organizer
    const orgMatch = section.match(/Anordnare:\s*(.+?)(?:\n|$)/i);
    const organizer = orgMatch ? orgMatch[1].trim() : clubName;
    
    // Extract price
    const priceMatch = section.match(/Pris\/lopp:\s*(\d+\s*kr)/i);
    const price = priceMatch ? priceMatch[1] : "";
    
    // Extract registration dates
    const regOpensMatch = section.match(/Anmälan\s+öppnar:\s*(\d{4}-\d{2}-\d{2})/i);
    const regClosesMatch = section.match(/Anmälan\s+stänger:\s*(\d{4}-\d{2}-\d{2})/i);
    
    // Registration status
    let regStatus = "";
    if (/Anmälan\s+stängd/i.test(section)) regStatus = "Stängd";
    else if (/Anmälan\s+öppen/i.test(section)) regStatus = "Öppen";
    
    // Extract judge
    const judgeMatch = section.match(/Domare:\s*(.+?)(?:\n|$)/i);
    const judge = judgeMatch ? judgeMatch[1].trim() : "";
    
    // Extract contact
    const contactMatch = section.match(/Kontaktperson:\s*(.+?)(?:\n|$)/i);
    const contactPerson = contactMatch ? contactMatch[1].trim() : "";
    const emailMatch = section.match(/Kontaktmail:\s*(\S+@\S+)/i);
    const contactEmail = emailMatch ? emailMatch[1].trim() : "";
    
    // Generate a stable ID from date + location
    const competitionId = `hoopers_${dateMatch[1]}_${location.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_åäö]/g, '')}`;
    
    if (dateMatch[1] && (location || compName)) {
      competitions.push({
        competition_id: competitionId,
        competition_name: compName || `Hooperstävling ${location}`,
        date: dateMatch[1],
        location,
        county,
        club_name: clubName,
        organizer,
        type,
        classes,
        lopp_per_class: loppPerClass,
        price_per_lopp: price,
        registration_opens: regOpensMatch ? regOpensMatch[1] : null,
        registration_closes: regClosesMatch ? regClosesMatch[1] : null,
        registration_status: regStatus,
        contact_person: contactPerson,
        contact_email: contactEmail,
        judge,
        source_url: "https://shoktavling.se/?page=kalender",
        extra_info: "",
      });
    }
  }
  
  return competitions;
}

function parseBlock(block: string): HoopersCompetition | null {
  const text = stripHtml(block);
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return null;
  
  // Reuse text parser logic for individual block
  const comps = parseFromText(block);
  return comps[0] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we have recent data (< 1 hour)
    const { data: existing } = await supabase
      .from("hoopers_competitions")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1);

    const forceRefresh = req.method === "POST";
    if (!forceRefresh && existing && existing.length > 0) {
      const lastFetch = new Date(existing[0].fetched_at);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (lastFetch > hourAgo) {
        return new Response(
          JSON.stringify({ status: "cached", count: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Fetching hoopers competitions from shoktavling.se...");

    // Fetch the calendar page
    const resp = await fetch("https://shoktavling.se/?page=kalender", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AgilityManager/1.0)",
        "Accept": "text/html",
      },
    });

    if (!resp.ok) {
      throw new Error(`Failed to fetch: ${resp.status}`);
    }

    const html = await resp.text();
    console.log(`Fetched ${html.length} bytes from shoktavling.se`);

    const competitions = parseFromText(html);
    console.log(`Parsed ${competitions.length} competitions`);

    if (competitions.length === 0) {
      // Try Firecrawl as fallback
      const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (firecrawlKey) {
        console.log("Trying Firecrawl fallback...");
        const fcResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: "https://shoktavling.se/?page=kalender",
            formats: ["markdown"],
            waitFor: 3000,
          }),
        });

        if (fcResp.ok) {
          const fcData = await fcResp.json();
          const markdown = fcData.data?.markdown || fcData.markdown || "";
          console.log(`Firecrawl returned ${markdown.length} chars`);
          
          // Parse from markdown - same structure as what we saw
          const fcComps = parseFromMarkdown(markdown);
          if (fcComps.length > 0) {
            return await upsertAndRespond(supabase, fcComps, corsHeaders);
          }
        }
      }

      return new Response(
        JSON.stringify({ status: "no_data", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return await upsertAndRespond(supabase, competitions, corsHeaders);
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseFromMarkdown(md: string): HoopersCompetition[] {
  const competitions: HoopersCompetition[] = [];
  
  // Split by competition entries - each starts with "Officiell tävling" or "Inofficell tävling"
  const entries = md.split(/(?=####\s+(?:Officiell|Inofficell|Inofficiell)\s+tävling)/i);
  
  for (const entry of entries) {
    if (entry.length < 30) continue;
    
    const dateMatch = entry.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    
    const isOfficial = /Officiell\s+tävling/i.test(entry);
    
    // Location: usually on its own line after date info, e.g. "Trelleborg, Skåne län"
    const locMatch = entry.match(/\n\s*([A-Za-zÀ-ÿåäöÅÄÖ]+(?:\s+[A-Za-zÀ-ÿåäöÅÄÖ]+)*),\s*([A-Za-zÀ-ÿåäöÅÄÖ\s]+län)/);
    const location = locMatch ? locMatch[1].trim() : "";
    const county = locMatch ? locMatch[2].trim() : "";
    
    // Classes and lopp
    const classes: string[] = [];
    const loppPerClass: Record<string, number> = {};
    
    const skMatch = entry.match(/Startklass[:\s]*(\d+)\s*lopp/i);
    if (skMatch) { classes.push("Startklass"); loppPerClass["Startklass"] = parseInt(skMatch[1]); }
    else if (/Startklass/i.test(entry)) { classes.push("Startklass"); }
    
    const k1Match = entry.match(/Klass\s*1[:\s]*(\d+)\s*lopp/i);
    if (k1Match) { classes.push("Klass 1"); loppPerClass["Klass 1"] = parseInt(k1Match[1]); }
    else if (/Klass\s+1/i.test(entry)) { classes.push("Klass 1"); }
    
    const k2Match = entry.match(/Klass\s*2[:\s]*(\d+)\s*lopp/i);
    if (k2Match) { classes.push("Klass 2"); loppPerClass["Klass 2"] = parseInt(k2Match[1]); }
    else if (/Klass\s+2/i.test(entry)) { classes.push("Klass 2"); }
    
    const k3Match = entry.match(/Klass\s*3[:\s]*(\d+)\s*lopp/i);
    if (k3Match) { classes.push("Klass 3"); loppPerClass["Klass 3"] = parseInt(k3Match[1]); }
    else if (/Klass\s+3/i.test(entry)) { classes.push("Klass 3"); }
    
    // Name (in italics _name_)
    const nameMatch = entry.match(/_([^_\n]+?)_/);
    const compName = nameMatch ? nameMatch[1].trim() : "";
    
    // Club
    const clubMatch = entry.match(/Arrangör:\s*(.+?)(?:\n|$)/i);
    const clubName = clubMatch ? clubMatch[1].trim() : "";
    
    // Organizer
    const orgMatch = entry.match(/Anordnare:\s*(.+?)(?:\n|$)/i);
    const organizer = orgMatch ? orgMatch[1].replace(/_/g, "").trim() : clubName;
    
    // Price
    const priceMatch = entry.match(/Pris\/lopp:\s*(\d+\s*kr)/i);
    
    // Registration
    const regOpens = entry.match(/Anmälan\s+öppnar:\s*(\d{4}-\d{2}-\d{2})/i);
    const regCloses = entry.match(/Anmälan\s+stänger:\s*(\d{4}-\d{2}-\d{2})/i);
    let regStatus = "";
    if (/Anmälan\s+stängd/i.test(entry)) regStatus = "Stängd";
    else if (/Anmälan\s+öppen/i.test(entry) || /Anmäl\s+dig/i.test(entry)) regStatus = "Öppen";
    
    // Judge
    const judgeMatch = entry.match(/Domare:\s*(.+?)(?:\n|$)/i);
    
    // Contact
    const contactMatch = entry.match(/Kontaktperson:\s*(.+?)(?:\n|$)/i);
    const emailMatch = entry.match(/Kontaktmail:\s*\[?(\S+@\S+?)\]?(?:\(|$|\n|\s)/i);
    
    const competitionId = `hoopers_${dateMatch[1]}_${location.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_åäö]/g, '')}`;
    
    if (location || compName) {
      competitions.push({
        competition_id: competitionId,
        competition_name: compName || `Hooperstävling ${location}`,
        date: dateMatch[1],
        location,
        county,
        club_name: clubName,
        organizer,
        type: isOfficial ? "Officiell" : "Inofficiell",
        classes,
        lopp_per_class: loppPerClass,
        price_per_lopp: priceMatch ? priceMatch[1] : "",
        registration_opens: regOpens ? regOpens[1] : null,
        registration_closes: regCloses ? regCloses[1] : null,
        registration_status: regStatus,
        contact_person: contactMatch ? contactMatch[1].trim() : "",
        contact_email: emailMatch ? emailMatch[1].trim() : "",
        judge: judgeMatch ? judgeMatch[1].trim() : "",
        source_url: "https://shoktavling.se/?page=kalender",
        extra_info: "",
      });
    }
  }
  
  return competitions;
}

async function upsertAndRespond(
  supabase: ReturnType<typeof createClient>,
  competitions: HoopersCompetition[],
  headers: Record<string, string>
) {
  const now = new Date().toISOString();
  
  for (const comp of competitions) {
    const { error } = await supabase
      .from("hoopers_competitions")
      .upsert(
        {
          competition_id: comp.competition_id,
          competition_name: comp.competition_name,
          date: comp.date,
          location: comp.location,
          county: comp.county,
          club_name: comp.club_name,
          organizer: comp.organizer,
          type: comp.type,
          classes: comp.classes,
          lopp_per_class: comp.lopp_per_class,
          price_per_lopp: comp.price_per_lopp,
          registration_opens: comp.registration_opens,
          registration_closes: comp.registration_closes,
          registration_status: comp.registration_status,
          contact_person: comp.contact_person,
          contact_email: comp.contact_email,
          judge: comp.judge,
          source_url: comp.source_url,
          extra_info: comp.extra_info,
          fetched_at: now,
        },
        { onConflict: "competition_id" }
      );

    if (error) {
      console.error(`Failed to upsert ${comp.competition_id}:`, error.message);
    }
  }

  console.log(`Upserted ${competitions.length} hoopers competitions`);

  return new Response(
    JSON.stringify({ status: "ok", count: competitions.length }),
    { headers: { ...headers, "Content-Type": "application/json" } }
  );
}
