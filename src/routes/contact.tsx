import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHero, SiteLayout } from "@/components/site/SiteLayout";
import { services } from "@/data/services";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact BKS Investment Group | Request a Quote" },
      {
        name: "description",
        content:
          "Talk to the BKS Investment Group team about car hire, apartments, logistics, property, construction or corporate accounts. Request a quote today.",
      },
      { property: "og:title", content: "Contact BKS Investment Group" },
      { property: "og:description", content: "Request a quote or speak to our operations desk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sending, setSending] = useState(false);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact us"
        title="Let's plan your next booking"
        subtitle="Send us the details and our operations desk will respond with a quote and availability."
      />
      <section className="container-bks grid gap-12 py-20 lg:grid-cols-[1.3fr_1fr]">
        <form
          className="rounded-3xl border border-border bg-card p-8 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            setSending(true);
            setTimeout(() => {
              setSending(false);
              toast.success("Message sent", {
                description: "Our team will get back to you shortly.",
              });
              (e.target as HTMLFormElement).reset();
            }, 700);
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required placeholder="Jane Banda" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="jane@company.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="+260 ..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="service">Service</Label>
              <Select name="service">
                <SelectTrigger id="service">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <Label htmlFor="message">How can we help?</Label>
            <Textarea id="message" name="message" required rows={6} placeholder="Tell us dates, locations and any specific requirements." />
          </div>
          <Button type="submit" variant="gold" size="lg" className="mt-6" disabled={sending}>
            {sending ? "Sending…" : "Send message"}
          </Button>
        </form>

        <aside className="space-y-4">
          {[
            { icon: Phone, label: "Call us", value: "+260 000 000 000" },
            { icon: Mail, label: "Email", value: "hello@bksinvestmentgroup.com" },
            { icon: MapPin, label: "Head office", value: "Business District, Head Office" },
          ].map((c) => (
            <div key={c.label} className="flex gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <c.icon className="size-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{c.label}</p>
                <p className="mt-1 font-medium">{c.value}</p>
              </div>
            </div>
          ))}
          <div className="rounded-3xl bg-gradient-ink p-6 text-ink-foreground">
            <p className="font-display text-lg font-semibold">Operations desk</p>
            <p className="mt-2 text-sm text-ink-foreground/70">
              Open 24/7 for active bookings, airport pickups and urgent logistics.
            </p>
          </div>
        </aside>
      </section>
    </SiteLayout>
  );
}