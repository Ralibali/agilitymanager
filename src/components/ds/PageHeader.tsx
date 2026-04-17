import * as React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumb?: Crumb[];
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Konsekvent sidhuvud för alla v2-sidor.
 * Eyebrow (liten grå micro-label) + h1 + valfri undertitel + actions höger.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-7", className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="text-small text-text-tertiary mb-2 flex items-center gap-1.5">
          {breadcrumb.map((c, i) => (
            <React.Fragment key={i}>
              {c.to ? (
                <Link to={c.to} className="hover:text-text-secondary transition-colors">
                  {c.label}
                </Link>
              ) : (
                <span>{c.label}</span>
              )}
              {i < breadcrumb.length - 1 && <span aria-hidden>/</span>}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-micro text-text-tertiary uppercase mb-1.5">{eyebrow}</p>
          )}
          <h1 className="text-h1 text-text-primary">{title}</h1>
          {subtitle && (
            <p className="text-body text-text-secondary mt-1.5 max-w-[640px]">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
