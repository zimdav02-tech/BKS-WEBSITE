import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock, ShieldCheck, Sparkles, Star } from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site/SiteLayout";
import { services } from "@/data/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BKS Investment Group | Driven By Excellence" },
      {
        name: "description",
        content:
          "Book car hire, airport shuttles, furnished apartments, logistics, property and corporate services with BKS Investment Group — one booking reference, one dashboard.",
      },
      { property: "og:title", content: "BKS Investment Group | Driven By Excellence" },
      {
        property: "og:description",
        content:
          "One partner for mobility, housing, logistics and corporate services. Book, pay and track everything in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const reasons = [
  {
    icon: ShieldCheck,
    title: "Verified and insured",
    body: "Every vehicle, apartment and partner is vetted, insured and maintained to a documented standard.",
  },
  {
    icon: Clock,
    title: "Always-on operations",
    body: "A 24/7 operations desk tracks your flight, your driver and your check-in so nothing slips.",
  },
  {
    icon: Sparkles,
    title: "One booking reference",
    body: "Combine apartment, airport pickup, car hire and tours into a single booking we manage together.",
  },
  {
    icon: CheckCircle2,
    title: "Transparent pricing",
    body: "Quoted upfront, invoiced clearly, with payment proof and receipts stored in your dashboard.",
  },
];

const testimonials = [
  {
    name: "Chanda M.",
    role: "Country Director, NGO",
    quote:
      "They handled airport pickup, a serviced apartment and a monthly vehicle on one invoice. Our team just arrives and works.",
  },
  {
    name: "Daniel O.",
    role: "Regional Operations Manager",
    quote:
      "Cargo moved on the date promised, with photos on delivery. The dashboard means I stop chasing people for updates.",
  },
  {
    name: "Priya S.",
    role: "Consultant",
    quote:
      "The apartment was stocked before I landed and housekeeping was on schedule the whole month. Genuinely premium.",
  },
];

const stats = [
  { value: "9", label: "Business divisions" },
  { value: "24/7", label: "Operations desk" },
  { value: "1", label: "Booking reference" },
  { value: "100%", label: "Vetted partners" },
];

function Index() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
        <img
          src={heroImage}
          alt="Executive vehicle waiting outside a modern BKS serviced apartment building at sunset"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/25" />
        <div className="container-bks relative py-28 md:py-40">
          <div className="max-w-2xl animate-rise">
            <span className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              BKS Investment Group
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] md:text-7xl">
              Driven By <span className="text-gradient-gold">Excellence</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-foreground/75">
              Mobility, housing, logistics, property and finance — delivered as one seamless service,
              booked and tracked from a single dashboard.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="xl" variant="gold">
                <Link to="/auth">
                  Book a Service <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="xl" variant="glass">
                <Link to="/contact">Request a Quote</Link>
              </Button>
              <Button asChild size="xl" variant="ghost" className="text-ink-foreground hover:bg-white/10">
                <Link to="/services">Explore Services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-background">
        <div className="container-bks grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-display text-3xl font-bold">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="container-bks py-24">
        <div className="grid gap-14 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              About BKS
            </p>
            <h2 className="mt-4 font-display text-4xl font-bold">
              A single group behind every part of your stay, move or project
            </h2>
            <p className="mt-5 text-muted-foreground">
              BKS Investment Group is a diversified enterprise operating across mobility, hospitality,
              real estate, construction, logistics and finance. Instead of coordinating five vendors,
              our clients work with one accountable team — and one invoice.
            </p>
            <p className="mt-4 text-muted-foreground">
              Every request is logged, reviewed and tracked through a documented workflow, so you always
              know exactly where your booking stands.
            </p>
            <Button asChild className="mt-8" variant="ink">
              <Link to="/about">
                Our story <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {reasons.map((r) => (
              <div
                key={r.title}
                className="rounded-3xl border border-border bg-card p-6 shadow-soft transition-transform duration-300 hover:-translate-y-1"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <r.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-muted/40 py-24">
        <div className="container-bks">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Featured services
              </p>
              <h2 className="mt-4 max-w-xl font-display text-4xl font-bold">
                Nine divisions. One booking engine.
              </h2>
            </div>
            <Button asChild variant="goldOutline">
              <Link to="/services">View all services</Link>
            </Button>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.slug}
                to="/services/$slug"
                params={{ slug: s.slug }}
                className="group rounded-3xl border border-border bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-gold"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-gold text-primary-foreground">
                  <s.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold">{s.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.tagline}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                  {s.priceFrom ? `From ${s.priceFrom}` : "Learn more"}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-bks py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Testimonials
        </p>
        <h2 className="mt-4 font-display text-4xl font-bold">Trusted by teams that can't afford delays</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-3xl border border-border bg-card p-7 shadow-soft">
              <div className="flex gap-1 text-gold" aria-label="Five star rating">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-muted-foreground">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 text-sm font-semibold">
                {t.name}
                <span className="block text-xs font-normal text-muted-foreground">{t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Partners */}
      <section className="border-y border-border bg-background py-12">
        <div className="container-bks">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Business partners
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 opacity-70 sm:grid-cols-3 lg:grid-cols-6">
            {["Zamair", "Northline", "Copperstone", "Meridian", "Kalahari", "Vertex"].map((p) => (
              <span key={p} className="text-center font-display text-lg font-semibold tracking-tight">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-bks py-24">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-ink p-10 text-ink-foreground md:p-16">
          <h2 className="max-w-2xl font-display text-4xl font-bold">
            Tell us what you need — we'll handle the rest.
          </h2>
          <p className="mt-4 max-w-xl text-ink-foreground/70">
            Create an account to book services, upload payment proof, chat with our team and follow every
            stage of your booking in real time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="gold">
              <Link to="/auth">Create your account</Link>
            </Button>
            <Button asChild size="lg" variant="glass">
              <Link to="/contact">Talk to our team</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
