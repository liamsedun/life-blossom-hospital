"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export default function StaffLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const cardRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [doorState, setDoorState] = useState<"idle" | "dooropen" | "out" | "success">("idle");
  const [statusText, setStatusText] = useState("");

  // Card tilt on pointer move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!cardRef.current) return;
    const nx = e.clientX / window.innerWidth - 0.5;
    cardRef.current.style.setProperty("--ry", nx * 9 + "deg");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (doorState === "dooropen") return;

    setDoorState("dooropen");
    setStatusText("Signing you in…");

    await new Promise((r) => setTimeout(r, 650));
    setDoorState("out");
    await new Promise((r) => setTimeout(r, 350));

    try {
      await login({ loginType: "email", email, password });
      setDoorState("success");
      setStatusText("");
      setTimeout(() => { router.push("/admin"); }, 800);
    } catch (err: any) {
      setError(err.message || "Login failed");
      setDoorState("idle");
      setStatusText("");
    }
  };

  const btnClass = [
    "auth-btn",
    doorState === "dooropen" && "dooropen",
    doorState === "out" && "out",
    doorState === "success" && "success",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form
      ref={cardRef}
      className="auth-card"
      onPointerMove={handlePointerMove}
      onSubmit={handleSubmit}
      noValidate
    >
      {/* Back to Home */}
      <Link
        href="/"
        className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:text-white/60 dark:hover:text-white transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Back to Home
      </Link>

      {/* Brand logo */}
      <div className="flex justify-center mb-5">
        <img src="/logo.png" alt="Life Blossom Care & Cure Hospital" className="h-16 w-auto object-contain drop-shadow-lg" />
      </div>

      <h1>Staff Portal</h1>
      <p className="subtitle">Sign in to the admin & staff dashboard</p>

      {/* Email field */}
      <div className="auth-field">
        <input
          id="staff-email"
          type="email"
          placeholder=" "
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="staff-email">Email</label>
      </div>

      {/* Password field */}
      <div className="auth-field">
        <input
          id="staff-password"
          type={showPassword ? "text" : "password"}
          placeholder=" "
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label htmlFor="staff-password">Password</label>
        <button
          type="button"
          className="auth-toggle-pw"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {/* Remember + Forgot */}
      <div className="auth-row">
        <label>
          <input type="checkbox" /> Remember me
        </label>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-sm bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* Sign In button */}
      <button type="submit" className={btnClass} disabled={doorState !== "idle"}>
        <span className="label">
          {doorState === "success" ? "Welcome back!" : "Sign In"}
        </span>
        <span className="scene">
          <span className="walker" />
          <span className="door" />
        </span>
      </button>
      <p className={`auth-status ${statusText ? "show" : ""}`}>{statusText}</p>

      {/* Divider */}
      <div className="auth-divider">or continue with</div>

      {/* OAuth — Google only */}
      <div className="auth-oauth">
        <button type="button">
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.2 2.7-2.5 3.6v3h4C22.2 19 23.5 15.9 23.5 12.3z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-4-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4.1v3.1C3.4 21.3 7.4 24 12 24z" />
            <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.6H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l4.1-3z" />
            <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.7l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.3 6.6l4.1 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
          </svg>
          Continue with Google
        </button>
      </div>

      {/* Footer */}
      <p className="auth-footnote">
        New to Life Blossom? Contact the Hospital ADMIN to create your account.
      </p>
      <p className="auth-footnote mt-2">
        <Link href="/login" className="text-[#2dd4bf]">Patient? Login via Patient Portal</Link>
      </p>
    </form>
  );
}
