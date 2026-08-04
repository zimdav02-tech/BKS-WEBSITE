import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AdminPageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>}<h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p></div>{action}</div>;
}

export function AdminPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-border bg-card p-5 shadow-soft", className)}>{children}</section>;
}

export function KpiCard({ label, value, delta, to, icon: Icon }: { label: string; value: string; delta: string; to: string; icon: LucideIcon }) {
  return <Link to={to as never} className="group rounded-lg border border-border bg-card p-4 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-gold"><div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-md bg-accent text-accent-foreground"><Icon className="size-4" /></span><ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-foreground" /></div><p className="mt-4 text-xs font-semibold text-muted-foreground">{label}</p><div className="mt-1 flex items-end justify-between gap-2"><p className="font-display text-2xl font-bold">{value}</p><span className="text-[10px] font-semibold text-muted-foreground">{delta}</span></div></Link>;
}

export function AdminSkeleton() {
  return <div className="space-y-6"><Skeleton className="h-20 w-full" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-36" />)}</div><Skeleton className="h-80" /></div>;
}

export function StatusDot({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "danger" | "neutral" }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold", tone === "success" && "bg-primary/20 text-foreground", tone === "warning" && "bg-accent text-accent-foreground", tone === "danger" && "bg-destructive/10 text-destructive", tone === "neutral" && "bg-muted text-muted-foreground")}><span className={cn("size-1.5 rounded-full", tone === "success" ? "bg-primary" : tone === "danger" ? "bg-destructive" : "bg-muted-foreground")} />{label}</span>;
}