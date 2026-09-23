"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

// Background slides — 3 of the "Take a Look Inside" facility photos.
const slides = [
  { src: "/facility-1.jpg", alt: "Life Blossom hospital reception area" },
  { src: "/facility-2.jpg", alt: "State-of-the-art hospital equipment" },
  { src: "/facility-3.jpg", alt: "Private ward room at Life Blossom" },
];

const SLIDE_MS = 3000;

const highlights = [
  {
    title: "Experienced & Certified Doctors",
    description:
      "Fully certified specialists with years of hands-on experience, committed to accurate diagnosis and personalised care.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  },
  {
    title: "24/7 Emergency",
    description:
      "Always here for you — our emergency and intensive care teams are on duty around the clock, every day of the year.",
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
      "Cutting-edge medical equipment and clean, comfortable facilities designed for precise treatment and a restful recovery.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <rect x="4" y="3" width="16" height="18" rx="1.5" />
        <path d="M9 21v-4h6v4" />
        <path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01" />
      </svg>
    ),
  },
];

export default function WhyChooseUs() {
  const [index, setIndex] = useState(0);

  // Auto-advance the background slides every 3 seconds.
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      id="why-choose-us"
      className="relative w-full overflow-hidden bg-blue-950 py-16 sm:py-24 dark:bg-slate-950"
    >
      {/* ---- Full-bleed sliding background (same pattern as the hero) ---- */}
      <div aria-hidden="true" className="absolute inset-0">
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
              i === index ? "z-10 opacity-100" : "z-0 opacity-0"
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="100vw"
              className={`object-cover ${
                i === index ? "animate-kenburns" : ""
              }`}
            />
          </div>
        ))}

        {/* Scrims so white text stays readable on every photo */}
        <div className="absolute inset-0 z-20 bg-blue-950/65 dark:bg-slate-950/70" />
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-blue-950/70 via-blue-950/40 to-blue-950/85" />
      </div>

      <div className="relative z-30 mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-100 backdrop-blur">
            Our promise
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Why Choose Us
          </h2>
          <p className="mt-4 text-lg leading-8 text-blue-100/90">
            Experienced doctors, round-the-clock emergency care, and modern
            facilities — everything you need, under one roof.
          </p>
        </Reveal>

        {/* Cards — single row on desktop */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {highlights.map((highlight, i) => (
            <Reveal key={highlight.title} delay={i * 120} className="h-full">
              <div className="group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-xl shadow-blue-950/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-white/40 hover:bg-white/15 hover:shadow-2xl">
                <span className="absolute -top-16 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 transition-all duration-500 group-hover:from-blue-400/40 group-hover:to-cyan-400/40" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-950/40 transition-transform duration-300 group-hover:scale-110">
                  {highlight.icon}
                </div>
                <h3 className="relative mt-5 text-lg font-semibold text-white">
                  {highlight.title}
                </h3>
                <p className="relative mt-2 text-sm leading-6 text-blue-100/85">
                  {highlight.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Progress dots — match the hero's autoplay rhythm */}
        <div className="mt-10 flex items-center justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className="group relative h-1.5 w-8 overflow-hidden rounded-full bg-white/30 transition hover:bg-white/60"
            >
              {i === index && (
                <span
                  key={`progress-${index}`}
                  className="animate-slide-progress absolute inset-0 rounded-full bg-white"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}