// Lab tech chip tooltips.
//
// A fixed, programmatic registry of one-line explanations for every technology the Lab cards cite.
// Words are user-editable (e.g. "GitHub" describes a product); prose is terse so it fits under a
// 4-second read. Descriptions are kept to 1-2 sentences and never read as a spec sheet.
//
// Stack (all permissive, MIT/Apache):
//   - MIT: react-markdown, Playwright, pdf-lib, dnd-kit, @dnd-kit/*
//   - Apache-2.0: Prisma, Vercel
//   - ISC: ESLint
//   - 0BSD: Lighthouse, sharp, @prisma/client
//   - CC-BY: Lighthouse favicon
export const TECH = {
  "Next.js": "The React framework Next.js powers this site. It renders pages on the server, which keeps load times short, and lets pages hold private forms like the admin area and the wall.",
  "React": "The component library the whole site is built on. Every page, form and widget is a small module that React stitches together into one page.",
  TypeScript: "A version of JavaScript that requires you to name the types of your data. It catches a lot of mistakes before the code ever runs.",
  "Tailwind CSS": "A utility CSS toolkit. Instead of writing custom styles, small class names are assembled into the layout and colours, so the design ships fast and stays consistent.",
  PostgreSQL: "The database that holds the site's content. One shared database backs the wall, recipes, songbook and everything else, so the public and admin pages see the same data.",
  Prisma: "The query tool that sits between this app and the database. It turns each model into typed functions, so reading a landing page or a user's posts is one line of code.",
  Neon: "The database host that runs the PostgreSQL database. It keeps the connection mostly open, so the site can scale without moving the database.",
  Vercel: "The host that runs the app online. A push to GitHub updates the live site, so there is no build step to manage.",
  "Vercel Blob": "The file store that keeps uploads. Photos, PDFs and other pieces of content live here, and the site only keeps a reference to them.",
  sharp: "The image tool that resized uploaded photos to thumbnails on upload. A single large picture is stored once, and small versions are made on the fly.",
  "react-markdown": "Turns the Markdown in posts and lab pages into real HTML. Bold, links and lists are just typed as text.",
  Playwright: "The browser test tool. It drives a real browser through the site to check that pages and forms behave the way they should.",
  Python: "The scripting language used where fast shell tools are needed. The lead-sheet spike and the content import are both written in Python, not the main app.",
  Lighthouse: "The page audit tool that scores load speed, accessibility and best practice. A score is taken from the live site before each push.",
  ESLint: "The code checker that raises style and mistake warnings as code is written. Everything on the site clears it before a push.",
  GitHub: "The code store where the site's files live. Pushes go here, branches are made for each feature, and the work lives in small, reviewable pieces.",
  Tauri: "The framework the Headroom app is built on. A tiny Rust binary wraps a small React widget, so it opens fast and stays out of the way.",
  Rust: "The systems language Tauri uses for the wrapper app. It handles the window and the file access, while the display lives in React.",
  SQLite: "The tiny file database the widget keeps in local storage. All the run data sits in one small file on your disk.",
  Vite: "The build tool that turns the widget's source into a fast-loaded page. It is used for the React part of the app.",
  Vitest: "The test runner that checks the widget's code as it changes. A small amount of unit coverage keeps a refactor from breaking the widget.",
  "GitHub Actions": "The automation that runs on GitHub. A workflow is triggered when you push code and it runs the tests and the build for you.",
};

export type TechKey = keyof typeof TECH;
