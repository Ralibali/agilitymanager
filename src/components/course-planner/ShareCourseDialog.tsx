import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Share2, Loader2, Users, MessageSquare, Link2, Download, Smartphone, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

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
  onExportPNG?: () => string | null; // returns dataURL or null
}

export default function ShareCourseDialog({ open, onOpenChange, savedCourses, currentCourseId, onExportPNG }: ShareCourseDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [smsNumber, setSmsNumber] = useState('');

  useEffect(() => {
    if (!open || !user?.id) return;
    setSelectedFriends([]);
    setMessage('');
    setLinkCopied(false);
    setSelectedCourse(currentCourseId || savedCourses[0]?.id || '');

    (async () => {
      setLoading(true);
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
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const myName = myProfile?.display_name || 'Någon';
      const courseName = savedCourses.find(c => c.id === selectedCourse)?.name || 'en bana';

      const inserts = selectedFriends.map(friendId => ({
        course_id: selectedCourse,
        shared_by: user.id,
        shared_with: friendId,
        message: message.trim() || null,
      }));

      const { error } = await supabase.from('shared_courses').insert(inserts);
      if (error) throw error;

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

  const getShareText = () => {
    const courseName = savedCourses.find(c => c.id === selectedCourse)?.name || 'en agilitybana';
    const msg = message.trim() ? `\n${message.trim()}` : '';
    return `Kolla in min banskiss "${courseName}" på AgilityManager!${msg}\nhttps://agilitymanager.se/course-planner`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareText());
      setLinkCopied(true);
      toast.success('Kopierat till urklipp!');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Kunde inte kopiera');
    }
  };

  const handleSMS = () => {
    const text = encodeURIComponent(getShareText());
    const number = smsNumber.trim();
    // Use sms: URI scheme - works on both iOS and Android
    const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&body=' : '?body=';
    const url = number
      ? `sms:${number}${separator}${text}`
      : `sms:${separator}${text}`;
    window.open(url, '_self');
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      toast.error('Delning stöds inte i denna webbläsare');
      return;
    }

    const courseName = savedCourses.find(c => c.id === selectedCourse)?.name || 'Agilitybana';
    const shareData: ShareData = {
      title: courseName,
      text: getShareText(),
      url: 'https://agilitymanager.se/course-planner',
    };

    // Try to include the PNG image if available
    if (onExportPNG) {
      try {
        const dataUrl = onExportPNG();
        if (dataUrl) {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], 'agility-bana.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
        }
      } catch {
        // Fall back to text-only share
      }
    }

    try {
      await navigator.share(shareData);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Delning avbröts');
      }
    }
  };

  const handleDownloadPNG = () => {
    if (!onExportPNG) {
      toast.error('Spara banan först för att exportera');
      return;
    }
    const dataUrl = onExportPNG();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = 'agility-bana.png';
      link.href = dataUrl;
      link.click();
      toast.success('Bana exporterad som PNG');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Share2 size={18} /> Dela bana
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="friends" className="mt-1">
          <TabsList className="w-full grid grid-cols-3 mb-3">
            <TabsTrigger value="friends" className="text-xs">I appen</TabsTrigger>
            <TabsTrigger value="external" className="text-xs">SMS / Dela</TabsTrigger>
            <TabsTrigger value="export" className="text-xs">Exportera</TabsTrigger>
          </TabsList>

          {/* ─── In-app sharing ─── */}
          <TabsContent value="friends">
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
          </TabsContent>

          {/* ─── External sharing (SMS, native share, copy) ─── */}
          <TabsContent value="external">
            <div className="space-y-4">
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

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Meddelande (valfritt)</label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="T.ex. Vad tycker du om den här banan?"
                  rows={2}
                  maxLength={200}
                />
              </div>

              {/* SMS */}
              <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-primary" /> Skicka via SMS
                </label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    value={smsNumber}
                    onChange={e => setSmsNumber(e.target.value)}
                    placeholder="07X-XXX XX XX (valfritt)"
                    className="h-9 text-sm flex-1"
                  />
                  <Button size="sm" variant="outline" className="gap-1 h-9" onClick={handleSMS}>
                    <MessageSquare size={14} /> SMS
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Lämna tomt för att välja mottagare i din SMS-app</p>
              </div>

              {/* Native Share API */}
              {'share' in navigator && (
                <Button variant="outline" className="w-full gap-2" onClick={handleNativeShare}>
                  <Smartphone size={16} /> Dela via...
                  <span className="text-xs text-muted-foreground">(WhatsApp, Messenger, m.m.)</span>
                </Button>
              )}

              {/* Copy link */}
              <Button variant="outline" className="w-full gap-2" onClick={handleCopyLink}>
                {linkCopied ? <Check size={16} className="text-green-500" /> : <Link2 size={16} />}
                {linkCopied ? 'Kopierat!' : 'Kopiera delningstext'}
              </Button>
            </div>
          </TabsContent>

          {/* ─── Export tab ─── */}
          <TabsContent value="export">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ladda ner banan som en bild för att dela var som helst.
              </p>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleDownloadPNG}
                disabled={!onExportPNG}
              >
                <Download size={16} /> Spara som PNG-bild
              </Button>
              {!onExportPNG && (
                <p className="text-xs text-muted-foreground text-center">
                  Placera hinder på banan för att kunna exportera.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
