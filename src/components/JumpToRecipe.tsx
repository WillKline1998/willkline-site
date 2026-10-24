"use client";

import { useEffect, useState } from "react";

/**
 * "Jump to recipe": the opposite of the usual recipe site. The recipe comes first on this page, so the button
 * appears once you have scrolled down to what comes after it (the story, the notes, the footer) and takes you back up.
 */
export function JumpToRecipe({ targetId }: { targetId: string }) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = document.getElementById(targetId);
      if (!el) return;
      const box = el.getBoundingClientRect();
      // Beyond the recipe = the top of the recipe is behind you AND the end of it is already on screen,
      // so anything below the recipe (the story, the notes, the footer) is in view.
      setPast(box.top < -40 && box.bottom < window.innerHeight);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targetId]);

  if (!past) return null;
  return (
    <button
      type="button"
      className="jump-to-recipe"
      onClick={() => {
        const el = document.getElementById(targetId);
        if (!el) return;
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
        el.focus({ preventScroll: true });
      }}
    >
      ↑ Jump to recipe
    </button>
  );
}
