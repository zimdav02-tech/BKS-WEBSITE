import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="bg-gradient-ink text-ink-foreground">
      <div className="container-bks py-20 md:py-24">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
        )}
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-ink-foreground/70">{subtitle}</p>}
      </div>
    </section>
  );
}