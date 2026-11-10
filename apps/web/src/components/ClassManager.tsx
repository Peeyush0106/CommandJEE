"use client";
import { useState } from "react";
import { CalendarPlus, Trash2 } from "lucide-react";
import { CardHead } from "./ui";
import type { Store, StudyClass } from "../lib/store";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekdayNumber = (index: number) => (index + 1) % 7;

export default function ClassManager({ store }: { store: Store }) {
  const [form, setForm] = useState({ title: "", subject: "", time: "16:00", minutes: 60, weekdays: [1, 3, 5] });
  const [selectedId, setSelectedId] = useState("");
  const [occurrenceDate, setOccurrenceDate] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [movedDate, setMovedDate] = useState("");
  const [overrideTime, setOverrideTime] = useState("");
  const classes = store.state.classes;

  const addClass = () => {
    if (!form.title.trim() || !form.weekdays.length) return;
    const item: StudyClass = {
      id: crypto.randomUUID(), title: form.title.trim(), subject: form.subject.trim() || "General",
      time: form.time, minutes: form.minutes, weekdays: form.weekdays, exceptions: {},
    };
    store.addClass(item);
    setForm({ ...form, title: "", subject: "" });
  };
  const saveException = () => {
    const item = classes.find((c) => c.id === selectedId);
    if (!item || !occurrenceDate) return;
    const next = { ...item.exceptions };
    if (cancelled) next[occurrenceDate] = { cancelled: true };
    else if (movedDate || overrideTime) next[occurrenceDate] = {
      ...(movedDate ? { date: movedDate } : {}),
      ...(overrideTime ? { time: overrideTime } : {}),
    };
    else delete next[occurrenceDate];
    store.updateClass(item.id, { exceptions: next });
  };

  return <section className="card">
    <CardHead title="Recurring classes" sub="Weekly rules appear on Today and Calendar. Exceptions change only one occurrence." />
    {classes.length > 0 && <div className="list class-list">{classes.map((item) => <div className="row-item" key={item.id}>
      <div className="grow"><b>{item.title}</b><div className="muted small">{DAYS.filter((_, i) => item.weekdays.includes(weekdayNumber(i))).join(", ")} · {item.time} · {item.minutes} min · {item.subject}</div></div>
      <button className="icon-btn" aria-label={`Remove ${item.title}`} onClick={() => store.removeClass(item.id)}><Trash2 size={15} /></button>
    </div>)}</div>}
    <div className="class-form">
      <label className="label" htmlFor="class-title">Class title</label><input id="class-title" className="field" maxLength={60} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mathematics coaching" />
      <label className="label" htmlFor="class-subject">Subject <span className="muted">(optional)</span></label><input id="class-subject" className="field" maxLength={40} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      <div className="form-grid"><div><label className="label" htmlFor="class-time">Start</label><input id="class-time" className="field" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div><div><label className="label" htmlFor="class-duration">Minutes</label><input id="class-duration" className="field" type="number" min={15} max={480} step={15} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Math.max(15, Math.min(480, +e.target.value || 15)) })} /></div></div>
      <div><span className="label">Repeats on</span><div className="weekday-picker">{DAYS.map((day, index) => { const value = weekdayNumber(index); const on = form.weekdays.includes(value); return <button type="button" className={on ? "on" : ""} key={day} aria-pressed={on} onClick={() => setForm({ ...form, weekdays: on ? form.weekdays.filter((d) => d !== value) : [...form.weekdays, value].sort() })}>{day}</button>; })}</div></div>
      <button className="btn" disabled={!form.title.trim() || !form.weekdays.length} onClick={addClass}><CalendarPlus size={15} /> Add weekly class</button>
    </div>
    {classes.length > 0 && <div className="class-exception">
      <CardHead title="Change one occurrence" sub="Cancel or move a class on a specific date without changing its weekly rule." />
      <label className="label" htmlFor="class-select">Class</label>
      <select id="class-select" className="field" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}><option value="">Choose a class</option>{classes.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select>
      <label className="label" htmlFor="class-occurrence">Original date</label><input id="class-occurrence" className="field" type="date" value={occurrenceDate} onChange={(e) => setOccurrenceDate(e.target.value)} />
      <label className="class-check"><input type="checkbox" checked={cancelled} onChange={(e) => setCancelled(e.target.checked)} /> Cancel this occurrence</label>
      {!cancelled && <div className="form-grid"><div><label className="label" htmlFor="class-move-date">Move to date <span className="muted">(optional)</span></label><input id="class-move-date" className="field" type="date" value={movedDate} onChange={(e) => setMovedDate(e.target.value)} /></div><div><label className="label" htmlFor="class-override-time">Change time <span className="muted">(optional)</span></label><input id="class-override-time" className="field" type="time" value={overrideTime} onChange={(e) => setOverrideTime(e.target.value)} /></div></div>}
      <button className="btn" disabled={!selectedId || !occurrenceDate} onClick={saveException}>Save occurrence change</button>
    </div>}
    <p className="muted small">Class schedules stay as recurring rules; dates are not copied into your saved task list.</p>
  </section>;
}
