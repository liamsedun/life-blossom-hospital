import type { Metadata } from "next";
import Doctors from "@/components/Doctors";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Our Doctors — Life Blossom Cares & Cure Hospital",
  description:
    "Meet the experienced, caring specialists at Life Blossom Cares & Cure Hospital.",
};

export default function DoctorsPage() {
  return (
    <>
      <Navbar />
      {/* Page header */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-blue-950 to-slate-950 py-12 sm:py-16">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-pattern opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-200/80 hover:text-white transition-colors mb-8"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="m15 18-6-6 6-6" /></svg>
              Back to Home
            </Link>
          <div className="flex flex-col items-center text-center">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-200">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              Available for consultation
            </span>
            <h1 className="animate-fade-up mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl [animation-delay:120ms]">
              Meet Our Doctors
            </h1>
            <p className="animate-fade-up mx-auto mt-4 max-w-xl text-lg leading-8 text-blue-200/80 [animation-delay:240ms]">
              Experienced, caring specialists ready to look after you and your family. Each doctor brings years of expertise and a commitment to your wellbeing.
            </p>
          </div>
        </div>
      </section>

      {/* Doctor cards */}
      <Doctors />

      {/* CTA section */}
      <section className="relative w-full bg-gradient-to-r from-blue-600 to-cyan-500 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            Ready to Book a Consultation?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-blue-100/90">
            Our doctors are available for appointments. Book online or call us.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/#book"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-sm font-semibold text-blue-700 shadow-lg transition hover:bg-blue-50 hover:-translate-y-0.5 active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              Book Appointment
            </Link>
            <a
              href="tel:+2348157377000"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white/20 backdrop-blur px-8 text-sm font-semibold text-white transition hover:bg-white/30 hover:-translate-y-0.5 active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              +234 815 737 7000
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
