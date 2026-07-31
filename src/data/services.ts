import type { LucideIcon } from "lucide-react";
import {
  Car,
  Plane,
  Building2,
  Home,
  HardHat,
  Truck,
  Compass,
  Banknote,
  Briefcase,
} from "lucide-react";

export type Service = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  highlights: string[];
  priceFrom?: string;
  faqs: { q: string; a: string }[];
};

export const services: Service[] = [
  {
    slug: "car-hire",
    name: "Car Hire",
    tagline: "Executive vehicles, ready when you land.",
    description:
      "A curated fleet of sedans, SUVs and 4x4s maintained to executive standard, with or without a professional driver.",
    icon: Car,
    priceFrom: "$65 / day",
    highlights: [
      "Self-drive or chauffeur-driven",
      "Airport delivery and collection",
      "Comprehensive insurance included",
      "Long-term corporate rates",
    ],
    faqs: [
      { q: "What documents do I need?", a: "A valid driving licence, national ID or passport, and a refundable security deposit." },
      { q: "Is mileage limited?", a: "Standard hires include 200km per day; unlimited mileage is available on request." },
    ],
  },
  {
    slug: "airport-shuttle",
    name: "Airport Shuttle",
    tagline: "Met at arrivals, every single time.",
    description:
      "Flight-tracked airport transfers with meet-and-greet, luggage assistance and fixed pricing to any destination.",
    icon: Plane,
    priceFrom: "$35 / transfer",
    highlights: ["Live flight tracking", "60 minutes free waiting", "Meet & greet at arrivals", "24/7 availability"],
    faqs: [
      { q: "What if my flight is delayed?", a: "We track your flight number and adjust the pickup automatically at no extra cost." },
      { q: "Can you carry extra luggage?", a: "Yes — tell us your luggage count and we assign the right vehicle class." },
    ],
  },
  {
    slug: "furnished-apartments",
    name: "Furnished Apartments",
    tagline: "Move-in ready homes for nights, weeks or months.",
    description:
      "Fully serviced apartments with housekeeping, fast Wi-Fi, backup power and optional concierge extras.",
    icon: Building2,
    priceFrom: "$90 / night",
    highlights: ["Nightly, weekly and monthly rates", "Housekeeping included", "Backup power and water", "Airport pickup add-on"],
    faqs: [
      { q: "Is there a minimum stay?", a: "Two nights minimum; discounted rates start from seven nights." },
      { q: "Can you stock the kitchen before arrival?", a: "Yes — grocery shopping is available as a pre-arrival add-on." },
    ],
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    tagline: "Buy, rent and invest with confidence.",
    description:
      "Verified residential and commercial listings, guided viewings, and end-to-end transaction support.",
    icon: Home,
    highlights: ["Verified title documentation", "Guided property viewings", "Rental management", "Investment advisory"],
    faqs: [
      { q: "Do you handle due diligence?", a: "Every listing passes title and compliance checks before it is published." },
      { q: "Can I schedule a viewing online?", a: "Yes, request a viewing on any property and we confirm a slot within 24 hours." },
    ],
  },
  {
    slug: "construction",
    name: "Construction",
    tagline: "Design, build and project management.",
    description:
      "Residential and commercial builds delivered on programme, with transparent costing and site supervision.",
    icon: HardHat,
    highlights: ["Design & build", "Renovations and fit-outs", "Bill of quantities", "Certified site supervision"],
    faqs: [
      { q: "How are projects priced?", a: "We issue a detailed bill of quantities after a site visit and brief review." },
      { q: "Do you handle approvals?", a: "Yes, we coordinate architectural drawings and statutory approvals." },
    ],
  },
  {
    slug: "cargo-logistics",
    name: "Cargo & Logistics",
    tagline: "Move goods safely, on schedule.",
    description:
      "Local and cross-border cargo movement with tracked dispatch, dedicated vehicles and proof of delivery.",
    icon: Truck,
    highlights: ["Light to heavy cargo", "Cross-border clearance", "Tracked dispatch", "Proof of delivery"],
    faqs: [
      { q: "What cargo do you carry?", a: "General goods, household relocations, construction materials and palletised freight." },
      { q: "Is cargo insured?", a: "Goods-in-transit cover is available and recommended for high-value consignments." },
    ],
  },
  {
    slug: "travel-tours",
    name: "Travel & Tours",
    tagline: "Curated itineraries, handled end to end.",
    description: "Safari, city and business travel packages including transport, stays and guided experiences.",
    icon: Compass,
    priceFrom: "$180 / person",
    highlights: ["Custom itineraries", "Licensed guides", "Group and corporate travel", "Bundled with transport & stays"],
    faqs: [
      { q: "Can tours be customised?", a: "Every itinerary is built around your dates, budget and interests." },
      { q: "Do you handle group bookings?", a: "Yes, from small families to corporate retreats of 50+ guests." },
    ],
  },
  {
    slug: "get-cash",
    name: "BKS Get Cash",
    tagline: "Fast, transparent asset-backed advances.",
    description:
      "Short-term financing against approved collateral, with clear terms and a structured review process.",
    icon: Banknote,
    highlights: ["Asset-backed advances", "Transparent terms", "Structured review", "Confidential handling"],
    faqs: [
      { q: "How long does review take?", a: "Applications stay under review until documentation and collateral are verified — typically 2–5 working days." },
      { q: "What collateral is accepted?", a: "Vehicles, title deeds and other approved assets, subject to valuation." },
    ],
  },
  {
    slug: "corporate-services",
    name: "Corporate Services",
    tagline: "One partner for your company's operations.",
    description:
      "Consolidated accounts for staff transport, executive housing, logistics and travel under a single invoice.",
    icon: Briefcase,
    highlights: ["Single corporate account", "Consolidated monthly invoicing", "Dedicated account manager", "Custom SLAs"],
    faqs: [
      { q: "Can we get credit terms?", a: "Yes, 30-day terms are available after account approval." },
      { q: "Do you support multi-service contracts?", a: "That is the point — one reference covers housing, fleet and logistics." },
    ],
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);