// Shared zod field schemas for Server Actions. Messages are the ones shown to
// visitors, so every action reports the same wording for the same mistake.
import { z } from "zod";

export const emailField = z.string().trim().toLowerCase().pipe(z.email("That email doesn't look right."));
export const passwordField = z.string().min(10, "Use a password of at least 10 characters.");

/** Reads the named text fields off a FormData as raw strings (missing → ""). */
export function textFields<K extends string>(form: FormData, keys: readonly K[]) {
  return Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")])) as Record<K, string>;
}

/** Parses `input`; the first failing field decides the single error shown. */
export function parse<T extends z.ZodType>(
  schema: T,
  input: unknown,
): { data: z.output<T>; error?: undefined } | { data?: undefined; error: string } {
  const result = schema.safeParse(input);
  return result.success ? { data: result.data } : { error: result.error.issues[0].message };
}
