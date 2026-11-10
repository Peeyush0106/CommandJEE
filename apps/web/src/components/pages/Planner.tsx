"use client";
import { useState } from "react";
import { CalendarPlus, Trash2 } from "lucide-react";
import { CardHead, EmptyState, Progress, Segmented } from "../ui";
import { KIND_COLOR, KIND_LABEL, SUBJECT_SHORT } from "../../lib/constants";
import { endTime, fmtDate, fmtMinutes, relativeDay, today } from "../../lib/date";
import type { Store, Task } from "../../lib/store";

type View = "upcoming" | "past" | "all";

export default function Planner({ store, addBlock, onDelete }: { store: Store; addBlock: () => void; onDelete: (id: string) => void }) {
  const { tasks, targetHours } = store.state;
  const [view, setView] = useState<View>("upcoming");
  const t0 = today();
  const visible = tasks.filter((t) => (view === "upcoming" ? t.date >= t0 : view === "past" ? t.date < t0 : true));
  const dates = [...new Set(visible.map((t) => t.date))].sort((a, b) => (view === "past" ? b.localeCompare(a) : a.localeCompare(b)));
  const upcomingCount = tasks.filter((t) => t.date >= t0).length;
  const pastCount = tasks.filter((t) => t.date < t0).length;

  return (
    <section className="card">
      <CardHead title="Study planner" sub="Plan blocks, tick them off as you go"
        right={<button className="btn primary" onClick={addBlock}><CalendarPlus size={15} /> Add block</button>} />
      <div className="toolbar">
        <Segmented label="Show" value={view} onChange={setView} options={[
          { value: "upcoming", label: `Upcoming (${upcomingCount})` }, { value: "past", label: `Past (${pastCount})` }, { value: "all", label: "All" }]} />
        <label className="inline-field grow-end">Daily target
          <input className="field narrow" type="number" min={1} max={16} value={targetHours} onChange={(e) => store.setTargetHours(Math.max(1, Math.min(16, +e.target.value || 1)))} /> hours
        </label>
      </div>

      {dates.length === 0 && <EmptyState title={view === "past" ? "No past blocks" : "No upcoming blocks"}>Add a study block to start planning your days.</EmptyState>}
      {dates.map((d) => {
        const day = visible.filter((t) => t.date === d).sort((a, b) => a.time.localeCompare(b.time));
        const planned = day.reduce((a, t) => a + t.minutes, 0);
        const done = day.filter((t) => t.done).reduce((a, t) => a + t.minutes, 0);
        const rel = relativeDay(d);
        return (
          <div className="day-group" key={d}>
            <div className="day-head">
              <div><b>{fmtDate(d)}</b>{rel && <span className={`badge ${rel === "Today" ? "accent" : ""}`}>{rel}</span>}</div>
              <span className="muted small">{fmtMinutes(done)} done · {fmtMinutes(planned)} planned · target {targetHours}h</span>
            </div>
            <Progress value={(done / Math.max(targetHours * 60, 1)) * 100} />
            <div className="list">{day.map((t) => <PlannerRow key={t.id} t={t} store={store} onDelete={onDelete} />)}</div>
          </div>
        );
      })}
    </section>
  );
}

function PlannerRow({ t, store, onDelete }: { t: Task; store: Store; onDelete: (id: string) => void }) {
  return (
    <div className="row-item top">
      <input type="checkbox" className="check" aria-label={`Mark “${t.title}” done`} checked={t.done} onChange={() => store.toggleTask(t.id)} />
      <span className="time">{t.time}<small>{endTime(t.time, t.minutes)}</small></span>
      <div className="grow">
        <b className={t.done ? "struck" : ""}>{t.title}</b>
        <div className="muted small"><i className="dot" style={{ background: KIND_COLOR[t.kind] }} />{KIND_LABEL[t.kind]} · {SUBJECT_SHORT[t.subject] ?? t.subject} · {fmtMinutes(t.minutes)}</div>
        {!!t.items?.length && (
          <div className="sub-checks">
            {t.items.map((it, i) => (
              <label className="sub-check" key={`${it.subject}-${it.chapter}`}>
                <input type="checkbox" checked={!!it.done} onChange={() => store.toggleTaskItem(t.id, i)} />
                <span><b>{it.chapter}</b><small>{SUBJECT_SHORT[it.subject]} · {it.tasks.join(" · ")}</small></span>
              </label>
            ))}
          </div>
        )}
      </div>
      <button className="icon-btn" aria-label={`Delete ${t.title}`} onClick={() => onDelete(t.id)}><Trash2 size={15} /></button>
    </div>
  );
}
