import ThemeToggle from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── Space backdrop (always visible) ── */}
      <div className="auth-space" aria-hidden="true" />
      <div className="auth-stars" aria-hidden="true" />
      <div className="auth-nebula" aria-hidden="true" />

      {/* ── Sun behind Earth ── */}
      <div className="auth-sun" aria-hidden="true" />
      <div className="auth-sun-corona" aria-hidden="true" />
      <div className="auth-sun-flare" aria-hidden="true" />

      {/* ── Moon (dark mode only) ── */}
      <div className="auth-moon" aria-hidden="true" />
      <div className="auth-moon-craters" aria-hidden="true" />
      <div className="auth-moonglow" aria-hidden="true" />

      {/* ── Earth globe ── */}
      <div className="auth-earth-container" aria-hidden="true">
        <div className="auth-earth" />
        <div className="auth-earth-atmosphere" />
        <div className="auth-earth-clouds" />
      </div>

      {/* ── Light mode: brighter space ── */}
      <div className="auth-light-overlay" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Theme toggle — top right, always visible */}
        <div className="fixed right-4 z-50" style={{ top: "calc(1rem + env(safe-area-inset-top, 0px))" }}>
          <ThemeToggle />
        </div>
        {children}
      </div>
    </>
  );
}
