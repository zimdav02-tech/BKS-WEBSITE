import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHero, SiteLayout } from "@/components/site/SiteLayout";
import { getService } from "@/data/services";

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    const service = getService(params.slug);
    if (!service) throw notFound();
    return { name: service.name, tagline: service.tagline, description: service.description };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Service"} | BKS Investment Group` },
      { name: "description", content: loaderData?.description ?? "BKS Investment Group service." },
      { property: "og:title", content: `${loaderData?.name ?? "Service"} | BKS Investment Group` },
      { property: "og:description", content: loaderData?.tagline ?? "Driven by excellence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <SiteLayout>
      <PageHero title="This service couldn't load" subtitle="Please try again in a moment." />
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <PageHero title="Service not found" subtitle="The service you're looking for doesn't exist." />
    </SiteLayout>
  ),
  component: ServiceDetail,
});

function ServiceDetail() {
  const { slug } = Route.useParams();
  const service = getService(slug)!;

  return (
    <SiteLayout>
      <PageHero eyebrow="Service" title={service.name} subtitle={service.tagline} />

      <section className="container-bks grid gap-12 py-20 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-lg text-muted-foreground">{service.description}</p>

          <h2 className="mt-12 font-display text-2xl font-bold">What's included</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {service.highlights.map((h) => (
              <li
                key={h}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-soft"
              >
                <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                {h}
              </li>
            ))}
          </ul>

          <h2 className="mt-14 font-display text-2xl font-bold">Frequently asked</h2>
          <Accordion type="single" collapsible className="mt-4">
            {service.faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <aside className="h-fit rounded-3xl border border-border bg-card p-7 shadow-soft lg:sticky lg:top-28">
          {service.priceFrom && (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Starting from
              </p>
              <p className="mt-2 font-display text-3xl font-bold">{service.priceFrom}</p>
            </>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Sign in to submit a request. You'll get a booking reference, live status updates and an
            invoice in your dashboard.
          </p>
          <Button asChild variant="gold" className="mt-6 w-full">
            <Link to="/auth">Book this service</Link>
          </Button>
          <Button asChild variant="goldOutline" className="mt-3 w-full">
            <Link to="/contact">Request a quote</Link>
          </Button>
        </aside>
      </section>
    </SiteLayout>
  );
}