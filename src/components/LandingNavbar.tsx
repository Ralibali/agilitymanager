import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = [
  { label: 'Funktioner', href: '#features' },
  { label: 'Om agility', href: '/om-agility', route: true },
  { label: 'Blogg', href: '/blogg', route: true },
  { label: 'Försäkring', href: '/hundforsakring', route: true },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (link: typeof navLinks[0]) => {
    setMenuOpen(false);
    if (link.route) {
      navigate(link.href);
    } else {
      document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-border shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2" aria-label="AgilityManager logotyp – träningsapp för agility">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center" role="img" aria-label="AgilityManager logotyp – träningsapp för agility">
            <Zap size={18} className="text-primary-foreground" />
          </div>
          <span className={`font-display font-bold text-lg ${scrolled ? 'text-foreground' : 'text-white'}`}>
            AgilityManager
          </span>
        </button>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Huvudmeny">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link)}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                scrolled ? 'text-muted-foreground' : 'text-white/80 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
          <Button
            size="sm"
            className="bg-primary text-primary-foreground font-semibold"
            onClick={() => navigate('/auth')}
          >
            Kom igång gratis
          </Button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Stäng meny' : 'Öppna meny'}
        >
          {menuOpen ? (
            <X size={24} className={scrolled ? 'text-foreground' : 'text-white'} />
          ) : (
            <Menu size={24} className={scrolled ? 'text-foreground' : 'text-white'} />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden bg-white/95 backdrop-blur-md border-b border-border overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link)}
                  className="text-left text-sm font-medium text-foreground py-2 hover:text-primary transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <Button
                className="bg-primary text-primary-foreground font-semibold mt-2"
                onClick={() => { setMenuOpen(false); navigate('/auth'); }}
              >
                Kom igång gratis
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}