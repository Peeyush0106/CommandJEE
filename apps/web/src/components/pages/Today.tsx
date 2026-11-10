"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AlertTriangle, ArrowRight, CalendarPlus, CircleCheck, RefreshCw, Siren, Target, Timer, TrendingDown, TrendingUp } from "lucide-react";
import { CardHead, Donut, EmptyState, Progress, Segmented } from "../ui";
import TaskRow from "../TaskRow";
import { RollText, clockText, useCountdown, useNow } from "../Now";
import { usePomodoro } from "../Pomodoro";
import { COUNTED_KINDS, KIND_COLOR, KIND_LABEL, PRIORITIES, SUBJECTS, SUBJECT_COLOR, SUBJECT_SHORT, type TaskKind } from "../../lib/constants";
import { addDays, classesForLogicalDay, currentTask, endTime, fmtDate, fmtMinutes, fromISO, fromMinutes, logicalDateAt, minutesOfDay, tasksByLogicalDay, tasksForLogicalDay, toISO, toMinutes } from "../../lib/date";
import { streak, studiedOn } from "../../lib/stats";
import type { Store, Task } from "../../lib/store";

const HOUR = 56;

function dayOfYear(d: Date) { return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5); }

/** Greedy column layout so overlapping blocks sit side by side. */
function layout(tasks: Task[]) {
  const offset = (t: Task) => t.dayOffsetMinutes ?? toMinutes(t.time);
  const sorted = [...tasks].sort((a, b) => offset(a) - offset(b));
  const out = new Map<string, { lane: number; lanes: number }>();
  let cluster: Task[] = [], laneEnds: number[] = [], clusterEnd = -1;
  const flush = () => { cluster.forEach((t) => (out.get(t.id)!.lanes = laneEnds.length)); cluster = []; laneEnds = []; };
  for (const t of sorted) {
    const s = offset(t), e = s + t.minutes;
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
  const t0 = logicalDateAt(now, state.dayStartMinutes);
  const nowMin = minutesOfDay(now);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [view, setView] = useState<"day" | "syllabus">("day");

  const day = useMemo(() => tasksForLogicalDay(tasks, t0, state.dayStartMinutes), [tasks, t0, state.dayStartMinutes]);
  const tomorrow = tasksForLogicalDay(tasks, addDays(t0, 1), state.dayStartMinutes);
  const dayOffset = (time: number) => (time - state.dayStartMinutes + 1440) % 1440;
  const nowOffset = dayOffset(nowMin);
  const live = currentTask(day, now);
  const next = day.find((t) => !t.done && (t.dayOffsetMinutes ?? dayOffset(toMinutes(t.time))) > nowOffset) ?? null;

  const planned = day.reduce((a, t) => a + t.minutes, 0);
  const doneMin = day.filter((t) => t.done).reduce((a, t) => a + t.minutes, 0);
  const studied = studiedOn(state, t0);
  const target = state.targetHours * 60;
  const shouldBeDone = day.filter((t) => (t.dayOffsetMinutes ?? dayOffset(toMinutes(t.time))) + t.minutes <= nowOffset).reduce((a, t) => a + t.minutes, 0);
  const behind = Math.max(0, shouldBeDone - doneMin);
  const last7 = Array.from({ length: 7 }, (_, i) => studiedOn(state, addDays(t0, -(i + 1))));
  const avg7 = last7.reduce((a, b) => a + b, 0) / 7;
  const focusToday = focusLog.filter((f) => f.date === t0);
  const focusMin = focusToday.reduce((a, f) => a + f.minutes, 0);
  const minsLeftInDay = Math.max(0, 1440 - nowOffset);
  const unscheduled = Math.max(0, target - studied - day.filter((t) => !t.done && COUNTED_KINDS.includes(t.kind)).reduce((a, t) => a + t.minutes, 0));

  const events = day.filter((t) => t.kind === "mock" || t.kind === "coaching");
  const todaysMocks = mocks.filter((m) => m.date === t0);
  const overdue = [...tasksByLogicalDay(tasks, state.dayStartMinutes)]
    .filter(([date]) => date < t0).flatMap(([, items]) => items.filter((t) => !t.done));
  const revisions = chapters.filter((c) => c.status === "revision");
  const weak = chapters.filter((c) => c.status === "complete_weak").sort((a, b) => a.priority.localeCompare(b.priority));
  const upNext = chapters.filter((c) => c.priority === "P1" && c.status === "pending").slice(0, 3);

  const bySubject = SUBJECTS.map((s) => ({ s, planned: day.filter((t) => t.subject === s).reduce((a, t) => a + t.minutes, 0), done: day.filter((t) => t.subject === s && t.done).reduce((a, t) => a + t.minutes, 0) }));
  const byKind = (Object.keys(KIND_LABEL) as TaskKind[]).map((k) => ({ k, min: day.filter((t) => t.kind === k).reduce((a, t) => a + t.minutes, 0) })).filter((x) => x.min > 0);

  /* timeline range */
  const startH = 0;
  const endH = 24;
  const lanes = useMemo(() => layout(day), [day]);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = scroller.current; if (el) el.scrollTop = Math.max(0, ((nowOffset / 60) - 1.5) * HOUR); }, [nowOffset]);
  const nowTop = (nowOffset / 60) * HOUR;

  const shown = day.filter((t) => (filter === "all" ? true : filter === "done" ? t.done : !t.done));
  const planPct = planned ? Math.round((doneMin / planned) * 100) : 0;

  return (
    <div className="stack">
      <div className="between"><div><div className="eyebrow">Daily workspace</div><p className="muted small">Your day begins at {fromMinutes(state.dayStartMinutes)}.</p></div><Segmented label="Today view" value={view} onChange={setView} options={[{ value: "day", label: "Day" }, { value: "syllabus", label: "Syllabus" }]} /></div>
      <div hidden={view === "syllabus"}>
      <section className="today-hero">
        <div className="th-clock">
          <div className="eyebrow">{fmtDate(t0, { weekday: "long" })} · Day {dayOfYear(fromISO(t0))} of {dayOfYear(new Date(fromISO(t0).getFullYear(), 11, 31))}</div>
          <div className="th-time"><RollText text={clockText(now)} /></div>
          <div className="th-date">{fmtDate(t0, { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <div className="th-stats">
          <div><span>Day elapsed</span><b>{Math.round((nowOffset / 1440) * 100)}%</b><Progress value={(nowOffset / 1440) * 100} /></div>
          <div><span>Left in the day</span><b>{fmtMinutes(minsLeftInDay)}</b></div>
          <div><span>Blocks done</span><b>{day.filter((t) => t.done).length}/{day.length}</b></div>
          <div><span>Exam in</span><b>{cd.d}d {cd.h}h</b></div>
        </div>
        <div className="th-now">
          {live ? (
            <div className="now-card live"><span className="live-dot" /><div><small>Happening now</small><b>{live.title}</b><span>{live.time}–{endTime(live.time, live.minutes)}</span></div>
              <button className="btn sm" onClick={() => (pomo.active ? pomo.expand() : pomo.start({ id: live.id, title: live.title }))}><Timer size={14} /> {pomo.active ? "Open timer" : "Pomodoro"}</button></div>
          ) : next ? (
            <div className="now-card"><div><small>Up next</small><b>{next.title}</b><span>at {next.time} · in {fmtMinutes((next.dayOffsetMinutes ?? dayOffset(toMinutes(next.time))) - nowOffset)}</span></div></div>
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
              <div className="timeline full-day" style={{ height: (endH - startH) * HOUR }}>
                {Array.from({ length: endH - startH + 1 }, (_, i) => (
                    <div className="tl-hour" key={i} style={{ top: i * HOUR }}><span>{fromMinutes(state.dayStartMinutes + i * 60)}</span></div>
                ))}
                {day.map((t) => {
                  const l = lanes.get(t.id)!;
                    const top = ((t.dayOffsetMinutes ?? dayOffset(toMinutes(t.time))) / 60) * HOUR;
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
            <CardHead title="Recurring classes" sub={fmtDate(t0, { weekday: "long", day: "numeric", month: "long" })} />
            {classesForLogicalDay(state.classes, t0, state.dayStartMinutes).length ? <div className="list">{classesForLogicalDay(state.classes, t0, state.dayStartMinutes).map((item) => <div className="row-item" key={item.id}><i className="dot lg" style={{ background: KIND_COLOR.coaching }} /><div className="grow"><b>{item.title}</b><div className="muted small">{item.time}–{endTime(item.time, item.minutes)} · {item.subject}</div></div><span className="badge">Class</span></div>)}</div>
              : <EmptyState title="No recurring classes today">Add your weekly coaching schedule in Settings.</EmptyState>}
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
      <SyllabusOverview store={store} hidden={view !== "syllabus"} />
    </div>
  );
}

function SyllabusOverview({ store, hidden }: { store: Store; hidden: boolean }) {
  const { chapters, examDate } = store.state;
  const now = useNow();
  const todayKey = logicalDateAt(now, store.state.dayStartMinutes);
  const daysLeft = Math.max(0, Math.ceil((new Date(`${examDate}T00:00:00`).getTime() - fromISO(todayKey).getTime()) / 864e5));
  const remaining = chapters.filter((c) => c.status !== "mastery").length;
  const perWeek = daysLeft ? Math.ceil((remaining / daysLeft) * 7) : remaining;
  const projection = perWeek > 0 ? new Date(fromISO(todayKey).getTime() + Math.ceil(remaining / perWeek * 7) * 864e5) : fromISO(todayKey);
  const risk = chapters.filter((c) => c.priority === "P1" && ["pending", "complete_weak", "revision"].includes(c.status));
  return <section className="stack" hidden={hidden}>
    <div className="grid-auto">
      <div className="card kpi static"><div className="kpi-top"><span>Overall syllabus</span></div><div className="kpi-value">{Math.round(((chapters.length - remaining) / Math.max(chapters.length, 1)) * 100)}%</div><div className="kpi-hint">{chapters.length - remaining} of {chapters.length} mastered</div></div>
      <div className="card kpi static"><div className="kpi-top"><span>Weekly pace needed</span></div><div className="kpi-value">{perWeek}</div><div className="kpi-hint">chapters per week until exam</div></div>
      <div className="card kpi static"><div className="kpi-top"><span>Projected finish</span></div><div className="kpi-value sm">{fmtDate(toISO(projection), { day: "numeric", month: "short" })}</div><div className="kpi-hint">{daysLeft} days to target date</div></div>
      <div className="card kpi static"><div className="kpi-top"><span>P1 at risk</span></div><div className="kpi-value">{risk.length}</div><div className="kpi-hint">pending, weak, or due for revision</div></div>
    </div>
    {SUBJECTS.map((subject) => {
      const list = chapters.filter((c) => c.subject === subject);
      const mastered = list.filter((c) => c.status === "mastery").length;
      return <section className="card syllabus-subject" key={subject}><CardHead title={subject} sub={`${mastered} of ${list.length} chapters mastered`} right={<span className="badge">{Math.round(mastered / Math.max(list.length, 1) * 100)}%</span>} /><div className="syllabus-heatmap">{list.map((chapter) => <div className={`heat-cell status-${chapter.status}`} key={chapter.id} title={`${chapter.name} · ${chapter.status}`}><span>{chapter.name}</span></div>)}</div></section>;
    })}
    <section className="card"><CardHead title="Priority coverage" sub="Mastery progress by priority band" />{PRIORITIES.map((priority) => {
      const list = chapters.filter((chapter) => chapter.priority === priority.key);
      const covered = list.filter((chapter) => chapter.status === "mastery").length;
      return <div className="priority-coverage" key={priority.key}><div className="between"><b>{priority.label}</b><span className="muted small">{covered}/{list.length}</span></div><Progress value={covered / Math.max(list.length, 1) * 100} /></div>;
    })}</section>
    <section className="card"><CardHead title="What's at risk this week" sub="P1 chapters pending, weak, or awaiting revision" />{risk.length ? <div className="list">{risk.slice(0, 10).map((chapter) => <div className="row-item" key={chapter.id}><span className="badge crit">{chapter.priority}</span><div className="grow"><b>{chapter.name}</b><div className="muted small">{chapter.subject} · {chapter.status.replace("_", " ")}</div></div></div>)}</div> : <EmptyState title="No priority chapters at risk">Your must-do chapters are mastered or in good progress.</EmptyState>}</section>
  </section>;
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
