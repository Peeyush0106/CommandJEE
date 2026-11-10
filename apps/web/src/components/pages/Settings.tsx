"use client";
import { useRef, useState } from "react";
import { Download, Moon, Sun, Trash2, Upload } from "lucide-react";
import { CardHead, ConfirmDialog, Segmented, useToast } from "../ui";
import { fmtDate } from "../../lib/date";
import { exportBackup } from "../../lib/backup";
import type { Store } from "../../lib/store";

export default function Settings({ store }: { store: Store }) {
  const toast = useToast();
  const { state } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<unknown>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const exportJson = () => exportBackup(state);
  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== "object" || !Array.isArray(data.chapters)) throw new Error("bad");
      setPending(data);
    } catch { toast({ title: "That file isn't a CommandJEE backup", message: "Choose a .json file exported from this app." }); }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
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
        <p className="muted small" style={{ marginTop: 10 }}>{fmtDate(state.examDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Asia/Kolkata. Update it when your shift is confirmed.</p>
      </section>

      <section className="card">
        <CardHead title="Daily study target" sub="Used by the planner and Overview charts" />
        <label className="label" htmlFor="target-h">Hours per day</label>
        <input id="target-h" className="field narrow" type="number" min={1} max={16} value={state.targetHours} onChange={(e) => store.setTargetHours(Math.max(1, Math.min(16, +e.target.value || 1)))} />
      </section>

      <section className="card">
        <CardHead title="Backup & restore" sub="Your data lives in this browser only" />
        <div className="row wrap-actions">
          <button className="btn" onClick={exportJson}><Download size={15} /> Export backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Export regularly — clearing browser data or switching devices will otherwise lose your progress.</p>
        {store.saveError && <div className="warn" role="alert">Your browser blocked saving. Export a backup now so you don't lose changes.</div>}
      </section>

      <section className="card danger-zone">
        <CardHead title="Reset workspace" sub="Restores the original chapter catalogue and clears plans and mocks" />
        <button className="btn danger" onClick={() => setResetOpen(true)}><Trash2 size={15} /> Reset all data</button>
      </section>

      {pending !== null && <ConfirmDialog title="Import this backup?" message="This replaces everything currently in the app with the contents of the backup file." confirmLabel="Replace my data" danger
        onClose={() => setPending(null)} onConfirm={() => { store.importState(pending); toast({ title: "Backup restored", tone: "success" }); }} />}
      {resetOpen && <ConfirmDialog title="Reset all data?" message="All chapter progress, planner blocks and mock scores in this browser will be erased. Export a backup first if you might need it." confirmLabel="Erase everything" danger
        onClose={() => setResetOpen(false)} onConfirm={() => { store.resetAll(); toast({ title: "Workspace reset" }); }} />}
    </div>
  );
}
