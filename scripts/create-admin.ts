// Create or reset the admin account. Run on the Mac:  npm run admin:create
// Prompts for email + password (password hidden). Never stores plaintext.
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPasswordNode } from "./hash";

const db = new PrismaClient();

async function askHidden(q: string): Promise<string> {
  stdout.write(q);
  stdin.setRawMode?.(true);
  let s = "";
  for await (const chunk of stdin) {
    for (const ch of chunk.toString()) {
      if (ch === "\r" || ch === "\n") { stdin.setRawMode?.(false); stdout.write("\n"); return s; }
      if (ch === "\u0003") process.exit(1);
      if (ch === "\u007f") s = s.slice(0, -1); else s += ch;
    }
  }
  return s;
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  const email = (process.env.ADMIN_EMAIL || (await rl.question("Admin email: "))).trim().toLowerCase();
  rl.close();
  const pw = process.env.ADMIN_PASSWORD || (await askHidden("New password (12+ characters): "));
  if (pw.length < 12) throw new Error("Use at least 12 characters.");
  if (!process.env.ADMIN_PASSWORD && pw !== (await askHidden("Repeat password: "))) throw new Error("Passwords didn't match.");
  const passwordHash = await hashPasswordNode(pw);
  await db.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: { email, name: "Will Kline", passwordHash, role: "ADMIN" },
  });
  await db.session.deleteMany({ where: { user: { email } } }); // log out everywhere on reset
  console.log(`Admin ready: ${email}`);
}

main().finally(() => db.$disconnect());
