"use client";
import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { CardHead, EmptyState } from "../ui";
import { KIND_COLOR, KIND_LABEL, SUBJECT_SHORT, type TaskKind } from "../../lib/constants";
import { classesForLogicalDay, endTime, fmtDate, fmtMinutes, logicalDateAt, pad, tasksByLogicalDay, toISO, toMinutes } from "../../lib/date";
import type { Store } from "../../lib/store";

export default function CalendarPage({ store, addBlock, onDelete }: { store: Store; addBlock: (date?: string) => void; onDelete: (id: string) => void }) {
  const { tasks, classes, dayStartMinutes, weekStartsOn } = store.state;
  const t0 = logicalDateAt(new Date(), dayStartMinutes);
  const [month, setMonth] = useState(() => new Date(Number(t0.slice(0, 4)), Number(t0.slice(5, 7)) - 1, 1));
  const [selected, setSelected] = useState(t0);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const lead = weekStartsOn === "monday" ? (first.getDay() + 6) % 7 : first.getDay();
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => toISO(new Date(month.getFullYear(), month.getMonth(), i + 1)))] as (string | null)[];
  }, [month, weekStartsOn]);
  const fromDate = (date: string) => new Date(`${date}T00:00:00`);
  const byDate = useMemo(() => tasksByLogicalDay(tasks, dayStartMinutes), [tasks, dayStartMinutes]);
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const goToday = () => { const n = new Date(); const date = logicalDateAt(n, dayStartMinutes); setMonth(new Date(fromDate(date).getFullYear(), fromDate(date).getMonth(), 1)); setSelected(date); };
  const sortOffset = (item: (typeof tasks)[number]) => item.dayOffsetMinutes ?? (toMinutes(item.time) - dayStartMinutes + 1440) % 1440;
  const dayTasks = [...(byDate.get(selected) ?? []), ...classesForLogicalDay(classes, selected, dayStartMinutes)].sort((a, b) => sortOffset(a) - sortOffset(b));
  const monthPrefix = `${month.getFullYear()}-${pad(month.getMonth() + 1)}`;
  const monthCount = [...byDate.entries()].filter(([date]) => date.startsWith(monthPrefix)).reduce((count, [, list]) => count + list.length, 0)
    + cells.filter((date): date is string => date !== null && date.startsWith(monthPrefix)).reduce((count, date) => count + classesForLogicalDay(classes, date, dayStartMinutes).length, 0);
  const weekDays = weekStartsOn === "monday" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="cal-layout">
      <section className="card">
        <CardHead title={month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} sub={`${monthCount} block${monthCount === 1 ? "" : "s"} this month`}
          right={<div className="row">
            <button className="icon-btn bordered" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
            <button className="btn sm" onClick={goToday}>Today</button>
            <button className="icon-btn bordered" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={16} /></button>
          </div>} />
        <div className="cal-grid" role="grid" aria-label="Month calendar">
          {weekDays.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
          {cells.map((iso, i) => {
            if (!iso) return <div key={`b${i}`} className="cal-cell blank" />;
            const list = [...(byDate.get(iso) ?? []), ...classesForLogicalDay(classes, iso, dayStartMinutes)].sort((a, b) => sortOffset(a) - sortOffset(b));
            return (
              <button key={iso} type="button" className={`cal-cell ${iso === t0 ? "today" : ""} ${iso === selected ? "selected" : ""}`} onClick={() => setSelected(iso)} onDoubleClick={() => addBlock(iso)}
                aria-label={`${fmtDate(iso)}, ${list.length} block${list.length === 1 ? "" : "s"}`} aria-pressed={iso === selected}>
                <span className="cal-num">{Number(iso.slice(8))}</span>
                <span className="cal-events">
                  {list.slice(0, 2).map((t) => <span key={t.id} className={`cal-event ${t.done ? "done" : ""}`} style={{ "--k": KIND_COLOR[t.kind] } as React.CSSProperties}>{t.time} {t.title}</span>)}
                  {list.length > 2 && <span className="cal-more">+{list.length - 2} more</span>}
                </span>
                {list.length > 0 && <span className="cal-dots">{list.slice(0, 4).map((t) => <i key={t.id} style={{ background: KIND_COLOR[t.kind] }} />)}</span>}
              </button>
            );
          })}
        </div>
        <div className="cal-legend">{(Object.keys(KIND_LABEL) as TaskKind[]).map((k) => <span key={k}><i style={{ background: KIND_COLOR[k] }} />{KIND_LABEL[k]}</span>)}<span className="muted">Tip: double-click a day to add a block</span></div>
      </section>

      <aside className="card day-panel">
        <CardHead title={fmtDate(selected, { weekday: "long" })} sub={fmtDate(selected, { day: "numeric", month: "long", year: "numeric" })} />
        <button className="btn primary block" onClick={() => addBlock(selected)}><CalendarPlus size={15} /> Add block on this day</button>
        {dayTasks.length ? (
          <div className="list">
            {dayTasks.map((t) => t.id.startsWith("class-") ? (
              <div className="row-item" key={t.id}><i className="dot lg" style={{ background: KIND_COLOR.coaching }} /><div className="grow"><b>{t.title}</b><div className="muted small">{t.time}–{endTime(t.time, t.minutes)} · {fmtMinutes(t.minutes)} · {t.subject}</div></div><span className="badge">Recurring class</span></div>
            ) : (
              <div className="row-item" key={t.id}>
                <input type="checkbox" className="check" aria-label={`Mark “${t.title}” done`} checked={t.done} onChange={() => store.toggleTask(t.id)} />
                <div className="grow">
                  <b className={t.done ? "struck" : ""}>{t.title}</b>
                  <div className="muted small"><i className="dot" style={{ background: KIND_COLOR[t.kind] }} />{t.time}–{endTime(t.time, t.minutes)} · {fmtMinutes(t.minutes)} · {SUBJECT_SHORT[t.subject] ?? t.subject}</div>
                </div>
                <button className="icon-btn" aria-label={`Delete ${t.title}`} onClick={() => onDelete(t.id)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        ) : <EmptyState title="Nothing scheduled">Pick another day or add a block.</EmptyState>}
      </aside>
    </div>
  );
}
