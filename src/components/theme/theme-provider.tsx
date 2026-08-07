"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppTheme = "light" | "dark";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem("mercer-theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem("mercer-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("dark");

  useEffect(() => {
    const initialTheme = readStoredTheme();
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const setTheme = (nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
      title={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb" />
      </span>
      <span className="theme-toggle-label">{theme === "dark" ? "Mode sombre" : "Mode clair"}</span>
    </button>
  );
}
