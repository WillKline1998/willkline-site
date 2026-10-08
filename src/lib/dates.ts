// Pages render on Vercel (UTC), so pin Will's time zone explicitly.
const TZ = "America/New_York";

export const longDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: TZ });

export const dateTime = (d: Date) =>
  d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ });
