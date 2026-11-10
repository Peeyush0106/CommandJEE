"use client";
import { type CSSProperties } from "react";
import { Activity, AlertTriangle, ArrowRight, CalendarPlus, Clock3, GraduationCap, RefreshCw, Siren, Target } from "lucide-react";
import { CardHead, Donut, EmptyState, PriorityBadge, Progress } from "../ui";
import TaskRow from "../TaskRow";
import { useNow } from "../Now";
import { COUNTED_KINDS, PRIORITIES, STATUSES, SUBJECTS, SUBJECT_COLOR, SUBJECT_SHORT } from "../../lib/constants";
import { addDays, fmtDate, fmtMinutes, toISO } from "../../lib/date";
import type { Store } from "../../lib/store";

function Item({ icon, title, count, to, lines, empty, go }: { icon: React.ReactNode; title: string; count: number; to: string; lines: string[]; empty: string; go: (p: string) => void }) {
  return (
    <button className={`pri-item ${count ? "hot" : ""}`} onClick={() => go(to)}>
      <span className="pri-icon">{icon}</span>
      <span className="pri-main">
        <span className="pri-title"><b>{title}</b><em>{count}</em></span>
        <small>{count ? lines.slice(0, 3).join(" · ") + (count > 3 ? ` · +${count - 3} more` : "") : empty}</small>
      </span>
      <ArrowRight size={15} />
    </button>
  );
}

export default function Dashboard({ store, go, addBlock, onDelete }: { store: Store; go: (p: string) => void; addBlock: () => void; onDelete: (id: string) => void }) {
  const { state } = store;
  const { chapters, tasks, mocks } = state;
  const now = useNow();
  const t0 = toISO(now);

  const todayTasks = tasks.filter((t) => t.date === t0).sort((a, b) => a.time.localeCompare(b.time));
  const doneCount = todayTasks.filter((t) => t.done).length;
  const doneMin = todayTasks.filter((t) => t.done && COUNTED_KINDS.includes(t.kind)).reduce((a, t) => a + t.minutes, 0);
  const target = state.targetHours * 60;

  const revisions = chapters.filter((c) => c.status === "revision");
  const weak = chapters.filter((c) => c.status === "complete_weak").sort((a, b) => a.priority.localeCompare(b.priority));
  const p1Pending = chapters.filter((c) => c.priority === "P1" && c.status === "pending");
  const overdue = tasks.filter((t) => t.date < t0 && !t.done);

  const mastered = chapters.filter((c) => c.status === "mastery").length;
  const pct = Math.round((mastered / Math.max(chapters.length, 1)) * 100);
  const inProgress = chapters.filter((c) => ["theory", "pyqs", "revision", "complete_weak"].includes(c.status)).length;
  const statusCounts = STATUSES.map((s) => ({ ...s, count: chapters.filter((c) => c.status === s.key).length }));
  const subjectStats = SUBJECTS.map((subject) => {
    const list = chapters.filter((c) => c.subject === subject);
    return {
      subject, total: list.length, mastered: list.filter((c) => c.status === "mastery").length,
      weak: list.filter((c) => c.status === "complete_weak").length, pending: list.filter((c) => c.status === "pending").length,
      minutes: tasks.filter((t) => t.done && t.subject === subject && COUNTED_KINDS.includes(t.kind)).reduce((a, t) => a + t.minutes, 0),
    };
  });
  const trackedTotal = subjectStats.reduce((a, s) => a + s.minutes, 0);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(t0, i - 6);
    const minutes = tasks.filter((t) => t.done && t.date === date && COUNTED_KINDS.includes(t.kind)).reduce((a, t) => a + t.minutes, 0);
    return { date, minutes, label: fmtDate(date, { weekday: "short" }), isToday: date === t0 };
  });
  const maxMin = Math.max(target, ...week.map((d) => d.minutes), 60);
  const weekTotal = week.reduce((a, d) => a + d.minutes, 0);

  const kpis = [
    { label: "Syllabus mastered", value: `${pct}%`, hint: `${mastered} of ${chapters.length} chapters`, Icon: GraduationCap, to: "chapters" },
    { label: "In progress", value: inProgress, hint: "Being learned or retested", Icon: Activity, to: "chapters" },
    { label: "Studied today", value: fmtMinutes(doneMin), hint: `target ${state.targetHours}h`, Icon: Clock3, to: "today" },
    { label: "Revisions due", value: revisions.length, hint: "Recall sessions waiting", Icon: RefreshCw, to: "revisions" },
  ];

  return (
    <div className="stack">
      <section className="focus-card" aria-label="Today's priorities">
        <div className="focus-head">
          <div>
            <div className="eyebrow">Priority · {fmtDate(t0, { weekday: "long", day: "numeric", month: "long" })}</div>
            <h2>Today's focus</h2>
          </div>
          <div className="row wrap-actions">
            <span className="badge crit">{doneCount}/{todayTasks.length} blocks done</span>
            <button className="btn sm" onClick={() => go("today")}>Open Today view <ArrowRight size={14} /></button>
            <button className="btn primary sm" onClick={addBlock}><CalendarPlus size={14} /> Add block</button>
          </div>
        </div>

        <div className="focus-grid">
          <div className="focus-col">
            <div className="focus-sub">Today's schedule</div>
            {todayTasks.length ? (
              <div className="list">{todayTasks.map((t) => <TaskRow key={t.id} t={t} store={store} onDelete={onDelete} siblings={todayTasks} />)}</div>
            ) : (
              <EmptyState title="Nothing planned for today">Add a study block to get your day moving.</EmptyState>
            )}
          </div>
          <div className="focus-col">
            <div className="focus-sub">Priority details</div>
            <div className="target-box">
              <div className="between"><span><Target size={15} /> Daily target</span><b>{fmtMinutes(doneMin)} <small>/ {fmtMinutes(target)}</small></b></div>
              <Progress value={(doneMin / Math.max(target, 1)) * 100} color="var(--red)" />
            </div>
            <div className="pri-list">
              <Item go={go} icon={<Siren size={16} />} title="Overdue blocks" count={overdue.length} to="planner" lines={overdue.map((t) => t.title)} empty="Nothing overdue — nice." />
              <Item go={go} icon={<RefreshCw size={16} />} title="Revisions due" count={revisions.length} to="revisions" lines={revisions.map((c) => c.name)} empty="No recall sessions waiting." />
              <Item go={go} icon={<AlertTriangle size={16} />} title="Weak chapters" count={weak.length} to="chapters" lines={weak.map((c) => c.name)} empty="No chapters flagged weak." />
              <Item go={go} icon={<Target size={16} />} title="P1 not started" count={p1Pending.length} to="chapters" lines={p1Pending.map((c) => c.name)} empty="All must-do chapters started." />
            </div>
          </div>
        </div>
      </section>

      <div className="section-label"><span>Progress &amp; analytics</span></div>

      <div className="grid4 secondary">
        {kpis.map((k) => (
          <button key={k.label} className="card kpi" onClick={() => go(k.to)}>
            <div className="kpi-top"><span>{k.label}</span><k.Icon size={16} /></div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-hint">{k.hint}</div>
          </button>
        ))}
      </div>

      <div className="grid2 secondary">
        <section className="card">
          <CardHead title="Syllabus progress" sub="Chapter status across all three subjects" right={<span className="badge">{chapters.length} chapters</span>} />
          <div className="donut-layout">
            <Donut size={168} thickness={23} segments={statusCounts.map((s) => ({ value: s.count, color: s.color }))} big={chapters.length} small="chapters" />
            <ul className="legend">
              {statusCounts.map((s) => (
                <li key={s.key}><i style={{ background: s.color }} /><span>{s.label}</span><b>{s.count}</b><small>{Math.round((s.count / Math.max(chapters.length, 1)) * 100)}%</small></li>
              ))}
            </ul>
          </div>
          <div className="subject-tiles">
            {subjectStats.map((s) => (
              <button key={s.subject} className="subject-tile" onClick={() => go(`chapters/${s.subject}`)}>
                <div className="between"><b><i className="dot" style={{ background: SUBJECT_COLOR[s.subject] }} />{SUBJECT_SHORT[s.subject]}</b><b>{Math.round((s.mastered / Math.max(s.total, 1)) * 100)}%</b></div>
                <Progress value={(s.mastered / Math.max(s.total, 1)) * 100} color={SUBJECT_COLOR[s.subject]} />
                <span className="muted tiny">{s.mastered}/{s.total} mastered · {s.weak} weak · {s.pending} pending</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <CardHead title="Study time · last 7 days" sub="Completed study, revision and mock blocks" right={<span className="badge">{fmtMinutes(weekTotal)} total</span>} />
          <div className="mini-stats">
            <div><b>{(weekTotal / 7 / 60).toFixed(1)}h</b><span>Daily average</span></div>
            <div><b>{state.targetHours}h</b><span>Daily target</span></div>
            <div><b>{week.filter((d) => d.minutes >= target).length}/7</b><span>Days on target</span></div>
          </div>
          <div className="bars" role="img" aria-label="Study minutes per day for the last seven days">
            <div className="target-line" style={{ "--ratio": target / maxMin } as CSSProperties}><span>target</span></div>
            {week.map((d) => (
              <div className={`bar-col ${d.isToday ? "today" : ""}`} key={d.date} title={`${d.label}: ${fmtMinutes(d.minutes)}`}>
                <span className="bar-val">{d.minutes ? `${(d.minutes / 60).toFixed(1)}h` : ""}</span>
                <div className="bar-track"><div className="bar-fill" style={{ height: `${(d.minutes / maxMin) * 100}%` }} /></div>
                <span className="bar-label">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="time-split">
            <b>Tracked time by subject</b>
            {subjectStats.map((s) => (
              <div className="time-row" key={s.subject}>
                <span>{SUBJECT_SHORT[s.subject]}</span>
                <Progress value={(s.minutes / Math.max(trackedTotal, 1)) * 100} color={SUBJECT_COLOR[s.subject]} />
                <b>{fmtMinutes(s.minutes)}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid2 secondary">
        <section className="card">
          <CardHead title="Priority split" sub="Your chapter segregation" />
          <div className="prio-rows">
            {PRIORITIES.map((p) => {
              const n = chapters.filter((c) => c.priority === p.key).length;
              return (
                <div key={p.key}>
                  <div className="between"><span className="prio-label"><PriorityBadge p={p.key} /> {p.label}</span><b>{n}</b></div>
                  <Progress value={(n / Math.max(chapters.length, 1)) * 100} color={`var(--prio-${p.key})`} />
                </div>
              );
            })}
          </div>
        </section>
        <section className="card">
          <CardHead title="Recent mocks" right={<button className="text-btn" onClick={() => go("mocks")}>View all</button>} />
          {mocks.length ? (
            <div className="list">
              {mocks.slice(-3).reverse().map((m) => (
                <div className="row-item" key={m.id}>
                  <div className="grow"><b>{m.name}</b><div className="muted small">{fmtDate(m.date, { day: "numeric", month: "short", year: "numeric" })}</div></div>
                  <b className="score">{m.p + m.c + m.m}<small>/300</small></b>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No mocks recorded">Log your first mock as a baseline.</EmptyState>}
        </section>
      </div>
    </div>
  );
}
