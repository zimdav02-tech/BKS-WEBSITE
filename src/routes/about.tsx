import { createFileRoute } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About BKS Investment Group | Our Story & Values" },
      {
        name: "description",
        content:
          "BKS Investment Group is a diversified enterprise across mobility, hospitality, real estate, construction, logistics and finance. Learn about our mission and values.",
      },
      { property: "og:title", content: "About BKS Investment Group" },
      {
        property: "og:description",
        content: "A diversified enterprise delivering mobility, housing, logistics and corporate services.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const values = [
  { title: "Accountability", body: "One team owns your request from enquiry to completion." },
  { title: "Precision", body: "Documented workflows, timed handovers and verified assets." },
  { title: "Discretion", body: "Executive clients get confidentiality by default." },
  { title: "Longevity", body: "We build relationships and infrastructure, not transactions." },
];

function About() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About us"
        title="Built to remove friction from doing business"
        subtitle="BKS Investment Group brings nine operating divisions under one roof so clients can move, stay, build and ship without juggling vendors."
      />
      <section className="container-bks grid gap-14 py-24 md:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-bold">Our story</h2>
          <p className="mt-5 text-muted-foreground">
            BKS began with a small executive fleet and a simple promise: arrive on time, every time. As
            clients asked for more — a place to stay, a container moved, a house built — we built the
            capability rather than outsourcing the risk.
          </p>
          <p className="mt-4 text-muted-foreground">
            Today that means serviced apartments, a maintained fleet, cargo operations, property and
            construction, travel, and asset-backed finance, all coordinated through a single operations
            desk and a single customer dashboard.
          </p>
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold">What we stand for</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <h3 className="font-display text-base font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}