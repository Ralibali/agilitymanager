// Hämtar publik resultatlista från agilitydata.se eller shok.se via Firecrawl,
// filtrerar fram BARA rader som matchar inloggad användares hund + förare och
// returnerar matchningarna. Andras data passerar bara i RAM och slängs.
//
// GDPR: Inga andra deltagares data lagras eller cachas i DB. Endast användarens
// egna träffar returneras till klienten. Källa + tidpunkt loggas vid import.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatchedResult {
  placement: number | null;
  handler_name: string;
  dog_name: string;
  time_sec: number | null;
  faults: number | null;
  size_class: string;
  class_label: string;
  passed: boolean;
  disqualified: boolean;
  raw_row: string; // för transparens
}

// Normalisera svenska tecken + lowercase + trim för matchning
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/é|è|ê/g, "e")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameMatches(needle: string, haystack: string): boolean {
  const n = norm(needle);
  const h = norm(haystack);
  if (!n || !h) return false;
  if (h === n) return true;
  // tillåt "Förnamn Efternamn" matchar "Efternamn, Förnamn" eller bara förnamn+efternamn delar
  const nParts = n.split(" ").filter((p) => p.length > 1);
  const hParts = h.split(" ").filter((p) => p.length > 1);
  // alla delar i needle måste finnas i haystack
  return nParts.every((p) => hParts.includes(p));
}

interface ParsedRow {
  cells: string[];
  raw: string;
}

function parseTables(markdown: string): { headers: string[]; rows: ParsedRow[]; classLabel: string }[] {
  const sections: { headers: string[]; rows: ParsedRow[]; classLabel: string }[] = [];
  const lines = markdown.split("\n");
  let currentHeading = "";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("#")) {
      currentHeading = line.replace(/^#+\s*/, "").trim();
      i++;
      continue;
    }
    // Tabell-header
    if (line.includes("|") && i + 1 < lines.length && /\|[\s:-]+\|/.test(lines[i + 1])) {
      const headers = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      const rows: ParsedRow[] = [];
      i += 2; // hoppa header + separator
      while (i < lines.length && lines[i].includes("|")) {
        const cells = lines[i]
          .split("|")
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1 || arr[0] !== "" || arr[arr.length - 1] !== "");
        // enklare: bara dela och filtrera tomma kanter
        const clean = lines[i].split("|").map((c) => c.trim());
        if (clean[0] === "") clean.shift();
        if (clean[clean.length - 1] === "") clean.pop();
        if (clean.length >= 2) rows.push({ cells: clean, raw: lines[i] });
        i++;
      }
      if (rows.length > 0) sections.push({ headers, rows, classLabel: currentHeading });
      continue;
    }
    i++;
  }
  return sections;
}

function findColIdx(headers: string[], keywords: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (keywords.some((k) => h.includes(k))) return i;
  }
  return -1;
}

function parseNumber(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Inte inloggad" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ success: false, error: "Ogiltig session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      url,
      dog_name,
      handler_name,
      first_name,
      last_name,
      competition_date,
    } = body as {
      url?: string;
      dog_name?: string;
      handler_name?: string;
      first_name?: string;
      last_name?: string;
      competition_date?: string | null;
    };

    if (!url || !dog_name || !handler_name) {
      return new Response(
        JSON.stringify({ success: false, error: "url, dog_name och handler_name krävs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validera URL — endast godkända domäner
    const parsed = new URL(url);
    const okDomain = ["agilitydata.se", "shok.se"].some((d) => parsed.hostname.includes(d));
    if (!okDomain) {
      return new Response(
        JSON.stringify({ success: false, error: "Endast agilitydata.se och shok.se stöds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Resulthämtning är inte konfigurerad" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[fetch-my-result] user=${userData.user.id} url=${url}`);

    let usedMethod: "direct-page" | "search-fallback" = "direct-page";
    let matches: MatchedResult[] = [];

    // ---------- STEG 1: Direkt-scrape av tävlingens publika resultatsida ----------
    const fcResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 4000,
      }),
    });

    const fcData = await fcResp.json();
    if (!fcResp.ok) {
      console.error("[fetch-my-result] firecrawl error", fcData);
      return new Response(
        JSON.stringify({ success: false, error: "Kunde inte läsa resultatlistan just nu" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const markdown: string = fcData?.data?.markdown || fcData?.markdown || "";
    if (!markdown) {
      return new Response(
        JSON.stringify({ success: false, error: "Inga resultat publicerade ännu" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sections = parseTables(markdown);
    const matches: MatchedResult[] = [];

    for (const section of sections) {
      const handlerIdx = findColIdx(section.headers, ["förare", "handler", "ekipage"]);
      const dogIdx = findColIdx(section.headers, ["hund", "dog"]);
      // Om kolumnerna inte finns, försök hitta dog+handler i samma cell (vanligt på agilitydata.se "Hund / Förare")
      const combinedIdx = findColIdx(section.headers, ["hund / förare", "ekipage", "deltagare"]);
      const placeIdx = findColIdx(section.headers, ["plac", "pl.", "rank"]);
      const timeIdx = findColIdx(section.headers, ["tid", "time"]);
      const faultIdx = findColIdx(section.headers, ["fel", "fault"]);
      const sizeIdx = findColIdx(section.headers, ["storl", "size", "klass"]);
      const statusIdx = findColIdx(section.headers, ["status", "godk", "diskvalif"]);

      for (const row of section.rows) {
        let dogCell = "";
        let handlerCell = "";
        if (dogIdx >= 0) dogCell = row.cells[dogIdx] || "";
        if (handlerIdx >= 0) handlerCell = row.cells[handlerIdx] || "";
        if (combinedIdx >= 0 && (!dogCell || !handlerCell)) {
          // Försök separera "Fido / Anna Svensson" eller "Anna Svensson - Fido"
          const combined = row.cells[combinedIdx] || "";
          const parts = combined.split(/[\/–-]/).map((p) => p.trim()).filter(Boolean);
          if (parts.length === 2) {
            // gissa: kortare namnet är hunden
            if (parts[0].split(" ").length === 1 && parts[1].split(" ").length >= 2) {
              dogCell = parts[0];
              handlerCell = parts[1];
            } else if (parts[1].split(" ").length === 1 && parts[0].split(" ").length >= 2) {
              dogCell = parts[1];
              handlerCell = parts[0];
            } else {
              dogCell = parts[1];
              handlerCell = parts[0];
            }
          }
        }

        // BÅDA måste matcha
        if (!nameMatches(dog_name, dogCell)) continue;
        if (!nameMatches(handler_name, handlerCell)) continue;

        const placeStr = placeIdx >= 0 ? row.cells[placeIdx] : "";
        const timeStr = timeIdx >= 0 ? row.cells[timeIdx] : "";
        const faultStr = faultIdx >= 0 ? row.cells[faultIdx] : "";
        const sizeStr = sizeIdx >= 0 ? row.cells[sizeIdx] : "";
        const statusStr = (statusIdx >= 0 ? row.cells[statusIdx] : "").toLowerCase();

        const placement = parseNumber(placeStr);
        const time_sec = parseNumber(timeStr);
        const faults = parseNumber(faultStr);

        const disqualified = /disk|dsq|dq/.test(statusStr);
        const passed =
          !disqualified &&
          ((statusStr.includes("godk") && !statusStr.includes("ej")) ||
            (faults !== null && faults === 0 && time_sec !== null));

        matches.push({
          placement: placement !== null ? Math.round(placement) : null,
          handler_name: handlerCell,
          dog_name: dogCell,
          time_sec,
          faults: faults !== null ? Math.round(faults) : null,
          size_class: sizeStr || "-",
          class_label: section.classLabel || "Okänd klass",
          passed,
          disqualified,
          raw_row: row.raw.slice(0, 300),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        matches,
        match_count: matches.length,
        source_url: url,
        fetched_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[fetch-my-result] unhandled", err);
    return new Response(
      JSON.stringify({ success: false, error: "Något gick fel vid hämtningen" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
