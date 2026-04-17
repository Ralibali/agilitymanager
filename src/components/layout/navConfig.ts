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
 * Informationsarkitektur – 6 grupper, 14 routes.
 * Källa till sanning för Sidebar, BottomNav och MoreSheet.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Översikt",
    items: [
      { label: "Hem", path: "/dashboard", icon: Home },
      { label: "Statistik", path: "/stats", icon: BarChart3 },
    ],
  },
  {
    label: "Träning",
    items: [
      { label: "Träningar", path: "/training", icon: Activity },
      { label: "Banplaneraren", path: "/course-planner", icon: LayoutGrid },
      { label: "Tidtagarur", path: "/stopwatch", icon: Timer },
      { label: "Mål & badges", path: "/goals", icon: Target },
    ],
  },
  {
    label: "Tävling",
    items: [
      { label: "Tävlingar", path: "/competition", icon: Trophy },
    ],
  },
  {
    label: "Hundar",
    items: [
      { label: "Mina hundar", path: "/dogs", icon: Dog },
      { label: "Hälsa", path: "/health", icon: HeartPulse },
    ],
  },
  {
    label: "Gemenskap",
    items: [
      { label: "Kompisar", path: "/friends", icon: Users },
      { label: "Meddelanden", path: "/chat", icon: MessageCircle },
      { label: "Klubbar", path: "/clubs", icon: Building2 },
      { label: "Kurser", path: "/courses", icon: GraduationCap, badge: "pro" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Inställningar", path: "/settings", icon: Settings },
      { label: "Admin", path: "/admin", icon: Shield, adminOnly: true, badge: "intern" },
    ],
  },
];

/** Fem slots i mobilens bottom nav. Sista är "Mer" – hanteras separat. */
export const MOBILE_PRIMARY_NAV: NavItem[] = [
  { label: "Hem", path: "/dashboard", icon: Home },
  { label: "Banor", path: "/course-planner", icon: LayoutGrid },
  { label: "Tävlingar", path: "/competition", icon: Trophy },
  { label: "Kompisar", path: "/friends", icon: Users },
];
