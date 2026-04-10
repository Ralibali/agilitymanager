import { useState, useEffect } from 'react';
import { ExternalLink, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOBILE_BREAKPOINT = 768;

interface Props {
  sourceUrl?: string;
}

export function AgilityDataAttribution({ sourceUrl }: Props) {
  const [open, setOpen] = useState(() => window.innerWidth >= MOBILE_BREAKPOINT);

  return (
    <div className="mt-6 bg-muted/50 border border-border rounded-xl text-xs text-muted-foreground">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
      >
        <Info size={14} className="text-primary flex-shrink-0" />
        <span className="text-[11px] text-muted-foreground flex-1">Data från agilitydata.se · SAgiK / AGIDA</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2 border-t border-border pt-2">
              <p>
                AgilityManager hämtar automatiskt tävlingsdata och resultat direkt från agilitydata.se i realtid
                när du öppnar denna sida. Informationen visas live och lagras aldrig av AgilityManager.
              </p>
              <p>
                All data tillhör Svenska Agilityklubben (SAgiK) och Agility Informations Data AB (AGIDA).
                AgilityManager har inget samarbete med eller är godkänd av SAgiK.
              </p>
              <a
                href={sourceUrl || 'https://agilitydata.se'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                🔗 Se originaldatan på agilitydata.se <ExternalLink size={12} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
