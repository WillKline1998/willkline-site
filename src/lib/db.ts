// Shared Prisma client (reused across hot reloads in dev).
import { PrismaClient } from "../generated/prisma/client"; // relative: also imported by prisma/seed.ts

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
