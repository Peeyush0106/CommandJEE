"use client";
import { Award, BookCheck, Clock3, Flame, Timer, Trophy } from "lucide-react";
import { CardHead, Segmented } from "../ui";
import { useNow } from "../Now";
import { COUNTED_KINDS } from "../../lib/constants";
import { fmtDate, fmtMinutes, logicalDateAt } from "../../lib/date";
import { streak } from "../../lib/stats";
import type { Store } from "../../lib/store";

export const initials = (name: string) => (name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "A");

export default function Profile({ store, go }: { store: Store; go: (p: string) => void }) {
  const { state } = store;
  const now = useNow();
  const t0 = logicalDateAt(now, state.dayStartMinutes);
  const done = state.tasks.filter((t) => t.done);
  const studiedMin = done.filter((t) => COUNTED_KINDS.includes(t.kind)).reduce((a, t) => a + t.minutes, 0);
  const focusMin = state.focusLog.reduce((a, f) => a + f.minutes, 0);
  const best = state.mocks.length ? Math.max(...state.mocks.map((m) => m.p + m.c + m.m)) : null;
  const mastered = state.chapters.filter((c) => c.status === "mastery").length;
  const stats = [
    { Icon: Clock3, label: "Total study time", value: fmtMinutes(studiedMin) },
    { Icon: Flame, label: "Current streak", value: `${streak(state, t0)} days` },
    { Icon: BookCheck, label: "Chapters mastered", value: `${mastered}/${state.chapters.length}` },
    { Icon: Timer, label: "Pomodoros", value: `${state.focusLog.length} · ${fmtMinutes(focusMin)}` },
    { Icon: Award, label: "Blocks completed", value: done.length },
    { Icon: Trophy, label: "Best mock", value: best === null ? "—" : `${best}/300` },
  ];
  return (
    <div className="stack">
      <section className="card profile-head">
        <div className="avatar xl" aria-hidden>{initials(state.profile.name)}</div>
        <div className="grow">
          <div className="eyebrow">Your profile</div>
          <h2>{state.profile.name}</h2>
          <p className="muted">{state.profile.attempt} · {state.profile.studentClass} · {fmtDate(state.examDate, { day: "numeric", month: "long", year: "numeric" })} · {state.targetHours}h daily target</p>
        </div>
        <button className="btn" onClick={() => go("settings")}>Account &amp; settings</button>
      </section>

      <div className="grid-auto stats">
        {stats.map(({ Icon, label, value }) => (
          <div className="card kpi static" key={label}><div className="kpi-top"><span>{label}</span><Icon size={16} /></div><div className="kpi-value sm">{value}</div></div>
        ))}
      </div>

      <div className="grid2">
        <section className="card">
          <CardHead title="About you" sub="Shown in the profile menu" />
          <div className="form-grid">
            <div className="span"><label className="label" htmlFor="p-name">Display name</label>
              <input id="p-name" className="field" value={state.profile.name} maxLength={40} onChange={(e) => store.setProfile({ name: e.target.value })} onBlur={(e) => { if (!e.target.value.trim()) store.setProfile({ name: "Aspirant" }); }} /></div>
            <div className="span"><label className="label" htmlFor="p-score">Target score / percentile <span className="muted">(optional)</span></label>
              <input id="p-score" className="field" placeholder="e.g. 99.5 percentile" maxLength={40} value={state.profile.targetScore} onChange={(e) => store.setProfile({ targetScore: e.target.value })} /></div>
            <div><label className="label" htmlFor="p-class">Current class</label><select id="p-class" className="field" value={state.profile.studentClass} onChange={(e) => store.setProfile({ studentClass: e.target.value })}><option>Class 11</option><option>Class 12</option><option>Dropper</option><option>Other</option></select></div>
            <div><label className="label" htmlFor="p-attempt">Exam attempt</label><select id="p-attempt" className="field" value={state.profile.attempt} onChange={(e) => store.setProfile({ attempt: e.target.value })}><option>JEE Main</option><option>JEE Advanced</option><option>Both</option></select></div>
          </div>
        </section>
        <section className="card">
          <CardHead title="Preferences" sub="Quick access — more in Settings" />
          <label className="label">Theme</label>
          <Segmented label="Theme" value={state.theme} onChange={store.setTheme} options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
          <label className="label" style={{ marginTop: 16 }} htmlFor="p-target">Daily study target (hours)</label>
          <input id="p-target" className="field narrow" type="number" min={1} max={16} value={state.targetHours} onChange={(e) => store.setTargetHours(Math.max(1, Math.min(16, +e.target.value || 1)))} />
          <p style={{ marginTop: 16 }}><button className="text-btn" onClick={() => go("settings")}>Open all settings</button></p>
        </section>
      </div>
      <p className="muted small">Your profile and progress are synced to your private Firebase account. Use Account &amp; settings to sign out or request an export.</p>
    </div>
  );
}
