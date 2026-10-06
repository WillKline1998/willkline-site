"use client";

// Demo mode = "kaleidoscope glasses." Flips a data attribute on <html>;
// all effects live in CSS under [data-mode="demo"] (see globals.css) so
// new razzle-dazzle can be added without touching page components.
//
// State lives in localStorage and is read via useSyncExternalStore, which
// keeps server render ("normal") and client hydration in agreement.

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";

type Ctx = { demo: boolean; toggle: () => void };
const DemoModeContext = createContext<Ctx>({ demo: false, toggle: () => {} });

const STORAGE_KEY = "wk-demo-mode";
const EVENT = "wk-demo-mode-change";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // sync across tabs
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
const getSnapshot = () => localStorage.getItem(STORAGE_KEY) === "on";
const getServerSnapshot = () => false;

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const demo = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.dataset.mode = demo ? "demo" : "normal";
  }, [demo]);

  const toggle = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, demo ? "off" : "on");
    window.dispatchEvent(new Event(EVENT));
  }, [demo]);

  return <DemoModeContext.Provider value={{ demo, toggle }}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}

export function DemoToggle() {
  const { demo, toggle } = useDemoMode();
  return (
    <button
      onClick={toggle}
      aria-pressed={demo}
      className="demo-toggle rounded-full border border-current px-3 py-1 text-sm"
    >
      {demo ? "✕ Normal mode" : "✦ Demo mode"}
    </button>
  );
}
