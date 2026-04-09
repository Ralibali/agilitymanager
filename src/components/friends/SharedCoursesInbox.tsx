import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SharedCourseWithProfile {
  id: string;
  course_id: string;
  shared_by: string;
  message: string;
  created_at: string;
  sharer_name: string | null;
}

export default function SharedCoursesInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<SharedCourseWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: shared } = await supabase
        .from('shared_courses')
        .select('*')
        .eq('shared_with', user.id)
        .order('created_at', { ascending: false });

      if (!shared || shared.length === 0) { setCourses([]); setLoading(false); return; }

      const sharerIds = [...new Set(shared.map(s => s.shared_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', sharerIds);

      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

      setCourses(shared.map(s => ({
        ...s,
        sharer_name: nameMap.get(s.shared_by) || 'Okänd',
      })));
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  if (courses.length === 0) {
    return (
      <div className="text-center py-8">
        <FolderOpen size={48} className="mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">Inga delade banor ännu</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {courses.map(c => (
        <Card key={c.id}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {c.sharer_name} delade en bana
                </p>
                {c.message && <p className="text-xs text-muted-foreground mt-1">"{c.message}"</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(c.created_at).toLocaleDateString('sv-SE')}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/course-planner')}>
                Öppna
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
