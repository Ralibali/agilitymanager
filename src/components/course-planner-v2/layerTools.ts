/**
 * Lagren i banplaneraren och förarplanens verktyg — delas av sidopanel,
 * mobildocka och PlannerPage.
 */
import { Layers, Route, Users } from "lucide-react";
import { CUE_DEFS, type CueKind } from "@/features/course-planner-v2/courseExtras";

export type PlannerLayer = "obstacles" | "handler" | "exercises";

export type MarkupTool =
  | { kind: "pen" }
  | { kind: "eraser" }
  | { kind: "cue"; cue: CueKind }
  | null;

export type HandlerToolKey = "pen" | "eraser" | CueKind;

export const LAYERS: Array<{ key: PlannerLayer; label: string; short: string; Icon: typeof Layers; hint: string }> = [
  { key: "obstacles", label: "Hinder", short: "Hinder", Icon: Layers, hint: "Placera och flytta hinder" },
  { key: "handler", label: "Förarplan", short: "Förare", Icon: Users, hint: "Förarlinje, byten och anteckningar" },
  { key: "exercises", label: "Övningar", short: "Övningar", Icon: Route, hint: "Flera sekvenser på samma uppställning" },
];

export function isToolActive(tool: MarkupTool, key: HandlerToolKey): boolean {
  if (!tool) return false;
  if (tool.kind === "cue") return tool.cue === key;
  return tool.kind === key;
}

/** Verktygsknappar för förarplanen — samma lista i sidopanel och mobildocka. */
export const HANDLER_TOOLS: Array<{ key: HandlerToolKey; label: string; description: string; tool: Exclude<MarkupTool, null> }> = [
  { key: "pen", label: "Förarlinje", description: "Rita förarens väg med musen eller fingret", tool: { kind: "pen" } },
  { key: "eraser", label: "Sudd", description: "Tryck eller dra över en linje eller markering för att ta bort den", tool: { kind: "eraser" } },
  ...CUE_DEFS.map((d) => ({ key: d.kind, label: d.label, description: d.description, tool: { kind: "cue" as const, cue: d.kind } })),
];

/** Kort text för verktygsbannern överst på planen. */
export function toolBannerText(tool: Exclude<MarkupTool, null>): string {
  if (tool.kind === "pen") return "Rita förarens väg — dra med musen eller fingret";
  if (tool.kind === "eraser") return "Sudda — tryck eller dra över linjer och markeringar";
  const def = CUE_DEFS.find((d) => d.kind === tool.cue);
  return tool.cue === "note" ? "Tryck där anteckningen ska stå" : `Tryck för att placera ${def?.label.toLowerCase() ?? "markering"}`;
}
