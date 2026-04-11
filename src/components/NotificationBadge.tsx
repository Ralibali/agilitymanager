import { motion, AnimatePresence } from 'framer-motion';

interface NotificationBadgeProps {
  count: number;
  size?: 'sm' | 'md';
}

export function NotificationBadge({ count, size = 'sm' }: NotificationBadgeProps) {
  if (count === 0) return null;

  const sizeClasses = size === 'sm'
    ? 'w-4 h-4 text-[9px]'
    : 'w-5 h-5 text-[10px]';

  return (
    <AnimatePresence>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className={`absolute -top-1 -right-1 ${sizeClasses} rounded-full bg-destructive text-destructive-foreground font-bold flex items-center justify-center leading-none`}
      >
        {count > 9 ? '9+' : count}
      </motion.span>
    </AnimatePresence>
  );
}
