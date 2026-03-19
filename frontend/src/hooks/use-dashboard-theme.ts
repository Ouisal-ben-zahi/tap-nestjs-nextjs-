"use client";

import { useEffect, useState } from "react";

type DashboardTheme = "dark" | "light";
const DASHBOARD_THEME_KEY = "dashboard-theme";
const DASHBOARD_THEME_EVENT = "dashboard-theme-change";

function getSavedDashboardTheme(): DashboardTheme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(DASHBOARD_THEME_KEY);
  return saved === "light" || saved === "dark" ? saved : "dark";
}

export function useDashboardTheme() {
  const [theme, setTheme] = useState<DashboardTheme>(() => getSavedDashboardTheme());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncTheme = () => {
      setTheme(getSavedDashboardTheme());
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === DASHBOARD_THEME_KEY) {
        syncTheme();
      }
    };

    window.addEventListener(DASHBOARD_THEME_EVENT, syncTheme);
    window.addEventListener("storage", onStorage);
    syncTheme();

    return () => {
      window.removeEventListener(DASHBOARD_THEME_EVENT, syncTheme);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return theme;
}
