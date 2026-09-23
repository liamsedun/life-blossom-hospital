import Image from "next/image";
import Link from "next/link";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/#services" },
  { label: "Doctors", href: "/doctors" },
  { label: "Contact", href: "/#contact" },
  { label: "Patient Login", href: "/login" },
  { label: "Staff Login", href: "/staff-login" },
];

const servicesLinks = [
  { label: "General Consultation", href: "/#service-general-consultation" },
  { label: "Laboratory Services", href: "/#service-laboratory-services" },
  { label: "Maternity Care", href: "/#service-maternity-care" },
  { label: "Emergency Care", href: "/#service-emergency-care" },
];

const socialLinks = [
  {
    label: "WhatsApp",
    href: "https://wa.me/2348157377000",
    hoverClass: "hover:bg-emerald-500 hover:border-emerald-500 hover:text-white hover:scale-110",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://facebook.com/lifeblossomhospitals",
    hoverClass: "hover:bg-blue-600 hover:border-blue-600 hover:text-white hover:scale-110",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M13.5 21v-7.2h2.4l.36-2.8h-2.76V9.1c0-.81.22-1.36 1.38-1.36h1.48V5.25c-.26-.03-1.13-.11-2.15-.11-2.13 0-3.59 1.3-3.59 3.69v2.06H8.22v2.8h2.4V21h2.88Z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://instagram.com/lifeblossomhospitals",
    hoverClass: "hover:bg-gradient-to-tr hover:from-amber-400 hover:via-pink-500 hover:to-purple-600 hover:border-transparent hover:text-white hover:scale-110",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/lifeblossomhospitals",
    hoverClass: "hover:bg-slate-900 hover:border-slate-900 hover:text-white hover:scale-110",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
        <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.84-6.32L5.46 21H2.38l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.16h1.7L7.4 4.74H5.57l11.1 14.42Z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden bg-blue-950 text-blue-100 dark:bg-slate-950">
      {/* Decorative background elements */}
      <div aria-hidden="true" className="absolute inset-0 bg-grid-pattern opacity-50" />
      <div aria-hidden="true" className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl animate-blob" />
      <div aria-hidden="true" className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-cyan-600/10 blur-3xl animate-blob" style={{ animationDelay: '6s' }} />

      {/* Top accent line with animated gradient */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-400/60 to-transparent animate-pulse-ring" />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {/* Main grid */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="Life Blossom Cares & Cure Hospital logo"
                  width={120}
                  height={120}
                  className="h-12 w-auto sm:h-14 drop-shadow-lg"
                />
                <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-emerald-400 animate-ring-pulse" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-white">Life Blossom</h3>
                <span className="text-xs text-blue-300/80">Cares &amp; Cure Hospital</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-blue-200/80 max-w-sm">
              Dedicated to providing compassionate, world-class healthcare to
              our community. Your health is our mission.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="relative text-sm font-semibold uppercase tracking-widest text-white">
              Quick Links
              <span className="absolute -bottom-1 left-0 h-0.5 w-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full" />
            </h4>
            <ul className="mt-5 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-blue-200/80 transition-all duration-300 hover:text-white hover:gap-3"
                  >
                    <span className="flex h-0.5 w-0 bg-blue-400 transition-all duration-300 group-hover:w-3 group-hover:bg-cyan-400" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="relative text-sm font-semibold uppercase tracking-widest text-white">
              Our Services
              <span className="absolute -bottom-1 left-0 h-0.5 w-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full" />
            </h4>
            <ul className="mt-5 space-y-3">
              {servicesLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-blue-200/80 transition-all duration-300 hover:text-white hover:gap-3"
                    replace
                  >
                    <span className="flex h-0.5 w-0 bg-blue-400 transition-all duration-300 group-hover:w-3 group-hover:bg-cyan-400" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Social */}
          <div>
            <h4 className="relative text-sm font-semibold uppercase tracking-widest text-white">
              Get in Touch
              <span className="absolute -bottom-1 left-0 h-0.5 w-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full" />
            </h4>
            <ul className="mt-5 space-y-4 text-sm">
              <li className="flex items-start gap-3 text-blue-200/80">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-300 text-xs">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                </span>
                <span>134 John Isaac Street,<br />G.R.A. Ikeja, Lagos</span>
              </li>
              <li className="flex items-center gap-3 text-blue-200/80">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-300 text-xs">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                </span>
                <a href="tel:+2348157377000" className="transition hover:text-white hover:translate-x-1">
                  0815 737 7000
                </a>
              </li>
              <li className="flex items-center gap-3 text-blue-200/80">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-300 text-xs">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
                </span>
                <a href="mailto:hello@lifeblossomcares.com.ng" className="transition hover:text-white hover:translate-x-1">
                  hello@lifeblossomcares.com.ng
                </a>
              </li>
            </ul>
            {/* Social buttons */}
            <div className="mt-6 flex flex-nowrap gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className={`electric-ring group relative flex h-10 w-10 items-center justify-center rounded-full border border-blue-800/60 bg-blue-900/40 text-blue-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-600/20 active:scale-90 ${social.hoverClass}`}
                >
                  {social.icon}
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </a >
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-blue-900/60 pt-6 text-center text-xs text-blue-300/70 sm:flex-row sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <p>© {new Date().getFullYear()} Life Blossom Cares &amp; Cure Hospital. All rights reserved.</p>
            <p className="hidden sm:inline">·</p>
            <p>Made with care in Lagos, Nigeria 🇳🇬</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/#services" className="hover:text-blue-200 transition-colors">Services</Link>
            <span className="h-px w-6 bg-blue-900/60" />
            <Link href="/#contact" className="hover:text-blue-200 transition-colors">Contact</Link>
            <span className="h-px w-6 bg-blue-900/60" />
            <Link href="/doctors" className="hover:text-blue-200 transition-colors">Doctors</Link>
          </div>
        </div>

        {/* Staff login button */}
        <div className="mt-6 flex justify-center">
          <Link
            href="/staff-login"
            className="electric-ring inline-flex h-11 items-center justify-center gap-2 rounded-full border border-blue-700/60 bg-blue-900/60 px-6 text-sm font-semibold text-blue-100 shadow-lg shadow-blue-950/40 transition hover:border-cyan-400/60 hover:text-white active:scale-[0.98]"
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            </svg>
            Staff Login
            <span className="text-xs text-blue-300/70">(Admin &amp; Staff Portal)</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}