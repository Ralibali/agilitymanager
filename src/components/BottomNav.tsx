import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { forwardRef, useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';

const mainTabs = [
  { path: '/dashboard', emoji: '🏠', label: 'Hem', badgeKey: null as string | null },
  { path: '/course-planner', emoji: '📐', label: 'Banplanerare', badgeKey: null },
  { path: '/competition', emoji: '🏆', label: 'Tävlingar', badgeKey: null },
  { path: '/friends', emoji: '👥', label: 'Kompisar', badgeKey: 'friends' as string },
];

const moreTabs = [
  { path: '/dogs', emoji: '🐕', label: 'Hundar' },
  { path: '/training', emoji: '💪', label: 'Träning' },
  { path: '/goals', emoji: '🎯', label: 'Mål' },
  { path: '/courses', emoji: '🎓', label: 'Kurser' },
  { path: '/clubs', emoji: '🏛️', label: 'Klubbar' },
  { path: '/stopwatch', emoji: '⏱️', label: 'Tidtagarur' },
  { path: '/health', emoji: '❤️', label: 'Hälsa' },
  { path: '/stats', emoji: '📊', label: 'Statistik' },
  { path: '/settings', emoji: '⚙️', label: 'Inställningar' },
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
    ? [...moreTabs, { path: '/admin', emoji: '🛡️', label: 'Admin' }]
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
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {mainTabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const badge = getBadgeCount(tab.badgeKey);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative"
            >
              {/* Active green dot */}
              {isActive && (
                <motion.div
                  layoutId="activeTabDot"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: '#1a6b3c' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <div className="relative text-lg">
                {tab.emoji}
                {badge > 0 && (
                  <span
                    className="absolute -top-1 -right-2 w-4 h-4 text-white text-[9px] font-bold flex items-center justify-center"
                    style={{ background: '#dc2626', borderRadius: 'var(--radius-pill)' }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? '#1a6b3c' : '#999' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative">
              {isMoreActive && (
                <motion.div
                  layoutId="activeTabDot"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: '#1a6b3c' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <div className="relative text-lg">
                ⋯
                {moreBadge > 0 && (
                  <span
                    className="absolute -top-1 -right-2 w-4 h-4 text-white text-[9px] font-bold flex items-center justify-center"
                    style={{ background: '#dc2626', borderRadius: 'var(--radius-pill)' }}
                  >
                    {moreBadge > 9 ? '9+' : moreBadge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: isMoreActive ? '#1a6b3c' : '#999' }}
              >
                Mer
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
            <div className="grid grid-cols-3 gap-4 py-4">
              {allMoreTabs.map(tab => {
                const isActive = location.pathname === tab.path;
                return (
                  <button
                    key={tab.path}
                    onClick={() => { navigate(tab.path); setMoreOpen(false); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                      style={{
                        background: isActive ? '#e8f4ed' : 'hsl(var(--secondary))',
                      }}
                    >
                      {tab.emoji}
                    </div>
                    <span
                      className="text-xs font-medium"
                      style={{ color: isActive ? '#1a6b3c' : 'hsl(var(--foreground))' }}
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
