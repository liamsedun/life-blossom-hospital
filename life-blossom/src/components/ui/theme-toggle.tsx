"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lb-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(stored ? stored === "dark" : prefersDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("lb-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
    // Update status bar color to match theme
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next ? "#0a0f1a" : "#F7F9FC");
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center justify-center w-10 h-10 rounded-xl transition-all",
        "text-slate-500 hover:text-amber-500 hover:bg-amber-50",
        "dark:text-white/60 dark:hover:text-white dark:hover:bg-white/[0.08]",
        "bg-white/80 border border-slate-200 shadow-md",
        "dark:bg-white/[0.06] dark:border-white/[0.12] dark:shadow-none",
        "backdrop-blur-sm",
        className
      )}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
