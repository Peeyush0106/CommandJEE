export const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD. */
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISO(new Date());
export const fromISO = (iso: string) => new Date(`${iso}T00:00:00`);

export function addDays(iso: string, n: number) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return fromISO(iso).toLocaleDateString("en-IN", opts);
}

export function relativeDay(iso: string) {
  const t = today();
  if (iso === t) return "Today";
  if (iso === addDays(t, 1)) return "Tomorrow";
  if (iso === addDays(t, -1)) return "Yesterday";
  return null;
}

export function fmtMinutes(min: number) {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}h ${r}m`;
  if (h) return `${h}h`;
  return `${r}m`;
}

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const fromMinutes = (total: number) => {
  const t = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};

export const endTime = (time: string, minutes: number) => fromMinutes(toMinutes(time) + minutes);

/** The exam starts at midnight IST on the chosen date. */
export const examTarget = (isoDate: string) => new Date(`${isoDate}T00:00:00+05:30`);

/* ───── live helpers ───── */
export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

type Timed = { date: string; time: string; minutes: number; done: boolean };
/** The (not yet completed) block whose time window contains `now`. */
export function currentTask<T extends Timed>(tasks: T[], now: Date): T | null {
  const iso = toISO(now);
  const m = minutesOfDay(now);
  const live = tasks
    .filter((t) => t.date === iso && !t.done && m >= toMinutes(t.time) && m < toMinutes(t.time) + t.minutes)
    .sort((a, b) => a.time.localeCompare(b.time));
  return live[0] ?? null;
}
/** Fraction (0–1) of a block that has elapsed at `now`, and whole minutes left. */
export function taskProgress(t: { time: string; minutes: number }, now: Date) {
  const elapsed = minutesOfDay(now) - toMinutes(t.time);
  return { frac: Math.max(0, Math.min(1, elapsed / t.minutes)), left: Math.max(0, Math.ceil(t.minutes - elapsed)) };
}
