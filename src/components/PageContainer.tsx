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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      id="main-content"
      className="min-h-screen pb-20 px-4 pt-5 max-w-lg mx-auto"
    >
      {(title || action) && (
        <div className="flex items-start justify-between mb-5">
          <div className="space-y-0.5">
            {title && (
              <h1 className="text-xl font-semibold font-display text-foreground tracking-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-[13px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
}
