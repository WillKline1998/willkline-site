// Shared Prisma client (reused across hot reloads in dev).
import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

// SQLite paths in DATABASE_URL ("file:./dev.db") are relative to prisma/ for the
// CLI, but the Next.js server bundle can't infer that, so resolve it explicitly.
function resolveDbUrl(url = process.env.DATABASE_URL) {
  if (url?.startsWith("file:./")) return "file:" + path.join(process.cwd(), "prisma", url.slice("file:./".length));
  return url;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: resolveDbUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
