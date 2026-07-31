import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { services } from "@/data/services";

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-panel">
      <div className="container-bks flex h-18 items-center justify-between gap-6 py-3">
        <Link to="/" className="flex items-center gap-3" aria-label="BKS Investment Group home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-gold font-display text-sm font-bold text-primary-foreground shadow-gold">
            BKS
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="font-display text-sm font-bold tracking-tight">BKS Investment Group</span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Driven by excellence
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Log in</Link>
          </Button>
          <Button asChild variant="gold">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>

        <Button
          variant="glass"
          size="icon"
          className="lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="container-bks grid gap-1 py-4">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {services.slice(0, 6).map((s) => (
                <Link
                  key={s.slug}
                  to="/services/$slug"
                  params={{ slug: s.slug }}
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-muted px-3 py-2 text-xs font-medium"
                >
                  {s.name}
                </Link>
              ))}
            </div>
            <Button asChild variant="gold" className="mt-3">
              <Link to="/auth" onClick={() => setOpen(false)}>
                Log in / Register
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}