// Create or reset the admin account. Run on the Mac:  npm run admin:create
// (live site: npm run admin:create:prod). Prompts for email + password;
// the password is hidden while typing and never stored in plaintext.
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { stdin, stdout } from "node:process";
import { db } from "../src/lib/db";
import { hashPasswordNode } from "./hash";

// One readline for every prompt; while `muted`, typed characters aren't echoed.
let muted = false;
const output = new Writable({
  write(chunk, _enc, done) {
    if (!muted) stdout.write(chunk);
    done();
  },
});
const rl = createInterface({ input: stdin, output, terminal: true });

// Visible prompts go through readline (it redraws its own prompt line, which
// would erase text written separately). Hidden ones print the label first and
// mute readline entirely, redraws included.
async function ask(question: string, hidden = false) {
  if (!hidden) return rl.question(question);
  stdout.write(question);
  muted = true;
  const answer = await rl.question("");
  muted = false;
  stdout.write("\n");
  return answer;
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || (await ask("Admin email: "))).trim().toLowerCase();
  if (!email.includes("@")) throw new Error("That doesn't look like an email address.");
  let pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    pw = await ask("New password (12+ characters, hidden as you type): ", true);
    if (pw.length < 12) throw new Error("Use at least 12 characters.");
    if (pw !== (await ask("Repeat password: ", true))) throw new Error("Passwords didn't match.");
  }
  if (pw.length < 12) throw new Error("Use at least 12 characters.");
  const passwordHash = await hashPasswordNode(pw);
  await db.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: { email, name: "Will Kline", passwordHash, role: "ADMIN" },
  });
  await db.session.deleteMany({ where: { user: { email } } }); // log out everywhere on reset
  console.log(`\nAdmin ready: ${email}. Log in at /login.`);
}

main()
  .catch((e) => {
    console.error(`\n${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await db.$disconnect();
  });
