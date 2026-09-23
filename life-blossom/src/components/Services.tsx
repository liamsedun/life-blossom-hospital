import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

/** URL-safe slug for deep-linking a service card (e.g. "Dental Care" → "dental-care"). */
export function serviceSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type Service = {
  title: string;
  description: string;
  icon: ReactNode;
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const services: Service[] = [
  {
    title: "General Consultation",
    description: "Expert doctors for everyday health concerns and checkups",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4a3 3 0 0 1 6 0" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    title: "Laboratory Services",
    description: "Fast, accurate blood work and diagnostic testing",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M10 2v6L4.5 17.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3.5L14 8V2" />
        <path d="M8.5 2h7" />
        <path d="M7 15h10" />
      </svg>
    ),
  },
  {
    title: "Pharmacy",
    description: "Quality medicines dispensed with clear guidance",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>
    ),
  },
  {
    title: "Maternity Care",
    description: "Gentle, complete care for mothers and newborns",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M19 14c1.5-1.5 3-3.2 3-5.5A4.5 4.5 0 0 0 12 5.2 4.5 4.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7 7-7Z" />
      </svg>
    ),
  },
  {
    title: "Pediatrics",
    description: "Friendly, specialised care for children of all ages",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
  {
    title: "Surgery",
    description: "Safe, modern surgical care from experienced surgeons",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    title: "Dental Care",
    description: "Healthy smiles with routine and advanced dentistry",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M7 3h10c1.7 0 3 1.3 3 3 0 1-.4 1.8-.9 2.6-.7 1.2-1.1 2.6-1.1 4 0 1.6.6 2.9.6 4.4 0 1.7-1.2 3-2.7 3-1.4 0-2.1-1-2.6-2.3-.3-.9-.7-1.7-1.3-1.7s-1 .8-1.3 1.7C11.1 17.9 10.4 19 9 19c-1.5 0-2.7-1.3-2.7-3 0-1.5.6-2.8.6-4.4 0-1.4-.4-2.8-1.1-4C5.4 6.8 5 6 5 5c0-1.7 1.3-3 3-3Z" />
      </svg>
    ),
  },
  {
    title: "Radiology",
    description: "Precise imaging — X-rays, scans, and ultrasound",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <circle cx="7" cy="7" r="3" />
        <circle cx="17" cy="7" r="3" />
        <circle cx="7" cy="17" r="3" />
        <circle cx="17" cy="17" r="3" />
        <path d="M10 7h4M7 10v4M17 10v4M10 17h4" />
      </svg>
    ),
  },
  {
    title: "Emergency Care",
    description: "24/7 emergency team ready when every minute counts",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
];

export default function Services() {
  return (
    <section id="services" className="relative w-full overflow-hidden bg-white py-16 sm:py-24 dark:bg-slate-950">
      {/* Ambient accents */}
      <div aria-hidden="true" className="bg-grid-pattern absolute inset-0" />
      <div
        aria-hidden="true"
        className="animate-blob absolute -right-32 top-10 h-96 w-96 rounded-full bg-cyan-100/50 blur-3xl dark:bg-cyan-500/10"
      />
      <div
        aria-hidden="true"
        className="animate-blob absolute -left-32 bottom-10 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl [animation-delay:5s] dark:bg-blue-500/10"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
            What we do
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-blue-50">
            Our{" "}
            <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
              Services
            </span>
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
            A full range of medical care under one roof, delivered with warmth
            and expertise.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <Reveal key={service.title} delay={(i % 3) * 100} className="h-full">
              <div
                id={`service-${serviceSlug(service.title)}`}
                className="group relative flex h-full scroll-mt-24 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-900/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                {/* Top accent that grows on hover */}
                <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-blue-600 to-cyan-400 transition-transform duration-500 group-hover:scale-x-100" />
                <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  {service.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-blue-50">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {service.description}
                </p>
                <a
                  href="#book"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Book this service
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}