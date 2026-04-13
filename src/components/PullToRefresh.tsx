import { useState, useCallback, useRef, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

/**
 * Pull-to-refresh wrapper with green accent dot animation.
 * Wrap around scrollable page content.
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, 80], [0, 1]);
  const dotScale = useTransform(pullProgress, [0, 1], [0.3, 1]);
  const dotOpacity = useTransform(pullProgress, [0, 0.3, 1], [0, 0.5, 1]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback(async (_: any, info: PanInfo) => {
    if (info.offset.y > 80 && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10"
        style={{ height: y, overflow: 'hidden' }}
      >
        <motion.div
          className="flex items-center gap-1.5"
          style={{ opacity: dotOpacity }}
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: '#1a6b3c',
                scale: dotScale,
              }}
              animate={refreshing ? {
                scale: [0.5, 1, 0.5],
                transition: { duration: 0.6, repeat: Infinity, delay: i * 0.15 },
              } : {}}
            />
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.4, bottom: 0 }}
        onDragEnd={handleDragEnd}
        style={{ y }}
      >
        {children}
      </motion.div>
    </div>
  );
}
