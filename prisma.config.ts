// Prisma CLI config (migrate, generate, studio). The app itself connects via
// src/lib/db.ts. Migrations take an advisory lock, which Neon's pooled
// connection can't hold, so the CLI prefers the direct (unpooled) URL.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
});
