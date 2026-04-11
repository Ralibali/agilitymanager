import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, BookOpen, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchBlogPosts, type BlogPost } from '@/lib/blogData';
import { useNavigate } from 'react-router-dom';

const categoryColors: Record<string, string> = {
  'Nybörjare': 'bg-primary/10 text-primary',
  'Teknik': 'bg-accent/10 text-accent',
  'Tävling': 'bg-success/10 text-success',
  'Hälsa': 'bg-destructive/10 text-destructive',
  'Träning': 'bg-warning/10 text-warning-foreground',
  'Utrustning': 'bg-secondary/80 text-secondary-foreground',
};

export default function BlogPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogPosts().then(p => { setPosts(p); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Agility-tips & kunskap | AgilityManager</title>
        <meta name="description" content="Lär dig allt om agility: nybörjarguider, träningstekniker, tävlingstips och hundhälsa. Gratis artiklar från AgilityManager." />
        <link rel="canonical" href="https://agilitymanager.se/blogg" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "AgilityManager Kunskapsbank",
          "description": "Tips och guider för agility",
          "url": "https://agilitymanager.se/blogg",
          "publisher": { "@type": "Organization", "name": "AgilityManager" },
          "blogPost": posts.map(p => ({
            "@type": "BlogPosting",
            "headline": p.title,
            "description": p.excerpt,
            "datePublished": p.date,
            "author": { "@type": "Organization", "name": p.author },
            "url": `https://agilitymanager.se/blogg/${p.slug}`
          }))
        })}</script>
      </Helmet>

      {/* Header */}
      <header className="px-4 pt-8 pb-6 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4 -ml-2 text-muted-foreground">
          <ArrowLeft size={16} className="mr-1" /> Startsidan
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <BookOpen size={20} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Kunskapsbank</h1>
        </div>
        <p className="text-muted-foreground text-sm">Tips, guider och kunskap för dig som tränar agility.</p>
      </header>

      {/* Articles */}
      <main className="px-4 pb-20 max-w-2xl mx-auto">
        <div className="space-y-4">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : posts.map((post, i) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/blogg/${post.slug}`}
                className="block bg-card rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[post.category] || 'bg-muted text-muted-foreground'}`}>
                    {post.category}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={12} /> {post.readTime} min
                  </span>
                </div>
                <h2 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">{post.excerpt}</p>
                <span className="text-xs font-medium text-primary flex items-center gap-1">
                  Läs mer <ArrowRight size={14} />
                </span>
              </Link>
            </motion.article>
          ))}
        </div>
      </main>

      {/* CTA */}
      <section className="px-4 pb-16 max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl p-6 shadow-card text-center">
          <h2 className="font-display font-bold text-foreground mb-2">Spåra din träning digitalt</h2>
          <p className="text-sm text-muted-foreground mb-4">Skapa ett gratis konto och börja logga träning, resultat och hälsa.</p>
          <Button className="gradient-primary text-primary-foreground font-semibold gap-2" onClick={() => navigate('/auth')}>
            Kom igång gratis <ArrowRight size={16} />
          </Button>
        </div>
      </section>
    </div>
  );
}
