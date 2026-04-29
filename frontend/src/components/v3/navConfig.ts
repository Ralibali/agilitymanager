import {
  Home, Dumbbell, Trophy, Target, BarChart3,
  Users, Building2, Dog, Heart, GraduationCap,
  PenTool, Timer, Settings, ShieldCheck,
  Plus, Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type V3NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  badge?: "pro" | "intern";
};

export type V3NavGroup = {
  label: string;
  items: V3NavItem[];
};

/**
 * Sidebar-navigation (desktop, ≥1024px).
 * Grupperad efter användarens vanligaste jobb: först dagliga flöden,
 * sedan hunden, verktyg, socialt och system.
 */
export const V3_NAV_GROUPS: V3NavGroup[] = [
  {
    label: "Dagligt",
    items: [
      { path: "/v3", label: "Hem", icon: Home },
      { path: "/v3/training", label: "Träning", icon: Dumbbell },
      { path: "/v3/competition", label: "Tävlingar", icon: Trophy },
      { path: "/v3/dogs", label: "Hundar", icon: Dog },
      { path: "/v3/stats", label: "Statistik", icon: BarChart3 },
      { path: "/v3/goals", label: "Mål", icon: Target },
    ],
  },
  {
    label: "Min hund",
    items: [
      { path: "/v3/health", label: "Hälsa", icon: Heart },
      { path: "/v3/coach", label: "Coach", icon: GraduationCap },
      { path: "/v3/courses", label: "Kurser", icon: GraduationCap },
    ],
  },
  {
    label: "Verktyg",
    items: [
      { path: "/v3/course-planner", label: "Banplanerare", icon: PenTool },
      { path: "/v3/stopwatch", label: "Tidtagarur", icon: Timer },
    ],
  },
  {
    label: "Socialt",
    items: [
      { path: "/v3/friends", label: "Kompisar", icon: Users },
      { path: "/v3/clubs", label: "Klubbar", icon: Building2 },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/v3/settings", label: "Inställningar", icon: Settings },
      { path: "/v3/admin", label: "Admin", icon: ShieldCheck, adminOnly: true, badge: "intern" },
    ],
  },
];

/**
 * Mobil bottom-nav: 5 slots med center-FAB.
 * Layout: [Hem] [Träning] [+ FAB] [Tävlingar] [Mer]
 */
export const V3_BOTTOM_PRIMARY: V3NavItem[] = [
  { path: "/v3", label: "Hem", icon: Home },
  { path: "/v3/training", label: "Träning", icon: Dumbbell },
];

export const V3_BOTTOM_SECONDARY: V3NavItem[] = [
  { path: "/v3/competition", label: "Tävlingar", icon: Trophy },
];

/**
 * Snabb-actions som öppnas från center-FAB.
 * Hålls action-first: de saker användaren oftast vill göra direkt.
 */
export type V3QuickAction = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  path: string;
  accent: "traning" | "tavlings" | "prestation" | "halsa";
};

export const V3_QUICK_ACTIONS: V3QuickAction[] = [
  {
    id: "log-training",
    label: "Logga träningspass",
    description: "Spara pass, känsla och vad som gick bra",
    icon: Dumbbell,
    path: "/v3/training?action=new",
    accent: "traning",
  },
  {
    id: "log-competition",
    label: "Lägg till tävling",
    description: "Planerad start eller resultat",
    icon: Trophy,
    path: "/v3/competition?action=new",
    accent: "tavlings",
  },
  {
    id: "new-goal",
    label: "Sätt nytt mål",
    description: "Skapa fokus för veckan eller säsongen",
    icon: Target,
    path: "/v3/goals?action=new",
    accent: "prestation",
  },
  {
    id: "health-note",
    label: "Hälsanteckning",
    description: "Följ vila, skada, rehab eller mående",
    icon: Heart,
    path: "/v3/health?action=new",
    accent: "halsa",
  },
  {
    id: "add-dog",
    label: "Lägg till hund",
    description: "Bygg profilen för en ny hund",
    icon: Dog,
    path: "/v3/dogs?action=new",
    accent: "halsa",
  },
  {
    id: "stopwatch",
    label: "Starta tidtagarur",
    description: "Mät tid på pass eller bana",
    icon: Timer,
    path: "/v3/stopwatch",
    accent: "traning",
  },
];

export { Plus, Menu };
