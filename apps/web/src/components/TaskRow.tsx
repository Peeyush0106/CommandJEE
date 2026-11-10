"use client";
import { Timer, Trash2 } from "lucide-react";
import { useNow } from "./Now";
import { usePomodoro } from "./Pomodoro";
import { currentTask, endTime, fmtMinutes, taskProgress } from "../lib/date";
import { KIND_COLOR, KIND_LABEL, SUBJECT_SHORT } from "../lib/constants";
import type { Store, Task } from "../lib/store";

/** A schedule row. The block that is happening right now shows a live bar and a Pomodoro button. */
export default function TaskRow({ t, store, onDelete, siblings }: { t: Task; store: Store; onDelete: (id: string) => void; siblings: Task[] }) {
  const now = useNow();
  const pomo = usePomodoro();
  const live = currentTask(siblings, now)?.id === t.id;
  const prog = live ? taskProgress(t, now) : null;
  const linked = pomo.active && pomo.taskId === t.id;
  return (
    <div className={`row-item task-row ${live ? "live" : ""}`}>
      <input type="checkbox" aria-label={`Mark “${t.title}” done`} checked={t.done} onChange={() => store.toggleTask(t.id)} />
      <span className="time">{t.time}<small>{endTime(t.time, t.minutes)}</small></span>
      <div className="grow">
        <div className="task-title">
          <b className={t.done ? "struck" : ""}>{t.title}</b>
          {live && <span className="live-badge"><i />LIVE · {fmtMinutes(prog!.left)} left</span>}
        </div>
        <div className="muted small"><i className="dot" style={{ background: KIND_COLOR[t.kind] }} />{KIND_LABEL[t.kind]} · {SUBJECT_SHORT[t.subject] ?? t.subject} · {fmtMinutes(t.minutes)}</div>
        {live && <div className="live-bar" aria-hidden><i style={{ width: `${prog!.frac * 100}%` }} /></div>}
      </div>
      {(live || linked) && !t.done && (
        <button className="btn sm pomo-launch" onClick={() => (pomo.active ? pomo.expand() : pomo.start({ id: t.id, title: t.title }))}>
          <Timer size={14} /> {pomo.active ? "Open timer" : "Pomodoro"}
        </button>
      )}
      <button className="icon-btn" aria-label={`Delete ${t.title}`} onClick={() => onDelete(t.id)}><Trash2 size={15} /></button>
    </div>
  );
}
