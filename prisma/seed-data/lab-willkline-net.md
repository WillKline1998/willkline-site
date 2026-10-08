The site you're on. It's a nod to the self-hosted soloist websites I grew up clicking through: a sidebar, a few honest pages, and no template. Under the hood it's a small, real web application.

## What's inside

- **A bulletin board for a home page.** Shows, releases, and notes, with photos, flyers, PDFs, and real YouTube / Spotify / SoundCloud players attached.
- **An admin area** where I edit everything (posts, bio, CV, downloads, music, this Lab) from my phone, without redeploying.
- **Swappable documents.** Upload a new résumé and the CV page updates immediately.
- **Mobile-first layout**, checked automatically at four screen sizes on every change.

## Built with

Next.js and React (TypeScript), PostgreSQL through Prisma, file storage on Vercel Blob, hosted on Vercel. Login is hand-rolled (scrypt password hashing and database sessions) rather than a library, small enough to read in one sitting.

## Coming next

An Inspiration Wall where visitors share and collect art and music, and a "demo mode" that turns the whole site kaleidoscopic.
