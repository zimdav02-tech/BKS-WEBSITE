import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/site/SiteLayout";
import { services } from "@/data/services";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Services | Car Hire, Apartments, Logistics & More | BKS" },
      {
        name: "description",
        content:
          "Explore BKS services: car hire, airport shuttle, furnished apartments, real estate, construction, cargo & logistics, travel & tours, finance and corporate accounts.",
      },
      { property: "og:title", content: "BKS Services" },
      {
        property: "og:description",
        content: "Nine divisions covering mobility, housing, logistics, property, travel and finance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesIndex,
});

function ServicesIndex() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Services"
        title="Everything BKS can handle for you"
        subtitle="Book any service on its own, or combine several into one booking reference managed by a single team."
      />
      <section className="container-bks grid gap-5 py-20 sm:grid-cols-2 lg:grid-cols-3">
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
            <h2 className="mt-5 font-display text-lg font-semibold">{s.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
              {s.priceFrom ? `From ${s.priceFrom}` : "Learn more"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </section>
    </SiteLayout>
  );
}