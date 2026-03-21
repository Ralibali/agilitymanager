import { Home, Dog, Dumbbell, Trophy, Timer, Heart, BarChart3, Settings, PencilRuler, Shield } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { forwardRef, useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const mainTabs = [
  { path: '/dashboard', icon: Home, label: 'Hem' },
  { path: '/dogs', icon: Dog, label: 'Hundar' },
  { path: '/training', icon: Dumbbell, label: 'Träning' },
  { path: '/competition', icon: Trophy, label: 'Tävling' },
];

const moreTabs = [
  { path: '/stopwatch', icon: Timer, label: 'Tidtagarur' },
  { path: '/health', icon: Heart, label: 'Hälsa' },
  { path: '/course-planner', icon: PencilRuler, label: 'Banplanerare' },
  { path: '/stats', icon: BarChart3, label: 'Statistik' },
  { path: '/settings', icon: Settings, label: 'Inställningar' },
];

export const BottomNav = forwardRef<HTMLElement>(function BottomNav(_props, ref) {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user?.id]);

  const allMoreTabs = isAdmin
    ? [...moreTabs, { path: '/admin', icon: Shield, label: 'Admin' }]
    : moreTabs;

  const isMoreActive = allMoreTabs.some(t => t.path === location.pathname);

  return (
    <nav ref={ref} className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {mainTabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full gradient-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon size={20} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
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
                  layoutId="activeTab"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full gradient-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <MoreHorizontal size={20} className={isMoreActive ? 'text-primary' : 'text-muted-foreground'} />
              <span className={`text-[10px] font-medium ${isMoreActive ? 'text-primary' : 'text-muted-foreground'}`}>
                Mer
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
            <div className="grid grid-cols-3 gap-4 py-4">
              {allMoreTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = location.pathname === tab.path;
                return (
                  <button
                    key={tab.path}
                    onClick={() => { navigate(tab.path); setMoreOpen(false); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isActive ? 'bg-primary/10' : 'bg-secondary'}`}>
                      <Icon size={22} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                    </div>
                    <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>{tab.label}</span>
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
