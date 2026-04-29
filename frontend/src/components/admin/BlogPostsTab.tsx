import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  read_time: number;
  date: string;
  author: string;
  published: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

const emptyPost: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'> = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  category: '',
  read_time: 5,
  date: new Date().toISOString().split('T')[0],
  author: 'AgilityManager',
  published: true,
  seo_title: '',
  seo_description: '',
};

export default function BlogPostsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyPost);
  const [search, setSearch] = useState('');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []) as BlogPost[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (post: typeof form & { id?: string }) => {
      // Normalisera tomma SEO-strängar till null så fallback-logiken i SEO-komponenten fungerar.
      const seoTitle = post.seo_title?.trim() ? post.seo_title.trim() : null;
      const seoDescription = post.seo_description?.trim() ? post.seo_description.trim() : null;
      if (post.id) {
        const { error } = await supabase.from('blog_posts').update({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          read_time: post.read_time,
          date: post.date,
          author: post.author,
          published: post.published,
          seo_title: seoTitle,
          seo_description: seoDescription,
        }).eq('id', post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('blog_posts').insert({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          read_time: post.read_time,
          date: post.date,
          author: post.author,
          published: post.published,
          seo_title: seoTitle,
          seo_description: seoDescription,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success(editing ? 'Inlägg uppdaterat' : 'Inlägg skapat');
      setEditing(null);
      setCreating(false);
    },
    onError: (err: any) => toast.error(err.message || 'Fel vid sparning'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Inlägg raderat');
    },
  });

  const togglePublished = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from('blog_posts').update({ published }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] }),
  });

  const openEdit = (post: BlogPost) => {
    setForm({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      read_time: post.read_time,
      date: post.date,
      author: post.author,
      published: post.published,
      seo_title: post.seo_title ?? '',
      seo_description: post.seo_description ?? '',
    });
    setEditing(post);
    setCreating(false);
  };

  const openCreate = () => {
    setForm({ ...emptyPost });
    setCreating(true);
    setEditing(null);
  };

  const handleSave = () => {
    if (!form.slug || !form.title) {
      toast.error('Slug och titel krävs');
      return;
    }
    saveMutation.mutate(editing ? { ...form, id: editing.id } : form);
  };

  const filtered = search
    ? posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase()))
    : posts;

  const isOpen = !!editing || creating;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Sök blogginlägg..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-xl h-10"
        />
        <Button onClick={openCreate} className="gap-1.5 shrink-0">
          <Plus size={14} /> Nytt inlägg
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Inga blogginlägg hittades.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(post => (
            <Card key={post.id}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                      {!post.published && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/50 text-amber-600">
                          <EyeOff size={10} className="mr-0.5" /> Dold
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground flex-wrap">
                      <span>/{post.slug}</span>
                      <span>•</span>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{post.category}</Badge>
                      <span>•</span>
                      <span>{post.date}</span>
                      <span>•</span>
                      <span>{post.read_time} min</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => togglePublished.mutate({ id: post.id, published: !post.published })}
                      title={post.published ? 'Dölj' : 'Publicera'}
                    >
                      {post.published ? <Eye className="h-3.5 w-3.5 text-primary/60" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(post)}>
                      <Pencil className="h-3.5 w-3.5 text-primary/60" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 className="h-3.5 w-3.5 text-destructive/50" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Radera inlägg?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{post.title}" raderas permanent.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                            onClick={() => deleteMutation.mutate(post.id)}
                          >
                            Radera
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit / Create dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Redigera inlägg' : 'Nytt blogginlägg'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Titel</Label>
                <Input value={form.title} onChange={e => {
                  setForm(f => ({
                    ...f,
                    title: e.target.value,
                    slug: creating ? e.target.value.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : f.slug,
                  }));
                }} />
              </div>
              <div>
                <Label className="text-xs">Slug (URL)</Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Utdrag</Label>
              <Textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={2} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Kategori</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="T.ex. Teknik" />
              </div>
              <div>
                <Label className="text-xs">Datum</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Lästid (min)</Label>
                <Input type="number" min={1} max={30} value={form.read_time} onChange={e => setForm(f => ({ ...f, read_time: parseInt(e.target.value) || 5 }))} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Innehåll (Markdown)</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={16} className="font-mono text-xs" />
            </div>

            {/* SEO-sektion: separata fält för Google-titel + meta description */}
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO (Google &amp; sociala medier)</Label>
                <span className="text-[10px] text-muted-foreground">Lämna tom för att använda titel/utdrag</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">SEO-titel</Label>
                  <span className={`text-[10px] tabular-nums ${(form.seo_title?.length ?? 0) > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {form.seo_title?.length ?? 0} / 60
                  </span>
                </div>
                <Input
                  value={form.seo_title ?? ''}
                  onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))}
                  placeholder='T.ex. "Hoopers för hund – allt du behöver veta | AgilityManager"'
                  className="text-xs"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">SEO-beskrivning (meta description)</Label>
                  <span className={`text-[10px] tabular-nums ${(form.seo_description?.length ?? 0) > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {form.seo_description?.length ?? 0} / 160
                  </span>
                </div>
                <Textarea
                  value={form.seo_description ?? ''}
                  onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))}
                  placeholder="140–160 tecken som visas under titeln i Google. Avsluta med call-to-action."
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.published} onCheckedChange={v => setForm(f => ({ ...f, published: v }))} />
              <Label className="text-xs">{form.published ? 'Publicerad' : 'Dold'}</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>Avbryt</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                {editing ? 'Uppdatera' : 'Skapa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
