"use client";
import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { CardHead, EmptyState } from "../ui";
import { KIND_COLOR, KIND_LABEL, SUBJECT_SHORT, type TaskKind } from "../../lib/constants";
import { endTime, fmtDate, fmtMinutes, pad, toISO, today } from "../../lib/date";
import type { Store } from "../../lib/store";

export default function CalendarPage({ store, addBlock, onDelete }: { store: Store; addBlock: (date?: string) => void; onDelete: (id: string) => void }) {
  const { tasks } = store.state;
  const t0 = today();
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selected, setSelected] = useState(t0);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // week starts Monday
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => toISO(new Date(month.getFullYear(), month.getMonth(), i + 1)))] as (string | null)[];
  }, [month]);
  const byDate = useMemo(() => {
    const m = new Map<string, typeof tasks>();
    tasks.forEach((t) => m.set(t.date, [...(m.get(t.date) ?? []), t]));
    m.forEach((v) => v.sort((a, b) => a.time.localeCompare(b.time)));
    return m;
  }, [tasks]);
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const goToday = () => { const n = new Date(); setMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setSelected(t0); };
  const dayTasks = byDate.get(selected) ?? [];
  const monthPrefix = `${month.getFullYear()}-${pad(month.getMonth() + 1)}`;
  const monthCount = tasks.filter((t) => t.date.startsWith(monthPrefix)).length;

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
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div className="cal-dow" key={d}>{d}</div>)}
          {cells.map((iso, i) => {
            if (!iso) return <div key={`b${i}`} className="cal-cell blank" />;
            const list = byDate.get(iso) ?? [];
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
            {dayTasks.map((t) => (
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
