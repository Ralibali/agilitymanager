import { CheckCircle2, Circle, Target as TargetIcon } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DSCard } from "./Card";
import { StatusBadge } from "./StatusBadge";

interface Props {
  title: string;
  description?: string;
  current?: number | null;
  target?: number | null;
  status: string;
  category?: string;
  targetDate?: string | null;
  dogName?: string;
  onClick?: () => void;
  className?: string;
}

export function GoalCard({
  title,
  description,
  current,
  target,
  status,
  category,
  targetDate,
  dogName,
  onClick,
  className,
}: Props) {
  const hasNumeric = typeof target === "number" && target > 0;
  const pct = hasNumeric ? Math.min(100, Math.round(((current ?? 0) / (target ?? 1)) * 100)) : 0;
  const completed = status === "completed";
  const overdue =
    !completed && targetDate && new Date(targetDate) < new Date();

  const variant: "success" | "warning" | "info" | "neutral" = completed
    ? "success"
    : overdue
      ? "warning"
      : "info";
  const statusLabel = completed
    ? "Avklarat"
    : overdue
      ? "Försenat"
      : status === "in_progress"
        ? "Pågår"
        : "Aktivt";

  return (
    <DSCard
      onClick={onClick}
      className={cn(
        onClick && "cursor-pointer hover:border-border-strong transition-colors",
        className,
      )}
    >
      <header className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            "shrink-0 w-9 h-9 rounded-ds-md flex items-center justify-center",
            completed ? "bg-semantic-success/10" : "bg-brand-50",
          )}
        >
          {completed ? (
            <CheckCircle2 className="w-4 h-4 text-semantic-success" />
          ) : (
            <TargetIcon className="w-4 h-4 text-brand-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3
              className={cn(
                "text-body font-medium text-text-primary truncate flex-1",
                completed && "line-through text-text-tertiary",
              )}
            >
              {title}
            </h3>
            <StatusBadge variant={variant} label={statusLabel} />
          </div>
          {(category || dogName) && (
            <p className="text-small text-text-tertiary mt-0.5 truncate">
              {[dogName, category].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </header>

      {description && (
        <p className="text-small text-text-secondary mb-3 line-clamp-2">{description}</p>
      )}

      {hasNumeric && (
        <div>
          <div className="flex items-center justify-between text-small mb-1.5">
            <span className="text-text-secondary tabular-nums">
              {current ?? 0} / {target}
            </span>
            <span className="text-text-tertiary tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-subtle overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                completed ? "bg-semantic-success" : "bg-brand-500",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {targetDate && (
        <p className="text-micro text-text-tertiary mt-3 inline-flex items-center gap-1">
          <Circle className="w-2 h-2" />
          Deadline {format(new Date(targetDate), "d MMM yyyy", { locale: sv })}
        </p>
      )}
    </DSCard>
  );
}
