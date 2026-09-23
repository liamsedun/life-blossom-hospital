"use client";

// Decorative animated backdrop for the login pages. Light mode shows a soft
// drifting gradient with floating particles; dark mode shows a moonlit
// desert night (twinkling stars, breathing moon, dunes, sand wisps and a
// walking caravan). Purely visual — aria-hidden so screen readers skip it.
const PARTICLES = [
  { left: "6%", top: "78%", delay: "0s", duration: "11s", size: 5 },
  { left: "14%", top: "62%", delay: "3s", duration: "14s", size: 3 },
  { left: "24%", top: "85%", delay: "6s", duration: "12s", size: 6 },
  { left: "33%", top: "70%", delay: "1.5s", duration: "15s", size: 4 },
  { left: "44%", top: "88%", delay: "4.5s", duration: "10s", size: 5 },
  { left: "55%", top: "66%", delay: "7s", duration: "13s", size: 3 },
  { left: "63%", top: "82%", delay: "2s", duration: "16s", size: 6 },
  { left: "72%", top: "74%", delay: "5s", duration: "11s", size: 4 },
  { left: "81%", top: "90%", delay: "8s", duration: "12s", size: 5 },
  { left: "90%", top: "68%", delay: "0.5s", duration: "14s", size: 3 },
  { left: "95%", top: "84%", delay: "3.5s", duration: "10s", size: 4 },
  { left: "48%", top: "58%", delay: "9s", duration: "13s", size: 3 },
];

export default function LoginBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* ---- Light mode: soft gradient + drifting blobs + grid ---- */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:hidden" />
      <div className="bg-grid-pattern absolute inset-0 opacity-30 dark:hidden" />
      <div className="animate-blob absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl dark:hidden" />
      <div className="animate-blob absolute top-1/3 -right-28 h-80 w-80 rounded-full bg-cyan-200/50 blur-3xl [animation-delay:4s] dark:hidden" />
      <div className="animate-blob absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl [animation-delay:7s] dark:hidden" />

      {/* ---- Floating particles (both modes) ---- */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="lb-particle bg-blue-400/40 dark:bg-cyan-200/30"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}

      {/* ---- Dark mode: moonlit desert night ---- */}
      <div className="absolute inset-0 hidden bg-gradient-to-b from-[#141b30] via-[#0b1120] to-[#060912] dark:block" />
      <div className="lb-stars hidden dark:block" />
      <div className="lb-moonglow hidden dark:block" />
      <div className="lb-moon hidden dark:block" />
      <div className="lb-sand-wisp hidden dark:block" />
      <div className="lb-sand-wisp two hidden dark:block" />
      <div className="lb-caravan hidden dark:block">
        <svg viewBox="0 0 40 26">
          <path d="M2 24c0-5 3-9 6-9 2-6 8-6 9 0 3 0 4 3 4 5 3-2 6 0 6 3 0 1-1 1-2 1H3c-1 0-1 0-1-0z" />
        </svg>
        <svg viewBox="0 0 40 26">
          <path d="M2 24c0-5 3-9 6-9 2-6 8-6 9 0 3 0 4 3 4 5 3-2 6 0 6 3 0 1-1 1-2 1H3c-1 0-1 0-1-0z" />
        </svg>
        <svg viewBox="0 0 40 26">
          <path d="M2 24c0-5 3-9 6-9 2-6 8-6 9 0 3 0 4 3 4 5 3-2 6 0 6 3 0 1-1 1-2 1H3c-1 0-1 0-1-0z" />
        </svg>
      </div>
      <div className="absolute inset-x-0 bottom-0 hidden h-[46vh] dark:block">
        <div className="lb-dune h-[22vh] bg-[#0e1424]" style={{ bottom: "-4vh" }} />
        <div className="lb-dune h-[16vh] bg-[#141b30] opacity-90" style={{ bottom: "-2vh" }} />
        <div className="lb-dune h-[10vh] bg-[#1b2440]" />
      </div>
    </div>
  );
}