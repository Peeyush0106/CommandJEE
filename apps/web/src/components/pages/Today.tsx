"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AlertTriangle, ArrowRight, CalendarPlus, CircleCheck, RefreshCw, Siren, Target, Timer, TrendingDown, TrendingUp } from "lucide-react";
import { CardHead, Donut, EmptyState, Progress, Segmented } from "../ui";
import TaskRow from "../TaskRow";
import { RollText, clockText, useCountdown, useNow } from "../Now";
import { usePomodoro } from "../Pomodoro";
import { COUNTED_KINDS, KIND_COLOR, KIND_LABEL, SUBJECTS, SUBJECT_COLOR, SUBJECT_SHORT, type TaskKind } from "../../lib/constants";
import { addDays, currentTask, endTime, fmtDate, fmtMinutes, minutesOfDay, toISO, toMinutes } from "../../lib/date";
import { streak, studiedOn } from "../../lib/stats";
import type { Store, Task } from "../../lib/store";

const HOUR = 56;

function dayOfYear(d: Date) { return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5); }

/** Greedy column layout so overlapping blocks sit side by side. */
function layout(tasks: Task[]) {
  const sorted = [...tasks].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const out = new Map<string, { lane: number; lanes: number }>();
  let cluster: Task[] = [], laneEnds: number[] = [], clusterEnd = -1;
  const flush = () => { cluster.forEach((t) => (out.get(t.id)!.lanes = laneEnds.length)); cluster = []; laneEnds = []; };
  for (const t of sorted) {
    const s = toMinutes(t.time), e = s + t.minutes;
    if (s >= clusterEnd) { flush(); clusterEnd = -1; }
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane < 0) { lane = laneEnds.length; laneEnds.push(e); } else laneEnds[lane] = e;
    clusterEnd = Math.max(clusterEnd, e);
    out.set(t.id, { lane, lanes: 1 });
    cluster.push(t);
  }
  flush();
  return out;
}

export default function Today({ store, go, addBlock, onDelete }: { store: Store; go: (p: string) => void; addBlock: () => void; onDelete: (id: string) => void }) {
  const { state } = store;
  const { tasks, chapters, mocks, focusLog } = state;
  const now = useNow();
  const pomo = usePomodoro();
  const cd = useCountdown(state.examDate);
  const t0 = toISO(now);
  const nowMin = minutesOfDay(now);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const day = useMemo(() => tasks.filter((t) => t.date === t0).sort((a, b) => a.time.localeCompare(b.time)), [tasks, t0]);
  const tomorrow = tasks.filter((t) => t.date === addDays(t0, 1)).sort((a, b) => a.time.localeCompare(b.time));
  const live = currentTask(day, now);
  const next = day.find((t) => !t.done && toMinutes(t.time) > nowMin) ?? null;

  const planned = day.reduce((a, t) => a + t.minutes, 0);
  const doneMin = day.filter((t) => t.done).reduce((a, t) => a + t.minutes, 0);
  const studied = studiedOn(state, t0);
  const target = state.targetHours * 60;
  const shouldBeDone = day.filter((t) => toMinutes(t.time) + t.minutes <= nowMin).reduce((a, t) => a + t.minutes, 0);
  const behind = Math.max(0, shouldBeDone - doneMin);
  const last7 = Array.from({ length: 7 }, (_, i) => studiedOn(state, addDays(t0, -(i + 1))));
  const avg7 = last7.reduce((a, b) => a + b, 0) / 7;
  const focusToday = focusLog.filter((f) => f.date === t0);
  const focusMin = focusToday.reduce((a, f) => a + f.minutes, 0);
  const minsLeftInDay = Math.max(0, 1440 - nowMin);
  const unscheduled = Math.max(0, target - studied - day.filter((t) => !t.done && COUNTED_KINDS.includes(t.kind)).reduce((a, t) => a + t.minutes, 0));

  const events = day.filter((t) => t.kind === "mock" || t.kind === "coaching");
  const todaysMocks = mocks.filter((m) => m.date === t0);
  const overdue = tasks.filter((t) => t.date < t0 && !t.done);
  const revisions = chapters.filter((c) => c.status === "revision");
  const weak = chapters.filter((c) => c.status === "complete_weak").sort((a, b) => a.priority.localeCompare(b.priority));
  const upNext = chapters.filter((c) => c.priority === "P1" && c.status === "pending").slice(0, 3);

  const bySubject = SUBJECTS.map((s) => ({ s, planned: day.filter((t) => t.subject === s).reduce((a, t) => a + t.minutes, 0), done: day.filter((t) => t.subject === s && t.done).reduce((a, t) => a + t.minutes, 0) }));
  const byKind = (Object.keys(KIND_LABEL) as TaskKind[]).map((k) => ({ k, min: day.filter((t) => t.kind === k).reduce((a, t) => a + t.minutes, 0) })).filter((x) => x.min > 0);

  /* timeline range */
  const startH = Math.min(6, day.length ? Math.floor(Math.min(...day.map((t) => toMinutes(t.time))) / 60) : 6);
  const endH = Math.min(24, Math.max(23, day.length ? Math.ceil(Math.max(...day.map((t) => toMinutes(t.time) + t.minutes)) / 60) : 23));
  const lanes = useMemo(() => layout(day), [day]);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = Math.max(0, ((nowMin / 60) - startH - 1.5) * HOUR); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const nowTop = (nowMin / 60 - startH) * HOUR;

  const shown = day.filter((t) => (filter === "all" ? true : filter === "done" ? t.done : !t.done));
  const planPct = planned ? Math.round((doneMin / planned) * 100) : 0;

  return (
    <div className="stack">
      <section className="today-hero">
        <div className="th-clock">
          <div className="eyebrow">{fmtDate(t0, { weekday: "long" })} · Day {dayOfYear(now)} of {dayOfYear(new Date(now.getFullYear(), 11, 31))}</div>
          <div className="th-time"><RollText text={clockText(now)} /></div>
          <div className="th-date">{fmtDate(t0, { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <div className="th-stats">
          <div><span>Day elapsed</span><b>{Math.round((nowMin / 1440) * 100)}%</b><Progress value={(nowMin / 1440) * 100} /></div>
          <div><span>Left in the day</span><b>{fmtMinutes(minsLeftInDay)}</b></div>
          <div><span>Blocks done</span><b>{day.filter((t) => t.done).length}/{day.length}</b></div>
          <div><span>Exam in</span><b>{cd.d}d {cd.h}h</b></div>
        </div>
        <div className="th-now">
          {live ? (
            <div className="now-card live"><span className="live-dot" /><div><small>Happening now</small><b>{live.title}</b><span>{live.time}–{endTime(live.time, live.minutes)}</span></div>
              <button className="btn sm" onClick={() => (pomo.active ? pomo.expand() : pomo.start({ id: live.id, title: live.title }))}><Timer size={14} /> {pomo.active ? "Open timer" : "Pomodoro"}</button></div>
          ) : next ? (
            <div className="now-card"><div><small>Up next</small><b>{next.title}</b><span>at {next.time} · in {fmtMinutes(toMinutes(next.time) - nowMin)}</span></div></div>
          ) : (
            <div className="now-card"><div><small>Nothing scheduled right now</small><b>{day.length ? "All blocks for today are behind you" : "Your day is open"}</b></div>
              <button className="btn sm primary" onClick={addBlock}><CalendarPlus size={14} /> Add block</button></div>
          )}
        </div>
      </section>

      <div className="today-grid">
        <div className="stack">
          <section className="card">
            <CardHead title="Timeline" sub="Your blocks across the day · red line is now" right={<button className="btn sm primary" onClick={addBlock}><CalendarPlus size={14} /> Add block</button>} />
            <div className="timeline-scroll" ref={scroller}>
              <div className="timeline" style={{ height: (endH - startH) * HOUR }}>
                {Array.from({ length: endH - startH + 1 }, (_, i) => (
                  <div className="tl-hour" key={i} style={{ top: i * HOUR }}><span>{String(startH + i).padStart(2, "0")}:00</span></div>
                ))}
                {day.map((t) => {
                  const l = lanes.get(t.id)!;
                  const top = ((toMinutes(t.time) / 60) - startH) * HOUR;
                  return (
                    <button key={t.id} className={`tl-block ${t.done ? "done" : ""} ${live?.id === t.id ? "live" : ""}`}
                      style={{ top, height: Math.max(t.minutes / 60 * HOUR - 3, 28), left: `calc(58px + (100% - 62px) * ${l.lane / l.lanes})`, width: `calc((100% - 62px) / ${l.lanes} - 4px)`, "--k": KIND_COLOR[t.kind] } as CSSProperties}
                      onClick={() => store.toggleTask(t.id)} title="Click to toggle done">
                      <b>{t.title}</b><small>{t.time}–{endTime(t.time, t.minutes)} · {KIND_LABEL[t.kind]}</small>
                    </button>
                  );
                })}
                {nowTop >= 0 && nowTop <= (endH - startH) * HOUR && <div className="tl-now" style={{ top: nowTop }}><span>{clockText(now).slice(0, 5)}</span></div>}
              </div>
            </div>
          </section>

          <section className="card">
            <CardHead title="Today's tasks" sub={`${day.length} block${day.length === 1 ? "" : "s"} · ${fmtMinutes(planned)} planned`}
              right={<Segmented label="Filter" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "pending", label: "Pending" }, { value: "done", label: "Done" }]} />} />
            {shown.length ? <div className="list">{shown.map((t) => <TaskRow key={t.id} t={t} store={store} onDelete={onDelete} siblings={day} />)}</div>
              : <EmptyState title={day.length ? "Nothing in this filter" : "No blocks today"}>{day.length ? "Try another filter." : "Add a study block to plan your day."}</EmptyState>}
          </section>

          <section className="card">
            <CardHead title="Events" sub="Mocks and coaching today" />
            {events.length || todaysMocks.length ? (
              <div className="list">
                {events.map((t) => <div className="row-item" key={t.id}><i className="dot lg" style={{ background: KIND_COLOR[t.kind] }} /><div className="grow"><b>{t.title}</b><div className="muted small">{KIND_LABEL[t.kind]} · {t.time}–{endTime(t.time, t.minutes)}</div></div>{t.done && <span className="badge success">Done</span>}</div>)}
                {todaysMocks.map((m) => <div className="row-item" key={m.id}><i className="dot lg" style={{ background: KIND_COLOR.mock }} /><div className="grow"><b>{m.name}</b><div className="muted small">Score recorded</div></div><b className="score">{m.p + m.c + m.m}<small>/300</small></b></div>)}
              </div>
            ) : <EmptyState title="No events today">Mock tests and coaching sessions appear here.</EmptyState>}
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <CardHead title="Day analytics" sub="How today is going" />
            <div className="donut-layout compact">
              <Donut size={132} thickness={19} big={`${planPct}%`} small="of plan" segments={[{ value: doneMin, color: "var(--green)" }, { value: Math.max(planned - doneMin, planned ? 0 : 1), color: "var(--panel-3)" }]} />
              <ul className="legend one">
                <li><i style={{ background: "var(--green)" }} /><span>Done</span><b>{fmtMinutes(doneMin)}</b></li>
                <li><i style={{ background: "var(--panel-3)" }} /><span>Remaining</span><b>{fmtMinutes(planned - doneMin)}</b></li>
                <li><i style={{ background: "var(--amber)" }} /><span>Target</span><b>{fmtMinutes(target)}</b></li>
              </ul>
            </div>
            <div className={`pace ${behind ? "behind" : "ok"}`}>
              {behind ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
              {behind ? `Behind plan by ${fmtMinutes(behind)} — finish earlier blocks or reschedule.` : shouldBeDone ? "On track with today's plan." : "No blocks due yet."}
            </div>
            <div className="today-kv">
              <div><span>Studied today</span><b>{fmtMinutes(studied)}</b></div>
              <div><span>Last 7-day average</span><b>{fmtMinutes(avg7)}</b></div>
              <div><span>vs average</span><b className={studied >= avg7 ? "up" : "down"}>{studied >= avg7 ? "+" : "−"}{fmtMinutes(Math.abs(studied - avg7))}</b></div>
              <div><span>Still to plan for target</span><b>{fmtMinutes(unscheduled)}</b></div>
              <div><span>Study streak</span><b>{streak(state, t0)} day{streak(state, t0) === 1 ? "" : "s"}</b></div>
            </div>
            <div className="time-split">
              <b>By subject (done / planned)</b>
              {bySubject.map(({ s, planned: p, done }) => (
                <div className="time-row" key={s}><span>{SUBJECT_SHORT[s]}</span><Progress value={p ? (done / p) * 100 : 0} color={SUBJECT_COLOR[s]} /><b>{fmtMinutes(done)}/{fmtMinutes(p)}</b></div>
              ))}
              {byKind.length > 0 && <div className="chips kinds">{byKind.map(({ k, min }) => <span key={k} className="chip on" style={{ "--k": KIND_COLOR[k] } as CSSProperties}><i className="dot" style={{ background: KIND_COLOR[k] }} />{KIND_LABEL[k]} {fmtMinutes(min)}</span>)}</div>}
            </div>
          </section>

          <section className="card">
            <CardHead title="Focus sessions" sub="Pomodoros completed today" right={<button className="btn sm" onClick={() => (pomo.active ? pomo.expand() : pomo.start(live ? { id: live.id, title: live.title } : null))}><Timer size={14} /> {pomo.active ? "Open timer" : "Start"}</button>} />
            <div className="today-kv">
              <div><span>Sessions</span><b>{focusToday.length}</b></div>
              <div><span>Focused time</span><b>{fmtMinutes(focusMin)}</b></div>
              <div><span>Timer</span><b>{pomo.active ? (pomo.running ? "Running" : "Paused") : "Idle"}</b></div>
            </div>
          </section>

          <section className="card attention">
            <CardHead title="Needs attention" sub="What to protect time for today" />
            <AttentionRow icon={<Siren size={15} />} label="Overdue blocks" items={overdue.map((t) => `${t.title} (${fmtDate(t.date, { day: "numeric", month: "short" })})`)} go={() => go("planner")} />
            <AttentionRow icon={<RefreshCw size={15} />} label="Revisions due" items={revisions.map((c) => c.name)} go={() => go("revisions")} />
            <AttentionRow icon={<AlertTriangle size={15} />} label="Weak chapters" items={weak.map((c) => c.name)} go={() => go("chapters")} />
            <AttentionRow icon={<Target size={15} />} label="Suggested next (P1)" items={upNext.map((c) => c.name)} go={() => go("chapters")} />
          </section>

          <section className="card">
            <CardHead title="Tomorrow" sub={fmtDate(addDays(t0, 1), { weekday: "long", day: "numeric", month: "short" })} right={<button className="text-btn" onClick={() => go("planner")}>Planner <ArrowRight size={13} /></button>} />
            {tomorrow.length ? (
              <div className="list">{tomorrow.slice(0, 5).map((t) => <div className="row-item" key={t.id}><span className="time">{t.time}<small>{endTime(t.time, t.minutes)}</small></span><div className="grow"><b>{t.title}</b><div className="muted small">{SUBJECT_SHORT[t.subject] ?? t.subject} · {fmtMinutes(t.minutes)}</div></div></div>)}</div>
            ) : <EmptyState icon={<CircleCheck size={20} />} title="Nothing planned for tomorrow">Plan ahead from the planner or the AI manager.</EmptyState>}
          </section>
        </div>
      </div>
    </div>
  );
}

function AttentionRow({ icon, label, items, go }: { icon: React.ReactNode; label: string; items: string[]; go: () => void }) {
  return (
    <button className="att-row" onClick={go}>
      <span className="att-icon">{icon}</span>
      <span className="att-main"><b>{label}</b><small>{items.length ? items.slice(0, 3).join(" · ") + (items.length > 3 ? ` · +${items.length - 3}` : "") : "All clear"}</small></span>
      <em className={items.length ? "hot" : ""}>{items.length}</em>
    </button>
  );
}
