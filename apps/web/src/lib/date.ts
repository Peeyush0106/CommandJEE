import type { StudyClass, Task } from "./store";

export const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD. */
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISO(new Date());
export const fromISO = (iso: string) => new Date(`${iso}T00:00:00`);
export const logicalDateAt = (date: Date, dayStartMinutes = 0) => {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 < dayStartMinutes) day.setDate(day.getDate() - 1);
  return toISO(day);
};

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
type DayTimed = Timed & { id: string; dayOffsetMinutes?: number };

function localStart(date: string, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const start = fromISO(date);
  start.setHours(hours || 0, minutes || 0, 0, 0);
  return start;
}

/** Returns the portion of a block that belongs to a logical day, without mutating its stored record. */
export function taskSegmentForDay<T extends DayTimed>(task: T, logicalDay: string, dayStartMinutes = 0): T | null {
  const start = localStart(task.date, task.time);
  const end = new Date(start.getTime() + task.minutes * 60_000);
  const dayStart = fromISO(logicalDay);
  dayStart.setMinutes(dayStartMinutes);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const segmentStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
  const segmentEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));
  const minutes = Math.floor((segmentEnd.getTime() - segmentStart.getTime()) / 60_000);
  if (minutes <= 0) return null;
  const offset = (segmentStart.getTime() - dayStart.getTime()) / 60_000;
  return {
    ...task,
    date: toISO(segmentStart),
    time: `${pad(segmentStart.getHours())}:${pad(segmentStart.getMinutes())}`,
    minutes,
    dayOffsetMinutes: offset,
  };
}

export function tasksForLogicalDay<T extends DayTimed>(tasks: T[], logicalDay: string, dayStartMinutes = 0) {
  return tasks
    .map((task) => taskSegmentForDay(task, logicalDay, dayStartMinutes))
    .filter((task): task is T => task !== null)
    .sort((a, b) => (a.dayOffsetMinutes ?? toMinutes(a.time)) - (b.dayOffsetMinutes ?? toMinutes(b.time)));
}

export function tasksByLogicalDay<T extends DayTimed>(tasks: T[], dayStartMinutes = 0) {
  const result = new Map<string, T[]>();
  for (const task of tasks) {
    const start = localStart(task.date, task.time);
    const end = new Date(start.getTime() + task.minutes * 60_000 - 1);
    const first = logicalDateAt(start, dayStartMinutes);
    const last = logicalDateAt(end, dayStartMinutes);
    for (let day = first, guard = 0; day <= last && guard < 4; day = addDays(day, 1), guard++) {
      const segment = taskSegmentForDay(task, day, dayStartMinutes);
      if (segment) result.set(day, [...(result.get(day) ?? []), segment]);
    }
  }
  result.forEach((items) => items.sort((a, b) => (a.dayOffsetMinutes ?? 0) - (b.dayOffsetMinutes ?? 0)));
  return result;
}

export function classesOnDate(classes: StudyClass[], date: string): Task[] {
  const weekday = fromISO(date).getDay();
  return classes.flatMap((item) => {
    const exception = item.exceptions[date];
    const originallyScheduled = item.weekdays.includes(weekday);
    const occurrences: Task[] = [];
    if (originallyScheduled && !exception?.cancelled && (!exception?.date || exception.date === date)) {
      occurrences.push({
        id: `class-${item.id}-${date}`,
        title: item.title,
        subject: item.subject,
        chapter: "",
        date,
        time: exception?.time ?? item.time,
        minutes: exception?.minutes ?? item.minutes,
        kind: "coaching",
        done: false,
      });
    }
    for (const [originalDate, moved] of Object.entries(item.exceptions)) {
      if (moved.date !== date || moved.cancelled || originalDate === date) continue;
      occurrences.push({
        id: `class-${item.id}-${originalDate}-${date}`,
        title: item.title,
        subject: item.subject,
        chapter: "",
        date,
        time: moved.time ?? item.time,
        minutes: moved.minutes ?? item.minutes,
        kind: "coaching",
        done: false,
      });
    }
    return occurrences;
  }).sort((a, b) => a.time.localeCompare(b.time));
}

export function classesForLogicalDay(classes: StudyClass[], day: string, dayStartMinutes = 0): Task[] {
  const following = addDays(day, 1);
  return [
    ...classesOnDate(classes, day).filter((item) => toMinutes(item.time) >= dayStartMinutes),
    ...classesOnDate(classes, following).filter((item) => toMinutes(item.time) < dayStartMinutes),
  ].sort((a, b) => {
    const aOffset = (toMinutes(a.time) - dayStartMinutes + 1440) % 1440;
    const bOffset = (toMinutes(b.time) - dayStartMinutes + 1440) % 1440;
    return aOffset - bOffset;
  });
}

/** The (not yet completed) block whose time window contains `now`. */
export function currentTask<T extends Timed>(tasks: T[], now: Date): T | null {
  const live = tasks
    .filter((t) => {
      if (t.done) return false;
      const start = localStart(t.date, t.time).getTime();
      return now.getTime() >= start && now.getTime() < start + t.minutes * 60_000;
    })
    .sort((a, b) => a.time.localeCompare(b.time));
  return live[0] ?? null;
}
/** Fraction (0–1) of a block that has elapsed at `now`, and whole minutes left. */
export function taskProgress(t: { date?: string; time: string; minutes: number }, now: Date) {
  const elapsed = t.date
    ? (now.getTime() - localStart(t.date, t.time).getTime()) / 60_000
    : minutesOfDay(now) - toMinutes(t.time);
  return { frac: Math.max(0, Math.min(1, elapsed / t.minutes)), left: Math.max(0, Math.ceil(t.minutes - elapsed)) };
}
