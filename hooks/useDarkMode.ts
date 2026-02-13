"use client";

import { useState, useEffect, useCallback } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize dark mode preference
  useEffect(() => {
    setIsMounted(true);

    // 1. Check localStorage first
    const saved = localStorage.getItem("cardapio-dark-mode");
    if (saved !== null) {
      const isDarkMode = saved === "true";
      setIsDark(isDarkMode);
      applyDarkMode(isDarkMode);
      return;
    }

    // 2. Check system preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(prefersDark);
    applyDarkMode(prefersDark);
  }, []);

  const applyDarkMode = useCallback((dark: boolean) => {
    const html = document.documentElement;
    if (dark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const newValue = !prev;
      localStorage.setItem("cardapio-dark-mode", String(newValue));
      applyDarkMode(newValue);
      return newValue;
    });
  }, [applyDarkMode]);

  return { isDark, toggle, isMounted };
}
