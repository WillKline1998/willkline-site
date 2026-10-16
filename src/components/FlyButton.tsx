"use client";

import { FLY_EVENT, type FlyDetail } from "@/components/CleanupMap";

/** A list entry that sends the globe to a clean-up. Falls back to doing nothing if the map isn't drawn. */
export function FlyButton({ bounds, children }: { bounds: FlyDetail; children: React.ReactNode }) {
  return (
    <button type="button" className="cleanup-fly" onClick={() => window.dispatchEvent(new CustomEvent(FLY_EVENT, { detail: bounds }))}>
      {children}
    </button>
  );
}
