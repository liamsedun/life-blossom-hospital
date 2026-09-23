import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import AboutHero from "@/components/AboutHero";

export const metadata: Metadata = {
  title: "About Us — Life Blossom Cares & Cure Hospital",
  description:
    "Learn about Life Blossom Cares & Cure Hospital — our story, vision, mission, values, and the medical team behind the care.",
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const values = [
  "Compassion",
  "Innovation",
  "Excellence",
  "Care",
  "Cure",
  "24/7 Emergency",
  "Patient First",
];

const whoWeAre = [
  {
    title: "Access for All",
    description:
      "We hope to expand healthcare access to underserved communities.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M3 12h4l2-7 4 14 2-7h6" />
      </svg>
    ),
  },
  {
    title: "Education & Research",
    description:
      "To maintain excellence in medical research and education.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    ),
  },
  {
    title: "Continuous Innovation",
    description: "Enhance patient care through continuous innovation.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2Z" />
      </svg>
    ),
  },
];

const drivesUs = [
  {
    title: "Our Vision",
    description:
      "To be a leading healthcare provider, setting the gold standard in medical excellence, patient care, and innovation.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "Our Mission",
    description:
      "To deliver exceptional and compassionate healthcare services, ensuring the well-being and recovery of our patients through advanced medical practices and a dedicated team.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    ),
  },
];

const whyChoose = [
  {
    title: "Expert Doctors",
    description:
      "Experienced and certified doctors in every specialty.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    ),
  },
  {
    title: "24/7 Emergency",
    description:
      "Round-the-clock emergency and intensive care, always ready.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    title: "Modern Facilities",
    description:
      "Cutting-edge diagnostics, labs, and medical technology.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-4h6v4" />
      </svg>
    ),
  },
  {
    title: "Patient First",
    description:
      "Compassionate, affordable care built around your needs.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M19 14c1.5-1.5 3-3.2 3-5.5A4.5 4.5 0 0 0 17.5 4c-1.7 0-3.2 1-4 2.4A4.9 4.9 0 0 0 9.5 4 4.5 4.5 0 0 0 5 8.5c0 2.3 1.5 4 3 5.5l4 4 7-4Z" />
      </svg>
    ),
  },
];

const insideSections = [
  {
    tag: "Certified",
    title: "Our Doctors",
    description:
      "Experienced & certified doctors dedicated to your health and recovery.",
    href: "/doctors",
    icon: (
      <svg {...iconProps} className="h-7 w-7">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    ),
  },
  {
    tag: "Always On",
    title: "Patient Care",
    description:
      "24/7 emergency & intensive care with rapid-response medical teams.",
    href: "/#book",
    icon: (
      <svg {...iconProps} className="h-7 w-7">
        <path d="M22 12h-4l-3 8-4-16-3 8H2" />
      </svg>
    ),
  },
  {
    tag: "Modern",
    title: "Hospital Facility",
    description:
      "Modern wards, advanced diagnostics, and comfortable recovery spaces.",
    href: "/#our-facility",
    icon: (
      <svg {...iconProps} className="h-7 w-7">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-4h6v4" />
        <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
      </svg>
    ),
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      {/* ============ Hero (sliding facility background) ============ */}
      <AboutHero />

      {/* ============ Stats band ============ */}
      <section className="w-full bg-blue-950 py-12 sm:py-16 dark:bg-slate-950">
        <Reveal className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 text-center sm:px-6 lg:grid-cols-4">
          {[
            { value: "15+", label: "Years of Excellence" },
            { value: "5+", label: "Expert Doctors" },
            { value: "99%", label: "Satisfaction Rate" },
            { value: "24/7", label: "Emergency Care" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wide text-blue-300">
                {stat.label}
              </p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ============ Values ticker ============ */}
      <section className="w-full overflow-hidden border-b border-slate-200/80 bg-white py-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex w-max animate-marquee gap-3">
          {[...values, ...values].map((value, index) => (
            <span
              key={`${value}-${index}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200/80 bg-blue-50/70 px-5 py-2 text-sm font-semibold text-blue-800 transition-colors hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:text-blue-300"
            >
              <svg
                {...iconProps}
                className="h-4 w-4 text-blue-500 dark:text-blue-400"
              >
                <path d="M3 12h4l2-7 4 14 2-7h6" />
              </svg>
              {value}
            </span>
          ))}
        </div>
      </section>

      {/* ============ Medical team band ============ */}
      <section className="relative w-full overflow-hidden">
        <div className="relative h-[440px] w-full sm:h-[500px]">
          <Image
            src="https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=1600&q=80"
            alt="Life Blossom medical team"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/95 via-blue-950/75 to-blue-900/30" />
          <Reveal className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
                Life Blossom medical team
              </p>
              <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Specialists you can trust, here around the clock
              </h2>
              <div className="mt-8 flex flex-wrap gap-4">
                <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 backdrop-blur transition-transform duration-300 hover:-translate-y-1">
                  <p className="text-3xl font-extrabold text-white">5+</p>
                  <p className="mt-1 text-sm font-medium text-blue-200">
                    Specialist Doctors
                  </p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 backdrop-blur transition-transform duration-300 hover:-translate-y-1">
                  <p className="text-3xl font-extrabold text-white">24/7</p>
                  <p className="mt-1 text-sm font-medium text-blue-200">
                    Emergency &amp; ICU
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ Who We Are ============ */}
      <section className="w-full bg-white py-16 sm:py-24 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
              Who We Are
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-blue-50">
              A Medical Team That Cares Deeply
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
              At Life Blossom Care &amp; Cure Hospital, we are committed to
              providing world-class healthcare services with compassion,
              innovation, and excellence. Our highly skilled medical team
              leverages cutting-edge technology to ensure the best possible
              patient outcomes.
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {whoWeAre.map((item, i) => (
              <Reveal key={item.title} delay={(i % 3) * 100} className="h-full">
                <div className="group flex h-full flex-col items-center rounded-2xl border border-slate-200/80 bg-blue-50/50 p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-900/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25 transition-transform duration-300 group-hover:scale-110">
                    {item.icon}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-blue-50">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ What Drives Us ============ */}
      <section className="w-full bg-blue-50/60 py-16 sm:py-24 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
              What Drives Us
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-blue-50">
              Vision, Mission &amp; Goals
            </h2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {drivesUs.map((item, i) => (
              <Reveal key={item.title} delay={(i % 3) * 100} className="h-full">
                <div className="group h-full rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-900/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                    {item.icon}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-blue-50">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            ))}

            {/* Goals card */}
            <Reveal delay={200} className="h-full">
              <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-900/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25">
                  <svg {...iconProps} className="h-6 w-6">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-blue-50">
                  Our Goals
                </h3>
                <ul className="mt-3 space-y-3">
                  {[
                    "Enhance patient care through continuous innovation.",
                    "Ensure affordability without compromising quality.",
                    "Promote a patient-first approach in all services.",
                  ].map((goal) => (
                    <li
                      key={goal}
                      className="flex items-start gap-3 text-sm leading-7 text-slate-600 dark:text-slate-300"
                    >
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ Visit us ============ */}
      <section className="w-full bg-white py-16 sm:py-24 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div className="group relative h-72 w-full overflow-hidden rounded-3xl shadow-lg shadow-blue-900/10 sm:h-96">
                <Image
                  src="https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=1200&q=80"
                  alt="Life Blossom hospital building"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
              </div>
            </Reveal>
            <Reveal delay={150}>
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
                Hospital Building
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-blue-50">
                Life Blossom Care &amp; Cure Hospital
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
                At Life Blossom Care &amp; Cure Hospital, we are dedicated to
                providing world-class healthcare services with a focus on
                compassion, innovation, and excellence. Our team of expert
                doctors, nurses, and healthcare professionals work tirelessly
                to ensure the well-being of every patient.
              </p>
              <Link
                href="/#contact"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-xl active:scale-95"
              >
                Visit Us Today
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ Why Choose Life Blossom ============ */}
      <section className="w-full bg-blue-50/60 py-16 sm:py-24 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
              Why Choose Life Blossom?
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-blue-50">
              Care That Puts You First
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Our patients are at the heart of everything we do. With
              cutting-edge medical facilities, compassionate professionals,
              and a commitment to innovation, we ensure that you receive the
              best possible care.
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyChoose.map((item, i) => (
              <Reveal key={item.title} delay={(i % 4) * 90} className="h-full">
                <div className="group h-full rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-900/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25 transition-transform duration-300 group-hover:scale-110">
                    {item.icon}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-blue-50">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Inside Life Blossom ============ */}
      <section className="w-full bg-white py-16 sm:py-24 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
              Inside Life Blossom
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-blue-50">
              World-Class Care, In Every Detail
            </h2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {insideSections.map((item, i) => (
              <Reveal key={item.title} delay={(i % 3) * 100} className="h-full">
                <div className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-blue-50/50 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-900/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25 transition-transform duration-300 group-hover:scale-110">
                      {item.icon}
                    </div>
                    <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-blue-50">
                    {item.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                  <Link
                    href={item.href}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    More info
                    <svg
                      {...iconProps}
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Final CTA ============ */}
      <section className="w-full bg-blue-950 py-16 text-center sm:py-20 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Your health, our priority — where care meets cure
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-blue-200">
              Join the Life Blossom family today and experience healthcare that
              truly cares.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/#book"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-xl active:scale-95"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                Book Appointment
              </Link>
              <Link
                href="/#services"
                className="inline-flex h-12 items-center justify-center rounded-full border border-blue-400/60 px-8 text-sm font-semibold text-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-900 active:scale-95"
              >
                Explore Our Services
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
      <Footer />
    </>
  );
}
