import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Star } from 'lucide-react';

interface Props {
  show: boolean;
  streak: number;
  onDone: () => void;
}

/**
 * Full-screen celebration overlay shown when the user logs their first training session of the day.
 * Shows a streak counter with confetti-like particle burst.
 */
export default function TrainingCelebration({ show, streak, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        onDone();
      }, 2800);
      return () => clearTimeout(t);
    }
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)' }}
          />

          {/* Particles */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * 360;
            const dist = 80 + Math.random() * 60;
            const x = Math.cos((angle * Math.PI) / 180) * dist;
            const y = Math.sin((angle * Math.PI) / 180) * dist;
            const colors = [
              'hsl(var(--primary))',
              'hsl(var(--accent))',
              'hsl(var(--warning))',
              'hsl(var(--primary))',
            ];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{ opacity: 0, x, y, scale: 0 }}
                transition={{ duration: 1.2, delay: 0.2 + i * 0.03, ease: 'easeOut' }}
                className="absolute rounded-full"
                style={{
                  width: 6 + Math.random() * 6,
                  height: 6 + Math.random() * 6,
                  background: colors[i % colors.length],
                }}
              />
            );
          })}

          {/* Center content */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="flex flex-col items-center gap-3 z-10"
          >
            {/* Glowing ring */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                boxShadow: '0 0 40px hsl(var(--primary) / 0.4)',
              }}
            >
              <Flame size={36} className="text-white" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <p className="font-display text-xl text-foreground font-semibold">
                {streak > 1 ? `${streak} dagar i rad! 🔥` : 'Dagens pass loggat! 💪'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {streak > 1 ? 'Fantastisk streak – fortsätt så!' : 'Första passet idag – bra jobbat!'}
              </p>
            </motion.div>

            {/* Streak stars */}
            {streak > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex gap-1"
              >
                {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.6 + i * 0.08, type: 'spring', stiffness: 400 }}
                  >
                    <Star size={14} className="fill-accent text-accent" />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
