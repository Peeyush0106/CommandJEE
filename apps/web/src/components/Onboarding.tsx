"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { CardHead } from "./ui";
import { fmtMinutes } from "../lib/date";
import type { Store, StudyClass } from "../lib/store";

const STEPS = ["Profile", "Classes", "Study preferences", "Review"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekNumber = (index: number) => (index + 1) % 7;

export default function Onboarding({ store }: { store: Store }) {
  const [step, setStep] = useState(0);
  const [newClass, setNewClass] = useState({ title: "", subject: "", time: "16:00", minutes: 60, weekdays: [1, 3, 5] });
  const { state } = store;
  const addClass = () => {
    if (!newClass.title.trim() || !newClass.weekdays.length) return;
    const item: StudyClass = {
      id: crypto.randomUUID(), title: newClass.title.trim(), subject: newClass.subject.trim() || "General",
      time: newClass.time, minutes: newClass.minutes, weekdays: newClass.weekdays, exceptions: {},
    };
    store.addClass(item);
    setNewClass((current) => ({ ...current, title: "", subject: "" }));
  };
  const finish = () => {
    if (!state.profile.name.trim() || !state.profile.studentClass || !state.profile.attempt) return;
    store.completeOnboarding();
  };

  return (
    <main className="auth-shell onboarding-shell">
      <section className="auth-card onboarding-card">
        <div className="brand auth-brand"><img className="logo-img" src="/logo-128.png" alt="" /><span>Command<b>JEE</b></span></div>
        <div className="onboarding-progress">
          <div className="between"><span className="eyebrow">Set up your workspace</span><span className="muted small">Step {step + 1} of {STEPS.length}</span></div>
          <div className="onboarding-steps" aria-label="Onboarding progress">{STEPS.map((label, index) => <span key={label} className={index <= step ? "on" : ""} title={label} />)}</div>
        </div>
        {step === 0 && <section className="stack">
          <CardHead title="Your study profile" sub="This helps personalise your preparation workspace." />
          <label className="label" htmlFor="ob-name">Name</label>
          <input id="ob-name" className="field" autoComplete="name" maxLength={40} value={state.profile.name} onChange={(e) => store.setProfile({ name: e.target.value })} />
          <label className="label" htmlFor="ob-class">Current class</label>
          <select id="ob-class" className="field" value={state.profile.studentClass} onChange={(e) => store.setProfile({ studentClass: e.target.value })}>
            <option value="">Choose one</option><option value="Class 11">Class 11</option><option value="Class 12">Class 12</option><option value="Dropper">Dropper</option><option value="Other">Other</option>
          </select>
          <label className="label" htmlFor="ob-attempt">Exam attempt</label>
          <select id="ob-attempt" className="field" value={state.profile.attempt} onChange={(e) => store.setProfile({ attempt: e.target.value })}>
            <option value="">Choose one</option><option value="JEE Main">JEE Main</option><option value="JEE Advanced">JEE Advanced</option><option value="Both">Both</option>
          </select>
          <label className="label" htmlFor="ob-exam">Target exam date</label>
          <input id="ob-exam" className="field" type="date" value={state.examDate} onChange={(e) => e.target.value && store.setExamDate(e.target.value)} />
          <p className="muted small">A target score is optional and can be added to your profile later.</p>
        </section>}
        {step === 1 && <section className="stack">
          <CardHead title="Recurring classes" sub="Optional. Set regular coaching or tutorial times; exceptions can be managed later." />
          {state.classes.map((item) => <div className="class-chip" key={item.id}><span className="grow"><b>{item.title}</b><small>{item.weekdays.map((day) => WEEKDAYS[day === 0 ? 6 : day - 1]).join(", ")} · {item.time} · {fmtMinutes(item.minutes)}</small></span><button className="icon-btn" aria-label={`Remove ${item.title}`} onClick={() => store.removeClass(item.id)}><Trash2 size={15} /></button></div>)}
          <label className="label" htmlFor="ob-class-title">Class name</label>
          <input id="ob-class-title" className="field" placeholder="e.g. Physics coaching" maxLength={60} value={newClass.title} onChange={(e) => setNewClass({ ...newClass, title: e.target.value })} />
          <label className="label" htmlFor="ob-class-subject">Subject <span className="muted">(optional)</span></label>
          <input id="ob-class-subject" className="field" placeholder="e.g. Physics" maxLength={40} value={newClass.subject} onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })} />
          <div className="form-grid">
            <div><label className="label" htmlFor="ob-class-time">Start time</label><input id="ob-class-time" className="field" type="time" value={newClass.time} onChange={(e) => setNewClass({ ...newClass, time: e.target.value })} /></div>
            <div><label className="label" htmlFor="ob-class-minutes">Duration (minutes)</label><input id="ob-class-minutes" className="field" type="number" min={15} max={480} step={15} value={newClass.minutes} onChange={(e) => setNewClass({ ...newClass, minutes: Math.max(15, Math.min(480, +e.target.value || 15)) })} /></div>
          </div>
          <div><span className="label">Repeats on</span><div className="weekday-picker">{WEEKDAYS.map((day, index) => { const dayIndex = weekNumber(index); const active = newClass.weekdays.includes(dayIndex); return <button type="button" className={active ? "on" : ""} key={day} aria-pressed={active} onClick={() => setNewClass({ ...newClass, weekdays: active ? newClass.weekdays.filter((d) => d !== dayIndex) : [...newClass.weekdays, dayIndex].sort() })}>{day}</button>; })}</div></div>
          <button type="button" className="btn" disabled={!newClass.title.trim() || !newClass.weekdays.length} onClick={addClass}><Plus size={15} /> Add recurring class</button>
          <p className="muted small">Classes are stored as weekly rules, not duplicated into each date. Skip or move a specific occurrence from Calendar after setup.</p>
        </section>}
        {step === 2 && <section className="stack">
          <CardHead title="Study preferences" sub="You can change these settings any time." />
          <label className="label" htmlFor="ob-target">Daily study target (hours)</label>
          <input id="ob-target" className="field narrow" type="number" min={1} max={16} value={state.targetHours} onChange={(e) => store.setTargetHours(Math.max(1, Math.min(16, +e.target.value || 1)))} />
          <div className="range-setting">
            <label className="label" htmlFor="ob-day-start">Your day starts at <b>{String(Math.floor(state.dayStartMinutes / 60)).padStart(2, "0")}:{String(state.dayStartMinutes % 60).padStart(2, "0")}</b></label>
            <input id="ob-day-start" type="range" min={0} max={480} step={30} value={state.dayStartMinutes} onChange={(e) => store.setDayStartMinutes(+e.target.value)} />
            <div className="between muted small"><span>00:00</span><span>08:00</span></div>
            <p className="muted small">Blocks crossing this boundary are split between the two study days.</p>
          </div>
          <label className="label" htmlFor="ob-score">Target score / percentile <span className="muted">(optional)</span></label>
          <input id="ob-score" className="field" placeholder="e.g. 99 percentile" maxLength={40} value={state.profile.targetScore} onChange={(e) => store.setProfile({ targetScore: e.target.value })} />
        </section>}
        {step === 3 && <section className="stack">
          <CardHead title={`Ready, ${state.profile.name || "aspirant"}?`} sub="Review your setup. You can edit all of this later in Profile and Settings." />
          <div className="review-list">
            <div><span>Exam</span><b>{state.profile.attempt} · {state.profile.studentClass}</b></div>
            <div><span>Target date</span><b>{state.examDate}</b></div>
            <div><span>Daily target</span><b>{state.targetHours} hours</b></div>
            <div><span>Day starts at</span><b>{String(Math.floor(state.dayStartMinutes / 60)).padStart(2, "0")}:{String(state.dayStartMinutes % 60).padStart(2, "0")}</b></div>
            <div><span>Recurring classes</span><b>{state.classes.length}</b></div>
          </div>
        </section>}
        <footer className="onboarding-footer">
          <button className="btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}><ArrowLeft size={15} /> Back</button>
          {step < 3
            ? <button className="btn primary" disabled={step === 0 && (!state.profile.name.trim() || !state.profile.studentClass || !state.profile.attempt)} onClick={() => setStep((s) => Math.min(3, s + 1))}>Continue <ArrowRight size={15} /></button>
            : <button className="btn primary" disabled={!state.profile.name.trim() || !state.profile.studentClass || !state.profile.attempt} onClick={finish}><Check size={15} /> Finish setup</button>}
        </footer>
      </section>
    </main>
  );
}
