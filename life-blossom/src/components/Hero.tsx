"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const slides = [
  {
    src: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80",
    alt: "A doctor consulting with a patient at Life Blossom hospital",
  },
  {
    src: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1600&q=80",
    alt: "A confident specialist doctor at Life Blossom hospital",
  },
  {
    src: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1600&q=80",
    alt: "A modern, calm hospital corridor at Life Blossom",
  },
];

const SLIDE_MS = 3000;

export default function Hero() {
  const [index, setIndex] = useState(0);

  // Auto-advance the carousel every 3 seconds.
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, []);

  // Brand mark scrolls the visitor back to the top of the page.
  function scrollToTop() {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <section className="relative -mt-16 w-full overflow-hidden bg-blue-950 sm:-mt-20 dark:bg-slate-950">
      {/* ---- Full-bleed sliding background ---- */}
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
              priority={i === 0}
              sizes="100vw"
              className={`object-cover ${
                i === index ? "animate-kenburns" : ""
              }`}
            />
          </div>
        ))}

        {/* Scrims so the white text stays readable on every photo */}
        <div className="absolute inset-0 z-20 bg-blue-950/60 dark:bg-slate-950/65" />
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-blue-950/70 via-transparent to-blue-950/85" />
        {/* Top scrim — keeps the transparent header readable over bright
            photos; deepens past the header height, fades out beneath it. */}
        <div className="absolute inset-x-0 top-0 z-20 h-20 bg-gradient-to-b from-blue-950/85 via-blue-950/45 to-transparent sm:h-24" />
      </div>

      {/* ---- Copy on top of the images ---- */}
      {/* Top padding = header height (pulled-up section) + original spacing,
          so the copy clears the transparent header. */}
      <div className="relative z-30 mx-auto max-w-4xl px-4 pb-20 pt-36 text-center sm:px-6 sm:pb-28 sm:pt-44">
        {/* Brand mark — sits with the copy, clear of the transparent header.
            Clicking it scrolls back to the top of the page. */}
        <div className="animate-fade-up mb-7 flex justify-center">
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Life Blossom Cares & Cure Hospital — scroll back to top"
            className="inline-block cursor-pointer rounded-2xl bg-white px-4 py-2.5 shadow-xl shadow-blue-950/25 transition-transform duration-300 hover:scale-105 active:scale-95"
          >
            <Image
              src="/logo.png"
              alt="Life Blossom Cares & Cure Hospital logo"
              width={120}
              height={120}
              priority
              className="h-14 w-auto sm:h-16"
            />
          </button>
        </div>

        <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-100 backdrop-blur [animation-delay:80ms]">
          <span className="animate-pulse-ring h-2 w-2 rounded-full bg-emerald-400" />
          Open 24/7 — Emergency care always available
        </span>

        <h1 className="animate-fade-up mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl [animation-delay:120ms]">
          Compassionate Care,{" "}
          <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-teal-200 bg-clip-text text-transparent">
            Modern Medicine
          </span>
        </h1>

        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-50/90 sm:text-xl [animation-delay:240ms]">
          At Life Blossom Cares &amp; Cure Hospital, experienced doctors and
          caring staff offer you gentle, round-the-clock medical care — from
          routine checkups to emergency treatment — in a calm, welcoming
          space built around your wellbeing.
        </p>

        {/* Buttons — stacked on phones, side by side on larger screens */}
        <div className="animate-fade-up mt-10 flex flex-col justify-center gap-4 sm:flex-row sm:items-center [animation-delay:360ms]">
          <a
            href="#book"
            className="electric-ring inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-8 text-base font-semibold text-white shadow-xl shadow-blue-950/40 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-950/50 hover:brightness-110 active:scale-95 sm:h-14"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
              <path d="M9 15h.01M12 15h.01M15 15h.01M9 18h.01M12 18h.01" />
            </svg>
            Book Appointment
          </a>
          <Link
            href="/login"
            className="electric-ring inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-white/15 px-8 text-base font-semibold text-white shadow-xl shadow-blue-950/30 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-2xl active:scale-95 sm:h-14"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
            Patient Login
          </Link>
          <a
            href="https://wa.me/2348157377000"
            target="_blank"
            rel="noopener noreferrer"
            className="electric-ring inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-8 text-base font-semibold text-white shadow-xl shadow-emerald-950/40 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-emerald-950/50 hover:brightness-110 active:scale-95 sm:h-14"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
            Chat on WhatsApp
          </a>
        </div>
      </div>

      {/* ---- Carousel controls ---- */}
      {/* Progress dots */}
      <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 sm:bottom-8">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            className="group relative h-1.5 w-8 overflow-hidden rounded-full bg-white/35 transition hover:bg-white/60 sm:w-10"
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

      {/* Prev / Next arrows (desktop only) */}
      <button
        type="button"
        onClick={() =>
          setIndex((i) => (i - 1 + slides.length) % slides.length)
        }
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur transition hover:bg-white/25 active:scale-90 sm:flex"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setIndex((i) => (i + 1) % slides.length)}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur transition hover:bg-white/25 active:scale-90 sm:flex"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>

      {/* Floating trust badges (large screens only) */}
      <div className="animate-float absolute right-6 top-24 z-30 hidden items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-left shadow-xl shadow-blue-950/30 backdrop-blur lg:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
        <span>
          <span className="block text-sm font-bold text-white">
            24/7 Emergency
          </span>
          <span className="block text-xs text-blue-100/80">
            Always here for you
          </span>
        </span>
      </div>

      <div
        className="animate-float absolute bottom-24 left-6 z-30 hidden items-center gap-3 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-left shadow-xl shadow-blue-950/30 backdrop-blur lg:flex"
        style={{ animationDelay: "1.5s" }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-400/20 text-sky-300">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <circle cx="12" cy="8" r="6" />
            <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
          </svg>
        </span>
        <span>
          <span className="block text-sm font-bold text-white">
            Expert Specialists
          </span>
          <span className="block text-xs text-blue-100/80">
            15+ years of experience
          </span>
        </span>
      </div>
    </section>
  );
}
