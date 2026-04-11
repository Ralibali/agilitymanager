import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Share2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Friend {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ShareCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedCourses: { id: string; name: string }[];
  currentCourseId?: string | null;
}

export default function ShareCourseDialog({ open, onOpenChange, savedCourses, currentCourseId }: ShareCourseDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !user?.id) return;
    setSelectedFriends([]);
    setMessage('');
    setSelectedCourse(currentCourseId || savedCourses[0]?.id || '');

    (async () => {
      setLoading(true);
      // Get accepted friendships
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const friendIds = friendships.map(f =>
        f.requester_id === user.id ? f.receiver_id : f.requester_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', friendIds);

      setFriends((profiles || []) as Friend[]);
      setLoading(false);
    })();
  }, [open, user?.id]);

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleShare = async () => {
    if (!user?.id || selectedFriends.length === 0 || !selectedCourse) return;
    setSending(true);

    try {
      // Get user's display name
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const myName = myProfile?.display_name || 'Någon';
      const courseName = savedCourses.find(c => c.id === selectedCourse)?.name || 'en bana';

      // Insert shared_courses rows
      const inserts = selectedFriends.map(friendId => ({
        course_id: selectedCourse,
        shared_by: user.id,
        shared_with: friendId,
        message: message.trim() || null,
      }));

      const { error } = await supabase.from('shared_courses').insert(inserts);
      if (error) throw error;

      // Insert notifications for each friend
      const notifMsg = message.trim()
        ? `${myName} delade en banskiss med dig: "${message.trim()}"`
        : `${myName} delade banskissen "${courseName}" med dig`;

      const notifInserts = selectedFriends.map(friendId => ({
        user_id: friendId,
        message: notifMsg,
        competition_id: null,
      }));

      await supabase.from('notifications').insert(notifInserts);

      const friendNames = selectedFriends
        .map(id => friends.find(f => f.user_id === id)?.display_name || 'kompis')
        .join(', ');

      toast.success(`✅ Banskissen delades med ${friendNames}!`);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Kunde inte dela banan');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Share2 size={18} /> Dela bana med kompis
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <Users size={40} className="mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Du har inga kompisar ännu — gå till Kompisar-fliken för att lägga till!
            </p>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                navigate('/friends');
              }}
            >
              Gå till Kompisar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Course picker if multiple saved */}
            {savedCourses.length > 1 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Välj bana</label>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {savedCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Friend list */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Välj kompisar</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {friends.map(f => (
                  <label
                    key={f.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedFriends.includes(f.user_id)}
                      onCheckedChange={() => toggleFriend(f.user_id)}
                    />
                    <Avatar className="h-8 w-8">
                      {f.avatar_url && <AvatarImage src={f.avatar_url} />}
                      <AvatarFallback className="text-xs">
                        {(f.display_name || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{f.display_name || 'Okänd'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Meddelande (valfritt)</label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="T.ex. Träningsbana imorgon 08:00!"
                rows={2}
                maxLength={200}
              />
            </div>

            <Button
              onClick={handleShare}
              className="w-full gradient-primary text-primary-foreground"
              disabled={selectedFriends.length === 0 || !selectedCourse || sending}
            >
              {sending ? <Loader2 className="animate-spin mr-2" size={14} /> : <Share2 size={14} className="mr-2" />}
              Dela med {selectedFriends.length > 0 ? `${selectedFriends.length} kompis${selectedFriends.length > 1 ? 'ar' : ''}` : '...'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
