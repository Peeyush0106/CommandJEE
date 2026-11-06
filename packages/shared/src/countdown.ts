export const EXAM_TARGET_ISO = "2027-01-15T00:00:00+05:30";
export function getCountdown(now = Date.now()) {
  const remaining = Math.max(0, new Date(EXAM_TARGET_ISO).getTime() - now);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    complete: remaining === 0
  };
}
