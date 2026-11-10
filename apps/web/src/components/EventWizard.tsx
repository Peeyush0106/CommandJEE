"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, BookOpen, Check, GraduationCap, Presentation, RefreshCw, Search, Timer, X } from "lucide-react";
import type { Chapter, Subject } from "@commandjee/shared";
import { Modal, Segmented } from "./ui";
import { STATUS_LABEL, SUBJECTS, SUBJECT_SHORT, type TaskKind } from "../lib/constants";
import { addDays, endTime, fmtDate, fmtMinutes, fromISO, fromMinutes, logicalDateAt, tasksForLogicalDay, toMinutes } from "../lib/date";
import type { Task } from "../lib/store";

type Block = { subject: Subject; chapter: string; tasks: string[] };
const makeId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const TYPES: { id: TaskKind; label: string; desc: string; Icon: typeof BookOpen }[] = [
  { id: "study", label: "Study session", desc: "Theory, PYQs and focused practice", Icon: BookOpen },
  { id: "revision", label: "Revision", desc: "Recall and retesting", Icon: RefreshCw },
  { id: "mock", label: "Mock test", desc: "A timed test block", Icon: Timer },
  { id: "coaching", label: "Coaching", desc: "Class or guided session", Icon: Presentation },
];
const defaultTasks = (t: TaskKind) => (t === "revision" ? ["Revision"] : t === "mock" ? ["Timed mock"] : t === "coaching" ? ["Coaching"] : ["Theory"]);
const taskOptions = (t: TaskKind) => (t === "study" ? ["Theory", "PYQs", "Revision"] : defaultTasks(t));
const DURATIONS = [30, 45, 60, 90, 120, 150, 180];
const estimate = (blocks: Block[]) => {
  if (blocks.length > 1) return 150;
  const t = blocks[0]?.tasks ?? [];
  if (t.includes("Theory") && t.includes("PYQs")) return 135;
  if (t.includes("Theory")) return 90;
  if (t.includes("PYQs")) return 75;
  return 60;
};

export function suggestTime(tasks: Task[], date: string, dayStartMinutes = 0) {
  const day = tasksForLogicalDay(tasks, date, dayStartMinutes);
  let candidate = (13 * 60 - dayStartMinutes + 1440) % 1440;
  for (const t of day) {
    const start = t.dayOffsetMinutes ?? toMinutes(t.time);
    if (candidate + 90 <= start) break;
    candidate = Math.max(candidate, start + t.minutes + 15);
  }
  return fromMinutes(dayStartMinutes + Math.min(candidate, (21 * 60 + 30 - dayStartMinutes + 1440) % 1440));
}

export default function EventWizard({ initialDate, dayStartMinutes = 0, chapters, tasks, onClose, onSave }: {
  initialDate?: string; dayStartMinutes?: number; chapters: Chapter[]; tasks: Task[]; onClose: () => void; onSave: (t: Task) => void;
}) {
  const startDate = initialDate ?? logicalDateAt(new Date(), dayStartMinutes);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<TaskKind>("study");
  const [subject, setSubject] = useState<Subject>("Physics");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [date, setDate] = useState(startDate);
  const [time, setTime] = useState(() => suggestTime(tasks, startDate, dayStartMinutes));
  const [minutes, setMinutes] = useState(90);
  const [custom, setCustom] = useState(false);
  const [customH, setCustomH] = useState(1);
  const [customM, setCustomM] = useState(15);
  const [title, setTitle] = useState<string | null>(null);

  /* ── chapter picker (rendered in a portal so it can extend past the dialog) ── */
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null);
  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 14;
    const above = r.top - 14;
    const up = below < 240 && above > below;
    const width = Math.min(Math.max(r.width, 340), window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12));
    setPos(up ? { bottom: window.innerHeight - r.top + 6, left, width, maxHeight: Math.min(360, above) } : { top: r.bottom + 6, left, width, maxHeight: Math.min(360, below) });
  }, []);
  useEffect(() => {
    if (!open) return;
    place();
    const onScroll = (e: Event) => { if (dropRef.current && e.target instanceof Node && dropRef.current.contains(e.target)) return; place(); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (dropRef.current?.contains(t) || inputRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    window.addEventListener("keydown", onEsc, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onEsc, true); window.removeEventListener("resize", place); window.removeEventListener("scroll", onScroll, true); document.removeEventListener("mousedown", onDown); };
  }, [open, place]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chapters
      .filter((c) => c.subject === subject && (!q || c.name.toLowerCase().includes(q) || c.subtopics?.some((s) => s.toLowerCase().includes(q))))
      .sort((a, b) => a.priority.localeCompare(b.priority) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [chapters, subject, query]);
  const has = (c: Chapter) => blocks.some((b) => b.subject === c.subject && b.chapter === c.name);
  const toggleChapter = (c: Chapter) =>
    setBlocks((bs) => (has(c) ? bs.filter((b) => !(b.subject === c.subject && b.chapter === c.name)) : [...bs, { subject: c.subject, chapter: c.name, tasks: defaultTasks(type) }]));
  const addAll = () =>
    setBlocks((bs) => { const next = [...bs]; matches.forEach((c) => { if (!next.some((b) => b.subject === c.subject && b.chapter === c.name)) next.push({ subject: c.subject, chapter: c.name, tasks: defaultTasks(type) }); }); return next; });
  const toggleTask = (i: number, task: string) =>
    setBlocks((bs) => bs.map((b, j) => {
      if (j !== i) return b;
      const on = b.tasks.includes(task);
      if (on && b.tasks.length === 1) return b; // keep at least one task
      return { ...b, tasks: on ? b.tasks.filter((x) => x !== task) : [...b.tasks, task] };
    }));

  const pickType = (t: TaskKind) => {
    setType(t);
    setBlocks((bs) => bs.map((b) => ({ ...b, tasks: defaultTasks(t) })));
    setStep(2);
  };

  const needsChapters = type === "study" || type === "revision";
  const autoTitle = useMemo(() => {
    const names = blocks.map((b) => b.chapter);
    if (!names.length) return TYPES.find((t) => t.id === type)!.label;
    const head = names.length <= 3 ? names.join(" + ") : `${names[0]} + ${names.length - 1} more`;
    return head;
  }, [blocks, type]);
  const shownTitle = title ?? autoTitle;
  const duration = custom ? Math.max(5, customH * 60 + customM) : minutes;

  const conflicts = useMemo(() => {
    const actualDate = toMinutes(time) < dayStartMinutes ? addDays(date, 1) : date;
    const start = fromISO(actualDate);
    const [hours, minutes] = time.split(":").map(Number);
    start.setHours(hours || 0, minutes || 0, 0, 0);
    const end = start.getTime() + duration * 60_000;
    return tasks.filter((task) => {
      const taskStart = fromISO(task.date);
      const [taskHours, taskMinutes] = task.time.split(":").map(Number);
      taskStart.setHours(taskHours || 0, taskMinutes || 0, 0, 0);
      const taskEnd = taskStart.getTime() + task.minutes * 60_000;
      return start.getTime() < taskEnd && end > taskStart.getTime();
    });
  }, [tasks, date, time, duration, dayStartMinutes]);

  const goSchedule = () => { setOpen(false); setMinutes(estimate(blocks)); setCustom(false); setStep(3); };
  const save = () => {
    const task: Task = {
      id: makeId(),
      title: shownTitle.trim() || autoTitle,
      subject: blocks.length === 0 ? "General" : new Set(blocks.map((b) => b.subject)).size === 1 ? blocks[0].subject : "Mixed",
      chapter: blocks.map((b) => b.chapter).join(" + "),
      date: toMinutes(time) < dayStartMinutes ? addDays(date, 1) : date,
      time, minutes: duration, kind: type, done: false,
      items: blocks.length ? blocks.map((b) => ({ ...b, done: false })) : undefined,
    };
    onSave(task);
  };

  const stepNames = ["Type", "Chapters & tasks", "Schedule"];
  const footer =
    step === 2 ? (
      <>
        <button className="btn" onClick={() => { setOpen(false); setStep(1); }}>Back</button>
        <button className="btn primary" disabled={needsChapters && blocks.length === 0} onClick={goSchedule}>Continue to schedule</button>
      </>
    ) : step === 3 ? (
      <>
        <button className="btn" onClick={() => setStep(2)}>Back</button>
        <button className="btn primary" onClick={save}><Check size={15} /> Add to planner</button>
      </>
    ) : undefined;

  return (
    <Modal title="Add to your planner" size="lg" onClose={onClose} footer={footer}>
      <div className="wiz-date"><span>Planning for</span><b>{fmtDate(date, { weekday: "long", day: "numeric", month: "long" })}</b></div>
      <ol className="steps" aria-label="Progress">
        {stepNames.map((n, i) => (
          <li key={n} className={step === i + 1 ? "current" : step > i + 1 ? "done" : ""}>
            <span>{step > i + 1 ? <Check size={13} /> : i + 1}</span>{n}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="wiz">
          <h3>What are you planning?</h3>
          <p className="muted">Pick a type — you can add chapters and set the time next.</p>
          <div className="type-grid">
            {TYPES.map(({ id, label, desc, Icon }) => (
              <button key={id} type="button" className={`type-card ${type === id ? "selected" : ""}`} onClick={() => pickType(id)}>
                <span className={`type-icon kind-${id}`}><Icon size={18} /></span>
                <b>{label}</b><span>{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wiz">
          <h3>{needsChapters ? "Pick chapters" : "Related chapters (optional)"}</h3>
          <p className="muted">Click chapters to add them — the list stays open so you can add several, even across subjects.</p>
          <div className="picker-row">
            <Segmented label="Subject" value={subject} onChange={(v) => { setSubject(v); setQuery(""); setOpen(true); }} options={SUBJECTS.map((s) => ({ value: s, label: SUBJECT_SHORT[s] }))} />
            <div className="searchbox grow">
              <Search size={16} />
              <input
                ref={inputRef} value={query} placeholder={`Search ${SUBJECT_SHORT[subject]} chapters…`} aria-label="Search chapters"
                onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
               
              />
              {query && <button className="icon-btn" aria-label="Clear search" onClick={() => { setQuery(""); inputRef.current?.focus(); }}><X size={15} /></button>}
            </div>
          </div>

          {open && pos && typeof document !== "undefined" && createPortal(
            <div ref={dropRef} className="suggest" style={pos} role="listbox" aria-label="Chapter suggestions">
              <div className="suggest-head">
                <span>{matches.length} {SUBJECT_SHORT[subject]} chapter{matches.length === 1 ? "" : "s"}</span>
                {matches.length > 0 && <button type="button" className="text-btn" onClick={addAll}>Add all {matches.length}</button>}
                <button type="button" className="text-btn" onClick={() => setOpen(false)}>Done</button>
              </div>
              {matches.length === 0 && <div className="suggest-empty">No chapter matches “{query}”.</div>}
              {matches.map((c) => (
                <button type="button" role="option" aria-selected={has(c)} key={c.id} className={`suggest-item ${has(c) ? "added" : ""}`} onClick={() => toggleChapter(c)}>
                  <span className="tick">{has(c) && <Check size={13} />}</span>
                  <b>{c.name}</b>
                  <span className="meta">{c.priority} · {STATUS_LABEL[c.status]}</span>
                </button>
              ))}
            </div>,
            document.body,
          )}

          {blocks.length > 0 ? (
            <div className="block-list">
              <div className="block-list-head"><b>In this block</b><span className="muted">{blocks.length} chapter{blocks.length === 1 ? "" : "s"}</span></div>
              {blocks.map((b, i) => (
                <div className="block-item" key={`${b.subject}-${b.chapter}`}>
                  <div className="block-main">
                    <b>{b.chapter}</b><span className="muted">{SUBJECT_SHORT[b.subject]}</span>
                  </div>
                  <div className="chips">
                    {taskOptions(type).map((t) => (
                      <button key={t} type="button" className={`chip ${b.tasks.includes(t) ? "on" : ""}`} aria-pressed={b.tasks.includes(t)} disabled={taskOptions(type).length === 1} onClick={() => toggleTask(i, t)}>{t}</button>
                    ))}
                  </div>
                  <button className="icon-btn" aria-label={`Remove ${b.chapter}`} onClick={() => setBlocks((bs) => bs.filter((_, j) => j !== i))}><X size={16} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty compact"><GraduationCap size={20} /><span>{needsChapters ? "No chapters yet — search above or click the field to browse." : "You can skip this and just set a time."}</span></div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="wiz">
          <h3>When should it happen?</h3>
          <p className="muted">The start time is suggested from your existing blocks — adjust freely.</p>
          <div className="form-grid">
            <div><label className="label" htmlFor="ev-date">Date</label>
              <input id="ev-date" className="field" type="date" value={date} onChange={(e) => { setDate(e.target.value); setTime(suggestTime(tasks, e.target.value, dayStartMinutes)); }} /></div>
            <div><label className="label" htmlFor="ev-time">Start time</label>
              <input id="ev-time" className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            <div className="span">
              <label className="label">Duration</label>
              <div className="chips">
                {DURATIONS.map((n) => (
                  <button key={n} type="button" className={`chip ${!custom && minutes === n ? "on" : ""}`} onClick={() => { setCustom(false); setMinutes(n); }}>{fmtMinutes(n)}</button>
                ))}
                <button type="button" className={`chip ${custom ? "on" : ""}`} onClick={() => setCustom(true)}>Custom</button>
              </div>
              {custom && (
                <div className="custom-dur">
                  <label>Hours<input className="field" type="number" min={0} max={12} value={customH} onChange={(e) => setCustomH(Math.max(0, Math.min(12, +e.target.value || 0)))} /></label>
                  <label>Minutes<input className="field" type="number" min={0} max={59} step={5} value={customM} onChange={(e) => setCustomM(Math.max(0, Math.min(59, +e.target.value || 0)))} /></label>
                </div>
              )}
            </div>
            <div className="span">
              <label className="label" htmlFor="ev-title">Title</label>
              <input id="ev-title" className="field" value={shownTitle} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vectors + Mole Concept" />
            </div>
          </div>
          <div className="summary-line">
            <span>{fmtDate(date, { weekday: "short", day: "numeric", month: "short" })}</span>
            <span>{time} – {endTime(time, duration)}</span>
            <span>{fmtMinutes(duration)}</span>
          </div>
          {conflicts.length > 0 && (
            <div className="warn" role="status"><AlertTriangle size={16} />
              <span>Overlaps with {conflicts.map((c) => `“${c.title}” (${c.time})`).join(", ")}. You can still save it.</span></div>
          )}
        </div>
      )}
    </Modal>
  );
}
