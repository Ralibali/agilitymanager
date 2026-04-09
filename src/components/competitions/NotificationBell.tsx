import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Notification } from '@/types/competitions';

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications((data || []) as unknown as Notification[]));
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-secondary transition-colors">
          <Bell size={20} className="text-foreground" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-80 overflow-y-auto" align="end">
        {notifications.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">Inga notiser</p>
        ) : (
          notifications.map(n => (
            <button
              key={n.id}
              onClick={() => {
                markRead(n.id);
                setOpen(false);
              }}
              className={`w-full text-left p-3 border-b border-border hover:bg-secondary/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
            >
              <p className="text-sm">{n.message}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(n.created_at).toLocaleDateString('sv-SE')}
              </p>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
