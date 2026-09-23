"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";

const tips = [
  {
    title: "Stay Hydrated",
    description:
      "Drink at least 8 glasses of water daily to keep your body functioning at its best.",
  },
  {
    title: "Eat a Balanced Diet",
    description:
      "Fill your plate with fruits, vegetables, lean proteins, and whole grains for optimal health.",
  },
  {
    title: "Get Enough Sleep",
    description:
      "Aim for 7-9 hours of quality sleep each night to boost immunity and brain function.",
  },
  {
    title: "Stay Active",
    description:
      "Exercise regularly, even if it's just a daily walk, to keep your heart and muscles strong.",
  },
  {
    title: "Manage Stress",
    description:
      "Practice mindfulness, deep breathing, or hobbies to maintain mental well-being.",
  },
  {
    title: "Schedule Regular Check-Ups",
    description:
      "Prevention is key! Regular medical check-ups help detect and prevent health issues early.",
  },
];

// Background slides — the 3 hospital photos shared with "Take a Look Inside".
const slides = [
  { src: "/facility-7.jpg", alt: "Reception and waiting lounge at the hospital" },
  { src: "/facility-8.jpg", alt: "Modern hospital building exterior" },
  { src: "/facility-9.jpg", alt: "Hospital entrance and driveway" },
];

const SLIDE_MS = 3000;

export default function HealthTips() {
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
      id="health-tips"
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

        {/* Scrims so the white tip cards stay readable on every photo */}
        <div className="absolute inset-0 z-20 bg-blue-950/65 dark:bg-slate-950/70" />
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-blue-950/70 via-blue-950/40 to-blue-950/85" />
      </div>

      <div className="relative z-30 mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-100 backdrop-blur">
            Health Tips
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            6 Essential{" "}
            <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-teal-200 bg-clip-text text-transparent">
              Health Tips
            </span>{" "}
            for a Better Life
          </h2>
          <p className="mt-4 text-lg leading-8 text-blue-100/90">
            Small daily habits lead to big health improvements. Here are our
            top recommendations for a healthier, happier you.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip, index) => (
            <Reveal
              key={tip.title}
              delay={(index % 3) * 100}
              className="h-full"
            >
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-7 shadow-xl shadow-blue-950/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-white/40 hover:bg-white/15 hover:shadow-2xl">
                <span className="absolute right-5 top-5 text-5xl font-black leading-none text-white/20 transition-colors duration-300 group-hover:text-white/30">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-950/40 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M12 8v4M12 16h.01" />
                    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <h3 className="relative mt-5 text-lg font-semibold text-white">
                  {tip.title}
                </h3>
                <p className="relative mt-2 text-sm leading-6 text-blue-100/85">
                  {tip.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Progress dots — match the 3s autoplay rhythm */}
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