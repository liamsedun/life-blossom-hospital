"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/#services" },
  { label: "Doctors", href: "/doctors" },
  { label: "Contact", href: "/#contact" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Mirror the theme applied by the inline script in layout.tsx into React
  // state so the toggle icon matches. Deferred one frame so we don't set
  // state synchronously during the effect (keeps React's lint happy).
  useEffect(() => {
    const stored = localStorage.getItem("lb-theme");
    const prefersDark =
      !stored && window.matchMedia("(prefers-color-scheme: dark)").matches;
    requestAnimationFrame(() => {
      setTheme(stored === "dark" || prefersDark ? "dark" : "light");
    });
  }, []);

  // Track scroll so the header can sit transparent over the hero photos and
  // gain its solid background once the visitor scrolls down.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    const raf = requestAnimationFrame(onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Only the homepage has the full-bleed hero under the header.
  const overHero = pathname === "/" && !scrolled;

  // Current page match for the electric "active" state (Services/Contact are
  // hash links on the homepage, so they never hard-match a pathname).
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("lb-theme", next);
  }

  return (
    <header
      data-over-hero={overHero ? "true" : undefined}
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        overHero
          ? "border-transparent bg-transparent"
          : "border-slate-200/80 bg-white/85 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-950/85"
      }`}
    >
      <nav className="flex h-16 items-center justify-end px-3 sm:h-20 sm:px-5">
        {/* Right-hand cluster: links + theme toggle + CTA
            (logo moved into the hero on the homepage) */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Links (desktop) — right side of the header */}
          <ul className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`electric-nav-item text-sm font-semibold ${
                    isActive(link.href) ? "active" : ""
                  }`}
                >
                  <span className="relative z-10">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className={`electric-ring inline-flex h-11 w-11 items-center justify-center rounded-full border transition active:scale-90 ${
              overHero
                ? "border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/25"
                : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-400"
            }`}
          >
            {theme === "dark" ? (
              /* Sun */
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              /* Moon */
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>

          {/* Patient Login (desktop) */}
          <Link
            href="/login"
            className="electric-ring hidden h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:shadow-blue-600/50 hover:brightness-110 active:scale-95 md:inline-flex"
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
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
            Patient Login
          </Link>

          {/* Hamburger toggle (mobile) */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className={`electric-ring inline-flex h-11 w-11 items-center justify-center rounded-full border transition active:scale-90 md:hidden ${
              overHero
                ? "border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/25"
                : "border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-5 w-5"
            >
              {menuOpen ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <div
        className={`grid overflow-hidden border-t border-slate-200 bg-white px-4 transition-all duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 md:hidden ${
          menuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <ul className="flex flex-col gap-1 py-3">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`electric-nav-item block text-base font-medium ${
                    isActive(link.href) ? "active" : ""
                  }`}
                >
                  <span className="relative z-10">{link.label}</span>
                </Link>
              </li>
            ))}
            <li className="mt-2 px-1 pb-1">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="electric-ring flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:brightness-110 active:scale-[0.98]"
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
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
                </svg>
                Patient Login
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}