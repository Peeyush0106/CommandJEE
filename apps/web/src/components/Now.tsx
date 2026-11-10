"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { examTarget, fmtDate, pad } from "../lib/date";

/* One shared 1-second clock so only components that need the time re-render. */
const NowContext = createContext<Date>(new Date());
export const useNow = () => useContext(NowContext);

export function NowProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

/** A single character that slides when it changes. */
export function Roll({ v }: { v: string }) {
  const prev = useRef(v);
  const [old, setOld] = useState<string | null>(null);
  useEffect(() => {
    if (prev.current === v) return;
    setOld(prev.current);
    prev.current = v;
    const t = setTimeout(() => setOld(null), 420);
    return () => clearTimeout(t);
  }, [v]);
  return (
    <span className="roll" aria-hidden>
      <span key={v} className={old !== null ? "roll-new" : ""}>{v}</span>
      {old !== null && <span key={`o${old}`} className="roll-old">{old}</span>}
    </span>
  );
}
export function RollText({ text, label }: { text: string; label?: string }) {
  return (
    <span className="roll-text" aria-label={label ?? text} role="text">
      {text.split("").map((c, i) => (/\d/.test(c) ? <Roll key={i} v={c} /> : <span key={i} className="roll-sep" aria-hidden>{c}</span>))}
    </span>
  );
}

export const clockText = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/** Fixed sidebar widget: day, date and 24-hour time. */
export function SidebarClock() {
  const now = useNow();
  const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return (
    <div className="clock-widget" aria-label="Current date and time">
      <div className="clock-time"><RollText text={clockText(now)} /></div>
      <div className="clock-date"><b>{fmtDate(iso, { weekday: "long" })}</b><span>{fmtDate(iso, { day: "numeric", month: "short", year: "numeric" })}</span></div>
    </div>
  );
}

export function useCountdown(examDate: string) {
  const now = useNow();
  const ms = Math.max(0, examTarget(examDate).getTime() - now.getTime());
  const t = Math.floor(ms / 1000);
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60, done: ms === 0 };
}

/** Compact exam countdown for the top-right of the header. */
export function CountdownChip({ examDate, onClick }: { examDate: string; onClick: () => void }) {
  const c = useCountdown(examDate);
  return (
    <button className="cd-chip" onClick={onClick} title={`Exam on ${fmtDate(examDate, { day: "numeric", month: "long", year: "numeric" })} — click to change`}>
      <span className="cd-label">JEE {examDate.slice(0, 4)}</span>
      {c.done ? <b className="cd-done">Exam day</b> : (
        <span className="cd-body">
          <span className="cd-days"><RollText text={String(c.d)} /><small>d</small></span>
          <span className="cd-hms"><RollText text={`${pad(c.h)}:${pad(c.m)}:${pad(c.s)}`} /></span>
        </span>
      )}
    </button>
  );
}
