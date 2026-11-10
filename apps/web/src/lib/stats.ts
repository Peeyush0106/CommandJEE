import { COUNTED_KINDS } from "./constants";
import { addDays } from "./date";
import type { State } from "./store";

export const studiedOn = (s: State, date: string) =>
  s.tasks.filter((t) => t.done && t.date === date && COUNTED_KINDS.includes(t.kind)).reduce((a, t) => a + t.minutes, 0);

/** Consecutive days (ending today, or yesterday if nothing is done yet today) with any completed study block. */
export function streak(s: State, today: string) {
  const has = (d: string) => s.tasks.some((t) => t.date === d && t.done && COUNTED_KINDS.includes(t.kind));
  let d = has(today) ? today : addDays(today, -1);
  let n = 0;
  while (has(d) && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}
