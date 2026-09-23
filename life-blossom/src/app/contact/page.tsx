import type { Metadata } from "next";
import ContactMap from "@/components/ContactMap";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact Us — Life Blossom Cares & Cure Hospital",
  description:
    "Get in touch with Life Blossom Cares & Cure Hospital. Find us at 134 John Isaac Street, G.R.A. Ikeja, Lagos, Nigeria. Call +234 815 737 7000 or email hello@lifeblossomcares.com.ng.",
};

const contactInfo = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    label: "Address",
    value: "134 John Isaac Street, G.R.A. Ikeja, Lagos, Nigeria",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    label: "Phone",
    value: "+234 815 737 7000",
    href: "tel:+2348157377000",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </svg>
    ),
    label: "Email",
    value: "hello@lifeblossomcares.com.ng",
    href: "mailto:hello@lifeblossomcares.com.ng",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
      </svg>
    ),
    label: "Website",
    value: "www.lifeblossomcares.com.ng",
    href: "https://www.lifeblossomcares.com.ng",
  },
];

export default function ContactPage() {
  return (
    <>
      <Navbar />
      {/* Hero */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-blue-950 to-slate-950 py-16 sm:py-20">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-pattern opacity-20" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ring-pulse" />
            Contact Us
          </span>
          <h1 className="animate-fade-up mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl [animation-delay:120ms]">
            Get in Touch
          </h1>
          <p className="animate-fade-up mx-auto mt-4 max-w-2xl text-lg leading-8 text-blue-200/80 [animation-delay:240ms]">
            We&apos;re here to help. Reach out to us, visit our facility, or chat with us on WhatsApp.
          </p>
        </div>
      </section>

      {/* Contact info + map */}
      <section className="relative w-full bg-slate-950 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* Contact cards */}
            <div className="lg:col-span-2 space-y-4">
              {contactInfo.map((item) => (
                <div
                  key={item.label}
                  className="group flex items-start gap-4 rounded-xl border border-slate-800/60 bg-slate-900/50 p-5 transition-all duration-300 hover:border-blue-800/60 hover:shadow-lg hover:shadow-blue-900/20 hover:-translate-y-1"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-blue-200 group-hover:text-white transition-colors underline decoration-blue-800/50 group-hover:decoration-blue-400"
                        >
                          {item.value}
                        </a>
                      ) : (
                        item.value
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Map */}
            <div className="lg:col-span-3">
              <ContactMap />
            </div>
          </div>

          {/* WhatsApp CTA */}
          <div className="mt-8 flex justify-center">
            <a
              href="https://wa.me/+2348157377000"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-10 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/40 active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              Chat with Us on WhatsApp
              <span className="ml-1 opacity-70 group-hover:opacity-100 transition-opacity">→</span>
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
