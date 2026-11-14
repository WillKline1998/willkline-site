import { longDate } from "@/lib/dates";

type Want = { id: string; word: string; reason: string; status: string; createdAt: Date; grantedAt: Date | null };

// "DingDong asks for…": things he has asked for (from words he kept noticing) and what he's been given.
// Hidden entirely until he has asked for something.
export function Trough({ wants }: { wants: Want[] }) {
  if (!wants.length) return null;
  return (
    <section className="dd-trough" aria-labelledby="dd-trough-title">
      <h2 id="dd-trough-title" className="dd-trough-title">
        DingDong asks for…
      </h2>
      <ul className="dd-wants">
        {wants.map((w) => (
          <li key={w.id} className="dd-want" data-status={w.status} data-word={w.word}>
            <span className="dd-want-word">{w.word}</span>
            <p className="dd-want-reason">{w.reason}</p>
            <span className="small muted dd-want-meta">
              {w.status === "granted" && w.grantedAt ? (
                <>
                  <span className="dd-want-got">✓ given</span> {longDate(w.grantedAt)}
                </>
              ) : (
                <>asked {longDate(w.createdAt)} · waiting</>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
