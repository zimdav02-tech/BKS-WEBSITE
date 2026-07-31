import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { services } from "@/data/services";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-gradient-ink text-ink-foreground">
      <div className="container-bks grid gap-12 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-gold font-display text-sm font-bold text-primary-foreground">
            BKS
          </span>
          <h2 className="mt-5 font-display text-2xl font-bold">Driven By Excellence</h2>
          <p className="mt-3 max-w-sm text-sm text-ink-foreground/70">
            One partner for mobility, housing, logistics, property and corporate services — booked,
            paid and tracked in one place.
          </p>
          <div className="mt-6 space-y-2 text-sm text-ink-foreground/80">
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-gold" /> +260 000 000 000
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-gold" /> hello@bksinvestmentgroup.com
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-gold" /> Head Office, Business District
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Services</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link
                  to="/services/$slug"
                  params={{ slug: s.slug }}
                  className="text-ink-foreground/70 transition-colors hover:text-gold"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Company</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              { to: "/about", label: "About Us" },
              { to: "/services", label: "All Services" },
              { to: "/contact", label: "Contact Us" },
              { to: "/auth", label: "Customer Portal" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-ink-foreground/70 transition-colors hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10">
        <div className="container-bks flex flex-col gap-2 py-6 text-xs text-ink-foreground/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BKS Investment Group. All rights reserved.</p>
          <p>Bookings · Payments · Logistics · Property</p>
        </div>
      </div>
    </footer>
  );
}