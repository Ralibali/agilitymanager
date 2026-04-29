import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseClasses(text: string): { agility: string[]; hopp: string[]; other: string[] } {
  const agility: string[] = [];
  const hopp: string[] = [];
  const other: string[] = [];

  if (!text) return { agility, hopp, other };

  // Handle "Ag" patterns
  const agMatch = text.match(/Ag(\d+)/g);
  if (agMatch) {
    for (const m of agMatch) {
      const digits = m.replace("Ag", "");
      for (const d of digits) {
        const cls = `Ag${d}`;
        if (!agility.includes(cls)) agility.push(cls);
      }
    }
  }

  // Handle "Ho" patterns  
  const hoMatch = text.match(/Ho(\d+)/g);
  if (hoMatch) {
    for (const m of hoMatch) {
      const digits = m.replace("Ho", "");
      for (const d of digits) {
        const cls = `Ho${d}`;
        if (!hopp.includes(cls)) hopp.push(cls);
      }
    }
  }

  // Handle special classes
  if (text.includes("AgLag")) other.push("Lag");
  if (text.includes("HoLag") && !other.includes("Lag")) other.push("Lag");
  if (text.includes("InOff")) other.push("InOff");
  if (text.includes("0-klass")) other.push("0-klass");

  return { agility, hopp, other };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractText(html: string): string {
  // Decode entities first so encoded tags can also be stripped
  let s = decodeEntities(html);
  // Strip complete tags
  s = s.replace(/<[^>]*>/g, " ");
  // Strip dangling/unterminated tag fragments (e.g. "<i class='...' title='...")
  s = s.replace(/<[^<>]*$/g, "");
  return s.replace(/\s+/g, " ").trim();
}

function extractDivTexts(html: string): string[] {
  const divs: string[] = [];
  const regex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    divs.push(extractText(m[1]));
  }
  return divs;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("Fetching competitions from agilitydata.se...");

    const response = await fetch("https://agilitydata.se/taevlingar/", {
      headers: {
        "User-Agent": "AgilityManager App - Data från agilitydata.se/SAgiK",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Extract table rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows: string[] = [];
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      rows.push(match[1]);
    }

    console.log(`Found ${rows.length} rows`);

    const competitions: any[] = [];

    for (const row of rows) {
      // Extract navigation div for key
      const navMatch = row.match(/id="navigation,(\d+),(\d+)"/);
      if (!navMatch) continue;

      const competitionKey = navMatch[1];
      const competitionPartKey = navMatch[2];

      if (competitionKey === "0") continue; // Skip ads

      // Extract all td cells
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let tdMatch;
      while ((tdMatch = tdRegex.exec(row)) !== null) {
        cells.push(tdMatch[1]);
      }

      if (cells.length < 9) continue;

      // td[1] = Date
      const dateText = extractText(cells[1]);
      let dateStart: string | null = null;
      let dateEnd: string | null = null;

      const dateRangeMatch = dateText.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
      if (dateRangeMatch) {
        dateStart = dateRangeMatch[1];
        dateEnd = dateRangeMatch[2];
      } else {
        const singleDateMatch = dateText.match(/(\d{4}-\d{2}-\d{2})/);
        if (singleDateMatch) {
          dateStart = singleDateMatch[1];
          dateEnd = singleDateMatch[1];
        }
      }

      // td[2] = Club + competition name
      const nameLines = cells[2].split(/<br\s*\/?>/i).map(extractText).filter(Boolean);
      const clubName = nameLines[0] || "";
      const competitionName = nameLines[1] || nameLines[0] || "";

      // td[3] = Location + indoor/outdoor
      const locationLines = cells[3].split(/<br\s*\/?>/i).map(extractText).filter(Boolean);
      const location = locationLines[0] || "";
      const indoorOutdoor = locationLines[1] || "";

      // td[4] = Classes (three divs)
      const classDivs = extractDivTexts(cells[4]);
      const rawLopp = extractText(cells[4]);
      
      const agilityClasses = classDivs[0] ? parseClasses(classDivs[0]).agility : [];
      const hoppClasses = classDivs[1] ? parseClasses(classDivs[1]).hopp : [];
      
      let otherClasses: string[] = [];
      for (const div of classDivs) {
        const parsed = parseClasses(div);
        otherClasses = [...otherClasses, ...parsed.other];
      }
      // Deduplicate
      otherClasses = [...new Set(otherClasses)];

      // td[5] = Judges — source sometimes duplicates names separated by spaces
      const judgesText = extractText(cells[5]);
      const judges: string[] = [];
      if (judgesText) {
        // Split on comma or 3+ whitespace (duplicate separator)
        const parts = judgesText.split(/,|\s{3,}/).map((j: string) => j.trim()).filter(Boolean);
        const seen = new Set<string>();
        for (const p of parts) {
          if (!seen.has(p)) { seen.add(p); judges.push(p); }
        }
      }

      // td[7] = Last registration date
      const lastRegText = extractText(cells[7]);
      const lastRegMatch = lastRegText.match(/(\d{4}-\d{2}-\d{2})/);
      const lastRegistrationDate = lastRegMatch ? lastRegMatch[1] : null;

      // td[8] = Status (from span)
      const statusSpanMatch = cells[8]?.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
      const status = statusSpanMatch ? extractText(statusSpanMatch[1]) : extractText(cells[8] || "");

      // td[11] = StatusCode
      const statusCode = cells[11] ? extractText(cells[11]) : "";

      competitions.push({
        id: competitionKey,
        part_key: competitionPartKey,
        club_name: clubName,
        competition_name: competitionName,
        location,
        indoor_outdoor: indoorOutdoor,
        date_start: dateStart,
        date_end: dateEnd,
        classes_agility: agilityClasses,
        classes_hopp: hoppClasses,
        classes_other: otherClasses,
        judges,
        last_registration_date: lastRegistrationDate,
        status,
        status_code: statusCode,
        source_url: "https://agilitydata.se/taevlingar/",
        fetched_at: new Date().toISOString(),
        raw_lopp: rawLopp,
      });
    }

    console.log(`Parsed ${competitions.length} competitions, upserting...`);

    let upsertedCount = 0;
    // Upsert in batches of 50
    for (let i = 0; i < competitions.length; i += 50) {
      const batch = competitions.slice(i, i + 50);
      const { error } = await supabase
        .from("competitions")
        .upsert(batch, { onConflict: "id" });
      if (error) {
        console.error("Upsert error:", error);
      } else {
        upsertedCount += batch.length;
      }
    }

    console.log(`Done. Upserted ${upsertedCount} competitions.`);

    return new Response(
      JSON.stringify({
        success: true,
        fetched: competitions.length,
        upserted: upsertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
