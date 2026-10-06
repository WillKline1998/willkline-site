// Single source of truth for the site's main sections.
// Nav, home page cards, and placeholder pages all read from here.

export type Section = {
  href: string;
  label: string;
  blurb: string;
  milestone: string; // which roadmap milestone brings it to life (see docs/PLAN.md)
};

export const sections: Section[] = [
  { href: "/music", label: "Music", blurb: "Albums, recordings, and performances.", milestone: "M2" },
  { href: "/cv", label: "CV", blurb: "Résumé, experience, and a downloadable copy.", milestone: "M2" },
  { href: "/media", label: "Media", blurb: "Photos, video, and press.", milestone: "M2" },
  { href: "/writing", label: "Writing", blurb: "Essays, notes, and ideas.", milestone: "M2" },
  { href: "/lab", label: "Lab", blurb: "Small music-software experiments and projects.", milestone: "M5" },
  { href: "/wall", label: "Inspiration Wall", blurb: "Share art and music you love; save others' finds.", milestone: "M4" },
];
