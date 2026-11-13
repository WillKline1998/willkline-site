// Lab tech chips: the registry behind the Wikipedia-style preview cards (TechChip.tsx).
//
// THE STANDARD for every Lab entry: each technology listed on a project needs an entry here with a 2–3 sentence
// plain-English blurb (what it is + what it does in this project) and, where one exists, a logo.
// Logos are from Simple Icons (CC0-1.0, https://simpleicons.org) saved in public/tech/; the marks themselves
// are their owners' trademarks, used only to identify the technology. Entries without a logo show text only.

export type TechInfo = { logo?: string; blurb: string };

export const TECH: Record<string, TechInfo> = {
  "Next.js": {
    logo: "/tech/nextdotjs.svg",
    blurb:
      "The React framework this site runs on. It renders each page on the server so it loads fast, and handles routing, forms and the admin area in one codebase.",
  },
  React: {
    logo: "/tech/react.svg",
    blurb:
      "A JavaScript library for building interfaces out of small reusable components. Every page, form and widget here (and the Headroom widget's UI) is made of React components.",
  },
  TypeScript: {
    logo: "/tech/typescript.svg",
    blurb:
      "JavaScript with types: you declare what shape your data has. It catches whole classes of mistakes before the code ever runs, which matters on a site with logins and uploads.",
  },
  "Tailwind CSS": {
    logo: "/tech/tailwindcss.svg",
    blurb:
      "A CSS toolkit of small utility classes. Here it supplies the base styles and reset, with the site's own design layered on top in plain CSS.",
  },
  PostgreSQL: {
    logo: "/tech/postgresql.svg",
    blurb:
      "A widely used open-source database. It stores everything on the site that changes: posts, the wall, recipes, the songbook, photos and accounts.",
  },
  Prisma: {
    logo: "/tech/prisma.svg",
    blurb:
      "A database toolkit that turns the data model into typed code. The app reads and writes PostgreSQL through it, and it manages database migrations.",
  },
  Neon: {
    blurb:
      "A hosted, serverless PostgreSQL service. The live site's database runs on Neon, connected through Vercel.",
  },
  Vercel: {
    logo: "/tech/vercel.svg",
    blurb:
      "The hosting platform that builds and serves the site. Every push to GitHub becomes a new deploy, and branches get their own preview links.",
  },
  "Vercel Blob": {
    logo: "/tech/vercel.svg",
    blurb:
      "Vercel's file storage. Uploaded photos, PDFs and other files live here, while the database just keeps a pointer to each one.",
  },
  sharp: {
    logo: "/tech/sharp.svg",
    blurb:
      "A fast image-processing library for Node.js. It resizes and compresses uploaded photos so pages stay quick.",
  },
  "react-markdown": {
    logo: "/tech/markdown.svg",
    blurb:
      "Renders Markdown, the plain-text formatting style, as HTML inside React. Posts and Lab write-ups are typed as Markdown and shown with it.",
  },
  Playwright: {
    blurb:
      "A tool that drives real browsers automatically. The site's end-to-end tests use it to click through pages and forms like a visitor would.",
  },
  Python: {
    logo: "/tech/python.svg",
    blurb:
      "A popular general-purpose programming language. Here it runs the test scripts and helper tools around the site, not the site itself.",
  },
  Lighthouse: {
    logo: "/tech/lighthouse.svg",
    blurb:
      "Google's open-source page auditor. It scores speed, accessibility and best practices, and is used to check the live site.",
  },
  ESLint: {
    logo: "/tech/eslint.svg",
    blurb:
      "A code checker for JavaScript and TypeScript. It flags bugs and risky patterns; the code has to pass it before it ships.",
  },
  GitHub: {
    logo: "/tech/github.svg",
    blurb:
      "The service that hosts the project's code and its history. Work happens on branches there, and pushes trigger deploys.",
  },
  Tauri: {
    logo: "/tech/tauri.svg",
    blurb:
      "A framework for small, fast desktop apps that use a web page for their interface. Headroom is a Tauri app: a Rust core with a React front end.",
  },
  Rust: {
    logo: "/tech/rust.svg",
    blurb:
      "A fast, memory-safe systems programming language. In Headroom it handles the native side: the window, files and talking to the operating system.",
  },
  SQLite: {
    logo: "/tech/sqlite.svg",
    blurb:
      "A tiny database that lives in a single file, with no server. Headroom keeps its local data in one.",
  },
  Vite: {
    logo: "/tech/vite.svg",
    blurb:
      "A build tool and dev server for front-end code. It bundles Headroom's React interface and reloads instantly during development.",
  },
  Vitest: {
    logo: "/tech/vitest.svg",
    blurb:
      "A test runner built for Vite projects. It runs Headroom's unit tests so changes don't quietly break things.",
  },
  "GitHub Actions": {
    logo: "/tech/githubactions.svg",
    blurb:
      "GitHub's built-in automation. Each push runs the tests and builds automatically in the cloud.",
  },
  "Tone.js": {
    blurb:
      "A JavaScript library for making music in the browser. Ding Dong's Studio uses it to play his daily tunes out loud, and only when a visitor presses play.",
  },
  "Hermes Agent": {
    blurb:
      "An open-source AI agent from Nous Research that runs on Will's computer. Every morning it wakes Ding Dong up, hands his day to a language model (GLM 5.3), and saves what he wrote.",
  },
};

export type TechKey = keyof typeof TECH;
