import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIInsightCardProps {
  title?: string;
  body: React.ReactNode;
  action?: React.ReactNode;
  size?: "default" | "compact";
  className?: string;
}

/**
 * Återanvändbart AI-insikt-kort. Lugn variant – ingen gradient, bara
 * subtle bakgrund + sparkles-ikon.
 */
export function AIInsightCard({
  title = "AI-insikt",
  body,
  action,
  size = "default",
  className,
}: AIInsightCardProps) {
  return (
    <div
      className={cn(
        "rounded-ds-lg border-[0.5px] border-border-subtle bg-subtle",
        size === "compact" ? "p-4" : "p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-ds-sm bg-surface border-[0.5px] border-border-subtle flex items-center justify-center shrink-0 text-brand-600">
          <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-micro text-text-tertiary uppercase mb-1">{title}</p>
          <div className="text-body text-text-primary">{body}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
