import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Trash2, UserPlus, UserMinus, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface ClubGroup {
  id: string;
  club_id: string;
  name: string;
  description: string;
  created_at: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

interface Props {
  clubId: string;
  userId: string;
  isAdmin: boolean;
  profiles: Record<string, string>;
  acceptedMemberIds: string[];
}

export function ClubGroupsTab({ clubId, userId, isAdmin, profiles, acceptedMemberIds }: Props) {
  const [groups, setGroups] = useState<ClubGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMember[]>>({});
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState<string | null>(null);

  const fetchGroups = async () => {
    const { data } = await supabase
      .from('club_groups')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: true });
    setGroups(data || []);

    if (data && data.length > 0) {
      const { data: members } = await supabase
        .from('club_group_members')
        .select('*')
        .in('group_id', data.map(g => g.id));

      const map: Record<string, GroupMember[]> = {};
      (members || []).forEach(m => {
        if (!map[m.group_id]) map[m.group_id] = [];
        map[m.group_id].push(m);
      });
      setGroupMembers(map);
    }
  };

  useEffect(() => { fetchGroups(); }, [clubId]);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Ange ett gruppnamn'); return; }
    const { error } = await supabase.from('club_groups').insert({
      club_id: clubId,
      name: newName.trim(),
      description: newDesc.trim(),
    });
    if (error) { toast.error('Kunde inte skapa grupp'); return; }
    toast.success('Grupp skapad!');
    setCreateOpen(false);
    setNewName('');
    setNewDesc('');
    fetchGroups();
  };

  const handleDeleteGroup = async (groupId: string) => {
    await supabase.from('club_group_members').delete().eq('group_id', groupId);
    await supabase.from('club_groups').delete().eq('id', groupId);
    toast.success('Grupp borttagen');
    fetchGroups();
  };

  const handleAddMember = async (groupId: string, memberId: string) => {
    const existing = (groupMembers[groupId] || []).find(m => m.user_id === memberId);
    if (existing) { toast.info('Redan medlem i gruppen'); return; }
    const { error } = await supabase.from('club_group_members').insert({
      group_id: groupId,
      user_id: memberId,
    });
    if (error) { toast.error('Kunde inte lägga till'); return; }
    toast.success('Medlem tillagd!');
    setAddMemberOpen(null);
    fetchGroups();
  };

  const handleRemoveMember = async (membershipId: string) => {
    await supabase.from('club_group_members').delete().eq('id', membershipId);
    toast.success('Medlem borttagen');
    fetchGroups();
  };

  const getMembersNotInGroup = (groupId: string) => {
    const inGroup = new Set((groupMembers[groupId] || []).map(m => m.user_id));
    return acceptedMemberIds.filter(id => !inGroup.has(id));
  };

  return (
    <div className="space-y-3">
      {isAdmin && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 w-full"><Plus size={14} /> Ny grupp</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Skapa träningsgrupp</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Gruppnamn (t.ex. Nybörjare)" />
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Beskrivning" rows={2} />
              <Button onClick={handleCreate} className="w-full">Skapa grupp</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {groups.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">Inga träningsgrupper ännu.</p>
      )}

      {groups.map(group => {
        const members = groupMembers[group.id] || [];
        const isExpanded = expandedGroup === group.id;

        return (
          <div key={group.id} className="bg-card rounded-xl shadow-card overflow-hidden">
            <button
              onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
            >
              <div>
                <h4 className="font-semibold text-sm text-foreground">{group.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Users size={10} /> {members.length} medlemmar
                  </span>
                  {group.description && (
                    <span className="text-[11px] text-muted-foreground">· {group.description}</span>
                  )}
                </div>
              </div>
              {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                {members.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Inga medlemmar i gruppen.</p>
                )}
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">{profiles[m.user_id] || 'Anonym'}</span>
                    {isAdmin && (
                      <button onClick={() => handleRemoveMember(m.id)} className="p-1 hover:bg-secondary rounded" title="Ta bort">
                        <UserMinus size={12} className="text-destructive" />
                      </button>
                    )}
                  </div>
                ))}

                {isAdmin && (
                  <div className="pt-1">
                    {addMemberOpen === group.id ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Lägg till medlem:</p>
                        {getMembersNotInGroup(group.id).length === 0 ? (
                          <p className="text-xs text-muted-foreground">Alla klubbmedlemmar är redan i gruppen.</p>
                        ) : (
                          getMembersNotInGroup(group.id).map(uid => (
                            <button
                              key={uid}
                              onClick={() => handleAddMember(group.id, uid)}
                              className="w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors flex items-center gap-2"
                            >
                              <UserPlus size={12} className="text-primary" />
                              {profiles[uid] || 'Anonym'}
                            </button>
                          ))
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setAddMemberOpen(null)} className="w-full text-xs">
                          Stäng
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => setAddMemberOpen(group.id)}>
                          <UserPlus size={12} /> Lägg till
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 text-xs text-destructive" onClick={() => handleDeleteGroup(group.id)}>
                          <Trash2 size={12} /> Ta bort
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
