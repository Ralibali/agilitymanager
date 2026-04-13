import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageContainerProps {
  children: ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  action?: ReactNode;
}

export function PageContainer({ children, title, subtitle, action }: PageContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      id="main-content"
      className="min-h-screen pb-20 px-4 pt-4 max-w-lg mx-auto"
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h1 className="text-2xl font-bold font-display text-foreground">{title}</h1>}
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </motion.div>
  );
}
