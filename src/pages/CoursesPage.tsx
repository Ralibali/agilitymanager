import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/components/PremiumGate';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Play, ShoppingCart, ExternalLink, Star, Clock, GraduationCap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  long_description: string;
  price_sek: number;
  discounted_price_sek: number | null;
  instructor_name: string;
  instructor_bio: string;
  partner_name: string;
  partner_url: string;
  image_url: string | null;
  trailer_url: string | null;
  category: string;
}

export default function CoursesPage() {
  const { user } = useAuth();
  const isPremium = usePremium();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Course[];
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['course-purchases', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('course_purchases')
        .select('course_id, status')
        .eq('user_id', user.id)
        .eq('status', 'completed');
      if (error) throw error;
      return data as { course_id: string; status: string }[];
    },
    enabled: !!user,
  });

  const hasPurchased = (courseId: string) =>
    purchases.some(p => p.course_id === courseId);

  const getPrice = (course: Course) => {
    if (isPremium && course.discounted_price_sek) return course.discounted_price_sek;
    return course.price_sek;
  };

  const handlePurchase = async (course: Course) => {
    if (!user) {
      toast.error('Du måste vara inloggad för att köpa kurser');
      return;
    }

    // For now, redirect to external signup (Google Forms / DogsRus)
    // Later this can be replaced with Stripe checkout
    if (course.partner_url) {
      window.open(course.partner_url, '_blank');
      toast.info('Du omdirigeras till kursanordnaren för anmälan');
    }
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const categoryLabels: Record<string, string> = {
    hoopers: 'Hoopers',
    agility: 'Agility',
    grundträning: 'Grundträning',
  };

  return (
    <>
      <Helmet>
        <title>Kurser – AgilityManager</title>
        <meta name="description" content="Onlinekurser inom agility och hoopers. Lär dig från erfarna instruktörer." />
      </Helmet>

      <PageContainer title="Kurser" subtitle="Utveckla dig och din hund">
        {/* Pro discount banner */}
        {!isPremium && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Star size={16} className="text-amber-500" />
              <span><strong>Pro-medlemmar</strong> får rabatt på alla kurser!</span>
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <GraduationCap size={48} className="mx-auto mb-4 opacity-50" />
            <p>Inga kurser tillgängliga just nu.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map(course => {
              const purchased = hasPurchased(course.id);
              const price = getPrice(course);
              const hasDiscount = isPremium && course.discounted_price_sek && course.discounted_price_sek < course.price_sek;

              return (
                <Card
                  key={course.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border-border/50"
                  onClick={() => setSelectedCourse(course)}
                >
                  {/* Course image or gradient */}
                  <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20 relative flex items-center justify-center">
                    {course.trailer_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-t-xl">
                        <div className="w-12 h-12 rounded-full bg-card/90 flex items-center justify-center shadow-lg">
                          <Play size={20} className="text-primary ml-0.5" />
                        </div>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge variant="secondary" className="text-xs bg-card/90 text-foreground">
                        {categoryLabels[course.category] || course.category}
                      </Badge>
                      {purchased && (
                        <Badge className="text-xs bg-green-500 hover:bg-green-500 text-white">
                          <CheckCircle2 size={12} className="mr-1" /> Köpt
                        </Badge>
                      )}
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <Badge variant="outline" className="text-xs bg-card/90 dark:bg-black/60 font-semibold">
                        {course.partner_name}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-display font-bold text-lg mb-1">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={14} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{course.instructor_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasDiscount && (
                          <span className="text-xs line-through text-muted-foreground">{course.price_sek} kr</span>
                        )}
                        <span className="font-bold text-primary">{price} kr</span>
                        {hasDiscount && (
                          <Badge className="text-[10px] h-4 bg-amber-500 hover:bg-amber-500 text-white">Pro</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Course detail dialog */}
        <Dialog open={!!selectedCourse} onOpenChange={(o) => !o && setSelectedCourse(null)}>
          {selectedCourse && (
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selectedCourse.title}</DialogTitle>
              </DialogHeader>

              {/* Trailer */}
              {selectedCourse.trailer_url && (
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  {getYoutubeEmbedUrl(selectedCourse.trailer_url) ? (
                    <iframe
                      src={getYoutubeEmbedUrl(selectedCourse.trailer_url)!}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={selectedCourse.title}
                    />
                  ) : (
                    <a href={selectedCourse.trailer_url} target="_blank" rel="noopener noreferrer"
                      className="w-full h-full flex items-center justify-center text-white">
                      <Play size={48} />
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedCourse.long_description}
                </p>

                <Separator />

                {/* Instructor */}
                <div>
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    <GraduationCap size={14} /> Instruktör
                  </h4>
                  <p className="text-sm font-medium">{selectedCourse.instructor_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedCourse.instructor_bio}</p>
                </div>

                <Separator />

                {/* Partner */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Kursanordnare</p>
                    <p className="text-sm font-medium">{selectedCourse.partner_name}</p>
                  </div>
                  <a
                    href={selectedCourse.partner_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    Besök hemsida <ExternalLink size={12} />
                  </a>
                </div>

                <Separator />

                {/* Price & buy */}
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pris</p>
                    <div className="flex items-center gap-2">
                      {isPremium && selectedCourse.discounted_price_sek && selectedCourse.discounted_price_sek < selectedCourse.price_sek && (
                        <span className="text-sm line-through text-muted-foreground">{selectedCourse.price_sek} kr</span>
                      )}
                      <span className="text-2xl font-bold text-primary">{getPrice(selectedCourse)} kr</span>
                    </div>
                    {isPremium && selectedCourse.discounted_price_sek && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <Star size={10} /> Pro-rabatt aktiverad
                      </p>
                    )}
                  </div>

                  {hasPurchased(selectedCourse.id) ? (
                    <Badge className="bg-green-500 hover:bg-green-500 text-white py-2 px-4">
                      <CheckCircle2 size={16} className="mr-2" /> Köpt
                    </Badge>
                  ) : (
                    <Button onClick={() => handlePurchase(selectedCourse)} className="gap-2">
                      <ShoppingCart size={16} />
                      Anmäl dig
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </PageContainer>
    </>
  );
}
