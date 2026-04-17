import { LucideIcon, Home, BarChart3, Activity, LayoutGrid, Timer, Target, Trophy, Dog, HeartPulse, Users, Building2, GraduationCap, Settings, Shield, MessageCircle } from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: "pro" | "intern";
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Fas 2 informationsarkitektur – 6 grupper, 14 routes.
 * Källa till sanning för Sidebar, BottomNav och MoreSheet.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Översikt",
    items: [
      { label: "Hem", path: "/v2", icon: Home },
      { label: "Statistik", path: "/v2/stats", icon: BarChart3 },
    ],
  },
  {
    label: "Träning",
    items: [
      { label: "Träningar", path: "/v2/training", icon: Activity },
      { label: "Banplaneraren", path: "/v2/course-planner", icon: LayoutGrid },
      { label: "Tidtagarur", path: "/v2/stopwatch", icon: Timer },
      { label: "Mål & badges", path: "/v2/goals", icon: Target },
    ],
  },
  {
    label: "Tävling",
    items: [
      { label: "Tävlingar", path: "/v2/competition", icon: Trophy },
    ],
  },
  {
    label: "Hundar",
    items: [
      { label: "Mina hundar", path: "/v2/dogs", icon: Dog },
      { label: "Hälsa", path: "/v2/health", icon: HeartPulse },
    ],
  },
  {
    label: "Gemenskap",
    items: [
      { label: "Kompisar", path: "/v2/friends", icon: Users },
      { label: "Meddelanden", path: "/v2/chat", icon: MessageCircle },
      { label: "Klubbar", path: "/v2/clubs", icon: Building2 },
      { label: "Kurser", path: "/v2/courses", icon: GraduationCap, badge: "pro" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Inställningar", path: "/v2/settings", icon: Settings },
      { label: "Admin", path: "/v2/admin", icon: Shield, adminOnly: true, badge: "intern" },
    ],
  },
];

/** Fem slots i mobilens bottom nav. Sista är "Mer" – hanteras separat. */
export const MOBILE_PRIMARY_NAV: NavItem[] = [
  { label: "Hem", path: "/v2", icon: Home },
  { label: "Banor", path: "/v2/course-planner", icon: LayoutGrid },
  { label: "Tävlingar", path: "/v2/competition", icon: Trophy },
  { label: "Kompisar", path: "/v2/friends", icon: Users },
];
