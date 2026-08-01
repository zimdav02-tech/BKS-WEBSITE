import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PanelCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border bg-card p-6 shadow-soft transition-shadow duration-300 hover:shadow-gold/30",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  to,
  actionLabel,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  to?: string;
  actionLabel?: string;
  loading?: boolean;
}) {
  return (
    <div className="group rounded-3xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-gold">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground transition-colors group-hover:bg-gradient-gold">
          <Icon className="size-5" aria-hidden />
        </span>
        {loading ? (
          <Skeleton className="h-8 w-10" />
        ) : (
          <span className="font-display text-3xl font-bold tabular-nums">{value}</span>
        )}
      </div>
      <p className="mt-4 text-sm font-semibold">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {to && actionLabel && (
        <Button asChild variant="link" size="sm" className="mt-2 h-auto px-0">
          <Link to={to}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  to,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  to?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center animate-rise">
      <span className="grid size-14 place-items-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-gold">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && to && (
        <Button asChild variant="gold" className="mt-6">
          <Link to={to}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && !to && onAction && (
        <Button variant="gold" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-3xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <h3 className="mt-4 font-display text-base font-semibold">Something went wrong</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {message ?? "We couldn't load this section."}
      </p>
      <Button variant="goldOutline" className="mt-5" onClick={onRetry}>
        <RefreshCw /> Retry
      </Button>
    </div>
  );
}

export function CardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <Skeleton className="mt-4 h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <Skeleton className="mt-5 h-24 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/** Horizontal (desktop) / vertical (mobile) progress timeline. */
export function StageTimeline({
  stages,
  currentIndex,
}: {
  stages: string[];
  currentIndex: number;
}) {
  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-0">
      {stages.map((stage, i) => {
        const done = i <= currentIndex;
        return (
          <li key={stage} className="flex flex-1 items-center gap-3 sm:block">
            <div className="flex items-center sm:w-full">
              <span
                aria-hidden
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold transition-colors duration-500",
                  done
                    ? "border-transparent bg-gradient-gold text-primary-foreground shadow-gold"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              {i < stages.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "hidden h-0.5 flex-1 transition-colors duration-500 sm:block",
                    i < currentIndex ? "bg-gradient-gold" : "bg-border",
                  )}
                />
              )}
            </div>
            <p
              className={cn(
                "text-xs sm:mt-2 sm:pr-3",
                done ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {stage}
            </p>
          </li>
        );
      })}
    </ol>
  );
}