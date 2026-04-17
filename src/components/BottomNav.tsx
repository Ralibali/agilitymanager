import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { forwardRef, useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import {
  Home, PenTool, Trophy, Users, MoreHorizontal,
  Dog, Dumbbell, Target, GraduationCap, Building2,
  Timer, Heart, BarChart3, Settings, ShieldCheck,
} from 'lucide-react';

const mainTabs = [
  { path: '/dashboard', icon: Home, label: 'Hem', badgeKey: null as string | null },
  { path: '/course-planner', icon: PenTool, label: 'Banor', badgeKey: null },
  { path: '/app/competition', icon: Trophy, label: 'Tävlingar', badgeKey: null },
  { path: '/friends', icon: Users, label: 'Kompisar', badgeKey: 'friends' as string },
];

const moreTabs = [
  { path: '/dogs', icon: Dog, label: 'Hundar' },
  { path: '/training', icon: Dumbbell, label: 'Träning' },
  { path: '/goals', icon: Target, label: 'Mål' },
  { path: '/courses', icon: GraduationCap, label: 'Kurser' },
  { path: '/app/clubs', icon: Building2, label: 'Klubbar' },
  { path: '/stopwatch', icon: Timer, label: 'Tidtagarur' },
  { path: '/health', icon: Heart, label: 'Hälsa' },
  { path: '/stats', icon: BarChart3, label: 'Statistik' },
  { path: '/settings', icon: Settings, label: 'Inställningar' },
];

export const BottomNav = forwardRef<HTMLElement>(function BottomNav(_props, ref) {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const unread = useUnreadCounts();

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user?.id]);

  const allMoreTabs = isAdmin
    ? [...moreTabs, { path: '/admin', icon: ShieldCheck, label: 'Admin' }]
    : moreTabs;

  const isMoreActive = allMoreTabs.some(t => t.path === location.pathname);

  const getBadgeCount = (badgeKey: string | null): number => {
    if (badgeKey === 'friends') return unread.messages + unread.friendRequests;
    return 0;
  };

  const moreBadge = unread.notifications;

  return (
    <nav
      ref={ref}
      aria-label="Huvudnavigering"
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {mainTabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const badge = getBadgeCount(tab.badgeKey);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative transition-colors"
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  className="transition-colors"
                  style={{ color: isActive ? 'hsl(148, 62%, 26%)' : 'hsl(var(--muted-foreground))' }}
                />
                {badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 text-white text-[9px] font-bold flex items-center justify-center px-1"
                    style={{ background: 'hsl(var(--destructive))', borderRadius: '10px' }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium transition-colors"
                style={{ color: isActive ? 'hsl(148, 62%, 26%)' : 'hsl(var(--muted-foreground))' }}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-0.5 w-5 h-[3px] rounded-full"
                  style={{ background: 'hsl(148, 62%, 26%)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              )}
            </button>
          );
        })}

        {/* More menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative">
              <div className="relative">
                <MoreHorizontal
                  size={20}
                  strokeWidth={isMoreActive ? 2.2 : 1.6}
                  className="transition-colors"
                  style={{ color: isMoreActive ? 'hsl(148, 62%, 26%)' : 'hsl(var(--muted-foreground))' }}
                />
                {moreBadge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 text-white text-[9px] font-bold flex items-center justify-center px-1"
                    style={{ background: 'hsl(var(--destructive))', borderRadius: '10px' }}
                  >
                    {moreBadge > 9 ? '9+' : moreBadge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium transition-colors"
                style={{ color: isMoreActive ? 'hsl(148, 62%, 26%)' : 'hsl(var(--muted-foreground))' }}
              >
                Mer
              </span>
              {isMoreActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-0.5 w-5 h-[3px] rounded-full"
                  style={{ background: 'hsl(148, 62%, 26%)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
            <div className="grid grid-cols-3 gap-3 py-4">
              {allMoreTabs.map(tab => {
                const isActive = location.pathname === tab.path;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.path}
                    onClick={() => { navigate(tab.path); setMoreOpen(false); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-colors"
                    style={{
                      background: isActive ? 'hsl(148, 62%, 26% / 0.08)' : 'transparent',
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                      style={{
                        background: isActive ? 'hsl(148, 62%, 26% / 0.12)' : 'hsl(var(--secondary))',
                      }}
                    >
                      <Icon
                        size={20}
                        strokeWidth={1.6}
                        style={{ color: isActive ? 'hsl(148, 62%, 26%)' : 'hsl(var(--foreground))' }}
                      />
                    </div>
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: isActive ? 'hsl(148, 62%, 26%)' : 'hsl(var(--foreground))' }}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
});
