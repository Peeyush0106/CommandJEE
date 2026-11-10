"use client";
import { Moon, Sun } from "lucide-react";
import type { User } from "firebase/auth";
import { CardHead, Segmented } from "../ui";
import { fmtDate, fromMinutes } from "../../lib/date";
import type { Store } from "../../lib/store";
import AccountSecurity from "../AccountSecurity";
import ClassManager from "../ClassManager";

type AccountMeta = { deletionRequestedAt?: number; exportRequestedAt?: number; exportAvailableAt?: number; exportLastAt?: number; exportDownloadedAt?: number };

export default function Settings({ store, user, accountMeta, signOut }: { store: Store; user: User; accountMeta: AccountMeta; signOut: () => Promise<void> }) {
  const { state } = store;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Device local time";
  return (
    <div className="settings-stack">
      <div className="grid2 settings">
        <section className="card">
          <CardHead title="Appearance" sub="Choose a workspace theme" />
          <Segmented label="Theme" value={state.theme} onChange={store.setTheme} options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
          <p className="muted small" style={{ marginTop: 10 }}>{state.theme === "dark" ? <Moon size={13} /> : <Sun size={13} />} Currently using the {state.theme} theme.</p>
        </section>

        <section className="card">
          <CardHead title="Exam countdown" sub="Counts down to midnight IST on this date" />
          <label className="label" htmlFor="exam-date">Exam date</label>
          <input id="exam-date" className="field" type="date" value={state.examDate} onChange={(e) => e.target.value && store.setExamDate(e.target.value)} />
          <p className="muted small" style={{ marginTop: 10 }}>{fmtDate(state.examDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Asia/Kolkata.</p>
        </section>

        <section className="card">
          <CardHead title="Day boundary" sub="A study day can start any half-hour from midnight to 08:00." />
          <label className="label" htmlFor="day-start">Day starts at <b>{fromMinutes(state.dayStartMinutes)}</b></label>
          <input id="day-start" type="range" min={0} max={480} step={30} value={state.dayStartMinutes} onChange={(e) => store.setDayStartMinutes(+e.target.value)} />
          <div className="between muted small"><span>00:00</span><span>08:00</span></div>
          <p className="muted small" style={{ marginTop: 10 }}>Changing this re-slices historical block time across study days. Blocks crossing the boundary count their minutes in each day.</p>
        </section>

        <section className="card">
          <CardHead title="Daily study target" sub="Used by planner and progress charts" />
          <label className="label" htmlFor="target-h">Hours per day</label>
          <input id="target-h" className="field narrow" type="number" min={1} max={16} value={state.targetHours} onChange={(e) => store.setTargetHours(Math.max(1, Math.min(16, +e.target.value || 1)))} />
        </section>

        <section className="card">
          <CardHead title="Calendar preferences" sub="Calendar week layout and device time zone" />
          <label className="label">Week starts on</label>
          <Segmented label="Week starts on" value={state.weekStartsOn} onChange={store.updateWeekStart} options={[{ value: "monday", label: "Monday" }, { value: "sunday", label: "Sunday" }]} />
          <p className="muted small" style={{ marginTop: 12 }}>Time zone: <b>{timeZone}</b> (your browser’s local time zone)</p>
        </section>

        <section className="card">
          <CardHead title="Pomodoro default" sub="Focus duration for the Classic preset" />
          <label className="label" htmlFor="pomo-default">Focus minutes</label>
          <input id="pomo-default" className="field narrow" type="number" min={5} max={120} step={5} value={state.pomodoroMinutes} onChange={(e) => store.setPomodoroMinutes(+e.target.value || 25)} />
          <p className="muted small" style={{ marginTop: 10 }}>Deep and Sprint presets keep their own focus and break lengths.</p>
        </section>
      </div>
      <ClassManager store={store} />
      <AccountSecurity user={user} state={state} meta={accountMeta} signOut={signOut} />
    </div>
  );
}
