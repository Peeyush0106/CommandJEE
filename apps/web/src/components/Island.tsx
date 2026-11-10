"use client";
import { Pause, Play, Timer } from "lucide-react";
import { RollText, useNow } from "./Now";
import { PHASE_COLORS, PHASE_LABEL, usePomodoro } from "./Pomodoro";
import { currentTask, endTime, fmtMinutes, pad, taskProgress } from "../lib/date";
import { KIND_COLOR } from "../lib/constants";
import type { Task } from "../lib/store";

/** Dynamic-Island style status: the live task, the running pomodoro, or both side by side. */
export default function Island({ tasks, openToday }: { tasks: Task[]; openToday: () => void }) {
  const p = usePomodoro();
  const now = useNow();
  const live = currentTask(tasks, now);
  const showTask = !!live && !p.fullscreen;
  const showPomo = p.active && !p.fullscreen;
  if (!showTask && !showPomo) return null;

  const prog = live ? taskProgress(live, now) : null;
  const [c1, c2] = PHASE_COLORS[p.phase];
  const mm = pad(Math.floor(p.remaining / 60)), ss = pad(p.remaining % 60);
  const R = 11, C = 2 * Math.PI * R;

  return (
    <div className={`island ${showTask && showPomo ? "split" : ""}`} role="region" aria-label="Live status">
      {showTask && live && prog && (
        <div className="capsule task-cap" style={{ "--k": KIND_COLOR[live.kind] } as React.CSSProperties}>
          <button className="cap-body" onClick={openToday} title="Open today's view">
            <span className="live-dot" />
            <span className="cap-text">
              <b>{live.title}</b>
              <small>{live.time}–{endTime(live.time, live.minutes)} · {fmtMinutes(prog.left)} left</small>
            </span>
          </button>
          {!showPomo && (
            <button className="cap-btn" aria-label={`Start a pomodoro for ${live.title}`} title="Start pomodoro" onClick={() => p.start({ id: live.id, title: live.title })}><Timer size={15} /></button>
          )}
          <span className="cap-progress"><i style={{ width: `${prog.frac * 100}%` }} /></span>
        </div>
      )}
      {showPomo && (
        <div className="capsule pomo-cap" style={{ "--n1": c1, "--n2": c2 } as React.CSSProperties}>
          <button className="cap-body" onClick={p.expand} title="Open full-screen timer">
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
              <defs><linearGradient id="ig" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
              <circle cx="15" cy="15" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3" />
              <circle cx="15" cy="15" r={R} fill="none" stroke="url(#ig)" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p.progress)} transform="rotate(-90 15 15)" />
            </svg>
            <span className="cap-text">
              <b className="cap-time"><RollText text={`${mm}:${ss}`} /></b>
              <small>{PHASE_LABEL[p.phase]}{!p.running ? " · paused" : ""}</small>
            </span>
          </button>
          <button className="cap-btn" aria-label={p.running ? "Pause" : "Resume"} onClick={p.toggle}>{p.running ? <Pause size={15} /> : <Play size={15} />}</button>
        </div>
      )}
    </div>
  );
}
