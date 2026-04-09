import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const productLinks = [
  { label: 'Träningslogg', href: '/training' },
  { label: 'Banplanerare', href: '/course-planner' },
  { label: 'Tävlingsresultat', href: '/competition' },
  { label: 'Försäkringsjämförelse', href: '/hundforsakring' },
  { label: 'Priser', href: '/#pricing' },
];

const supportLinks = [
  { label: 'Kontakt', href: 'mailto:info@auroramedia.se' },
  { label: 'Integritetspolicy', href: '/integritetspolicy' },
  { label: 'Cookiepolicy', href: '/cookiepolicy' },
];

const sportLinks = [
  { label: 'Om agility', href: '/om-agility' },
  { label: 'SAgiK', href: 'https://agilityklubben.se', external: true },
  { label: 'Agilitydata.se', href: 'https://agilitydata.se/', external: true },
  { label: 'SKK', href: 'https://www.skk.se/', external: true },
];

export function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="bg-[hsl(220,40%,7%)] text-white/80">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center" role="img" aria-label="AgilityManager logotyp – träningsapp för agility">
                <Zap size={18} className="text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-white">AgilityManager</span>
            </div>
            <p className="text-sm text-white/60 mb-3">Träna smartare. Tävla bättre.</p>
            <p className="text-xs text-white/50 mb-4">Frågor eller feedback? Hör av dig till{' '}
              <a href="mailto:info@auroramedia.se" className="underline hover:text-white transition-colors">info@auroramedia.se</a>
            </p>
            <p className="text-xs text-white/40">© 2025 AgilityManager</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-semibold text-white text-sm mb-4">Produkt</h4>
            <ul className="space-y-2">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <button
                    onClick={() => navigate(l.href)}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-semibold text-white text-sm mb-4">Support</h4>
            <ul className="space-y-2">
              {supportLinks.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith('mailto:') ? (
                    <a href={l.href} className="text-sm text-white/60 hover:text-white transition-colors">
                      {l.label}
                    </a>
                  ) : (
                    <button
                      onClick={() => navigate(l.href)}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {l.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Sport */}
          <div>
            <h4 className="font-display font-semibold text-white text-sm mb-4">Sport</h4>
            <ul className="space-y-2">
              {sportLinks.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <button
                      onClick={() => navigate(l.href)}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {l.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}