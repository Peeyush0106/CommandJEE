"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, GripVertical, RotateCcw, Search, Sparkles, X } from "lucide-react";
import type { Chapter, ChapterStatus, Priority, Subject } from "@commandjee/shared";
import { CardHead, ConfirmDialog, Donut, EmptyState, Modal, PriorityBadge, Segmented } from "../ui";
import { PRIORITIES, STATUSES, STATUS_COLOR, SUBJECTS, SUBJECT_COLOR, SUBJECT_SHORT } from "../../lib/constants";
import type { Store } from "../../lib/store";

const rank = (s: ChapterStatus) => (s === "complete_weak" ? 0 : s === "mastery" ? 2 : 1);

function StatusSelect({ chapter, store }: { chapter: Chapter; store: Store }) {
  return (
    <select
      aria-label={`${chapter.name} status`} className="field status-select" value={chapter.status}
      style={{ "--status": STATUS_COLOR[chapter.status] } as React.CSSProperties}
      onChange={(e) => store.patchChapter(chapter.id, { status: e.target.value as ChapterStatus })}
    >
      {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
    </select>
  );
}

export default function Chapters({ store, openSubject, closeSubject, subject }: { store: Store; openSubject: (s: Subject) => void; closeSubject: () => void; subject: Subject | null }) {
  const { chapters } = store.state;
  const [search, setSearch] = useState("");
  const [sub, setSub] = useState<"All" | Subject>("All");
  const [pri, setPri] = useState<"All" | Priority>("All");
  const [stat, setStat] = useState<"All" | ChapterStatus>("All");
  const [drag, setDragState] = useState<{ id: string; subject: Subject; priority: Priority } | null>(null);
  const dragRef = useRef<typeof drag>(null);
  const setDrag = (d: typeof drag) => { dragRef.current = d; setDragState(d); };
  const [drop, setDrop] = useState<string | null>(null);
  const [zone, setZone] = useState<{ p: Priority; s: Subject } | null>(null);
  const [cross, setCross] = useState<{ id: string; name: string; from: Priority; to: Priority; subject: Subject; beforeId: string | null } | null>(null);
  const [move, setMove] = useState<{ id: string; name: string; from: Priority; to: Priority } | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => chapters.filter((c) =>
    (sub === "All" || c.subject === sub) && (pri === "All" || c.priority === pri) && (stat === "All" || c.status === stat) &&
    (!q || c.name.toLowerCase().includes(q) || c.subtopics?.some((x) => x.toLowerCase().includes(q)))), [chapters, sub, pri, stat, q]);
  const mastered = chapters.filter((c) => c.status === "mastery").length;
  const activeFilters = Number(!!q) + Number(sub !== "All") + Number(pri !== "All") + Number(stat !== "All");
  const reset = () => { setSearch(""); setSub("All"); setPri("All"); setStat("All"); };
  const subjects = sub === "All" ? SUBJECTS : [sub];

  const endDrag = () => { setDrag(null); setDrop(null); setZone(null); };
  const ordered = (p: Priority, s: Subject, skip?: string) =>
    chapters.filter((c) => c.priority === p && c.subject === s && c.id !== skip).sort((a, b) => rank(a.status) - rank(b.status) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  /** Drop on a row (target) or on a column background (target = null, append). */
  const dropOn = (p: Priority, s: Subject, items: Chapter[], target: Chapter | null) => {
    const d = dragRef.current;
    endDrag();
    if (!d || d.subject !== s) return; // other subjects are forbidden
    if (d.priority !== p) { const c = chapters.find((x) => x.id === d.id)!; setCross({ id: d.id, name: c.name, from: d.priority, to: p, subject: s, beforeId: target?.id ?? null }); return; }
    if (!target || target.id === d.id) return;
    const group = items.slice();
    const a = group.findIndex((x) => x.id === d.id), b = group.findIndex((x) => x.id === target.id);
    if (a < 0 || b < 0) return;
    const [moved] = group.splice(a, 1);
    group.splice(b, 0, moved);
    store.reorderChapters(group.map((x) => x.id));
  };
  const confirmCross = () => {
    if (!cross) return;
    const rest = ordered(cross.to, cross.subject, cross.id).map((c) => c.id);
    const at = cross.beforeId ? rest.indexOf(cross.beforeId) : -1;
    rest.splice(at < 0 ? rest.length : at, 0, cross.id);
    store.patchChapter(cross.id, { priority: cross.to });
    store.reorderChapters(rest);
  };
  const allowed = (s: Subject) => !drag || drag.subject === s;

  return (
    <>
      <section className="card chapter-page">
        <CardHead title="Chapter tracker" sub="Three priority boards · tap a subject title for its analytics" right={<span className="badge success">{mastered}/{chapters.length} mastered</span>} />
        <div className="toolbar">
          <div className="searchbox grow">
            <Search size={16} />
            <input placeholder="Search chapters or subtopics" aria-label="Search chapters" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button className="icon-btn" aria-label="Clear search" onClick={() => setSearch("")}><X size={15} /></button>}
          </div>
          <Segmented label="Subject" value={sub} onChange={setSub} options={[{ value: "All", label: "All" }, ...SUBJECTS.map((s) => ({ value: s, label: SUBJECT_SHORT[s] }))]} />
          <select className="field inline" aria-label="Filter by priority" value={pri} onChange={(e) => setPri(e.target.value as "All" | Priority)}>
            <option value="All">All priorities</option>
            {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.key} · {p.label}</option>)}
          </select>
          <select className="field inline" aria-label="Filter by status" value={stat} onChange={(e) => setStat(e.target.value as "All" | ChapterStatus)}>
            <option value="All">All statuses</option>
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className="btn" onClick={reset} disabled={!activeFilters}><RotateCcw size={14} /> Reset{activeFilters > 0 && <span className="count-dot">{activeFilters}</span>}</button>
        </div>
        <div className="results-line"><span>{filtered.length} of {chapters.length} chapters</span><span className="hint-drag">Drag <GripVertical size={13} /> to reorder or change priority (same subject)</span></div>

        {PRIORITIES.map((p) => {
          const inPriority = filtered.filter((c) => c.priority === p.key);
          if (pri === "All" ? false : pri !== p.key) return null;
          if (activeFilters > 0 && inPriority.length === 0) return null;
          return (
            <section className="board" key={p.key}>
              <div className="board-head"><div className="row"><PriorityBadge p={p.key} /><b>{p.label}</b><span className="muted">{p.hint}</span></div><span className="muted">{inPriority.length} chapters</span></div>
              <div className="board-cols" style={{ "--cols": subjects.length } as React.CSSProperties}>
                {subjects.map((s) => {
                  const items = inPriority.filter((c) => c.subject === s).sort((a, b) => rank(a.status) - rank(b.status) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                  return (
                    <div className={`subject-col ${drag && !allowed(s) ? "no-drop" : ""} ${zone && zone.p === p.key && zone.s === s && drag ? (allowed(s) ? (drag.priority !== p.key ? "drop-zone" : "") : "forbid") : ""}`} key={s}
                      onDragOver={(e) => { if (!drag) return; if (allowed(s)) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } else e.dataTransfer.dropEffect = "none"; setZone((z) => (z && z.p === p.key && z.s === s ? z : { p: p.key, s })); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setZone((z) => (z && z.p === p.key && z.s === s ? null : z)); }}
                      onDrop={(e) => { e.preventDefault(); dropOn(p.key, s, items, null); }}>
                      <button className="subject-col-head" onClick={() => openSubject(s)} aria-label={`${s} analytics`}>
                        <b><i className="dot" style={{ background: SUBJECT_COLOR[s] }} />{SUBJECT_SHORT[s]}</b>
                        <span>{items.length} · Analytics <ChevronRight size={14} /></span>
                      </button>
                      {items.length === 0 ? <div className="empty compact">No matching chapters</div> : (
                        <div className="chapter-list">
                          {items.map((c) => (
                            <div key={c.id} className={`chapter-row status-${c.status} ${drag?.id === c.id ? "dragging" : ""} ${drop === c.id && allowed(s) ? "drop-target" : ""}`} draggable
                              onDragStart={(e) => { setDrag({ id: c.id, subject: c.subject, priority: c.priority }); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", c.id); }}
                              onDragOver={(e) => { if (allowed(s)) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; setDrop(c.id); setZone({ p: p.key, s }); } }}
                              onDragLeave={() => setDrop((x) => (x === c.id ? null : x))}
                              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropOn(p.key, s, items, c); }}
                              onDragEnd={endDrag}>
                              <GripVertical size={16} className="grip" aria-hidden />
                              <div className="chapter-name">
                                <span>{c.name}</span>
                                {!!c.subtopics?.length && <small>{c.subtopics.length} subtopics</small>}
                              </div>
                              <StatusSelect chapter={c} store={store} />
                              <button className={`prio-chip prio-${c.priority}`} aria-label={`Change priority for ${c.name} (currently ${c.priority})`} title="Change priority" onClick={() => setMove({ id: c.id, name: c.name, from: c.priority, to: c.priority })}>{c.priority}</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && <EmptyState title="No chapters match your filters"><button className="btn" onClick={reset}>Show all chapters</button></EmptyState>}
      </section>

      {subject && typeof document !== "undefined" && createPortal(<SubjectDetail subject={subject} store={store} onClose={closeSubject} />, document.body)}

      {cross && <ConfirmDialog title="Change priority?" message={<>Move <b>{cross.name}</b> from <b>{cross.from}</b> to <b>{cross.to}</b>?</>} confirmLabel="Move chapter" onConfirm={confirmCross} onClose={() => setCross(null)} />}
      {move && (
        <Modal title="Change chapter priority" size="sm" onClose={() => setMove(null)} footer={<>
          <button className="btn" onClick={() => setMove(null)}>Cancel</button>
          <button className="btn primary" disabled={move.to === move.from} onClick={() => { store.patchChapter(move.id, { priority: move.to }); setMove(null); }}>Move chapter</button>
        </>}>
          <p className="confirm-text">Move <b>{move.name}</b> from <b>{move.from}</b> to:</p>
          <div className="radio-cards">
            {PRIORITIES.map((p) => (
              <button key={p.key} type="button" className={`radio-card ${move.to === p.key ? "on" : ""}`} onClick={() => setMove({ ...move, to: p.key })}>
                <PriorityBadge p={p.key} /><span><b>{p.label}</b><small>{p.hint}</small></span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

/* ───────── Subject analytics (full-page overlay) ───────── */
function SubjectDetail({ subject, store, onClose }: { subject: Subject; store: Store; onClose: () => void }) {
  const { chapters, mocks } = store.state;
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, []);
  useEffect(() => { ref.current?.scrollTo({ top: 0 }); }, [subject]);

  const list = chapters.filter((c) => c.subject === subject);
  const total = list.length;
  const done = list.filter((c) => c.status === "mastery").length;
  const weak = list.filter((c) => c.status === "complete_weak");
  const active = list.filter((c) => ["theory", "pyqs", "revision"].includes(c.status));
  const pending = list.filter((c) => c.status === "pending");
  const key = subject === "Physics" ? "p" : subject === "Chemistry" ? "c" : "m";
  const avg = mocks.length ? mocks.reduce((a, m) => a + m[key], 0) / mocks.length : null;

  const overview = done === total ? `${subject} is fully marked as mastered. Keep it fresh with spaced recall and mixed practice.`
    : weak.length ? `${subject} has ${weak.length} chapter${weak.length === 1 ? "" : "s"} marked Complete but Weak. Theory is covered, but reliability needs work, so these are your highest-value strengthening targets.`
    : active.length ? `${subject} has ${active.length} chapter${active.length === 1 ? "" : "s"} in active learning. Convert them into independently solved questions, then schedule spaced revision.`
    : `${subject} has ${pending.length} pending chapters. Start with the highest-priority ones and build momentum with short theory-to-PYQ cycles.`;
  const improve = (weak.length ? weak.slice(0, 3).map((c) => `Strengthen ${c.name} with timed mixed PYQs and an error-log retest.`)
    : active.length ? active.slice(0, 3).map((c) => `Move ${c.name} from ${c.status} to independent question-solving.`)
    : pending.slice(0, 3).map((c) => `Begin ${c.name} with a concise concept pass followed by selected PYQs.`));
  const focus = (weak.length ? weak : active.length ? active : pending).slice(0, 3).map((c) => c.name);
  const sorted = [...list].sort((a, b) => a.priority.localeCompare(b.priority) || rank(a.status) - rank(b.status) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div ref={ref} tabIndex={-1} className="overlay" role="dialog" aria-modal="true" aria-label={`${subject} analytics`}>
      <div className="overlay-inner">
        <button className="btn overlay-back" onClick={onClose}><ChevronLeft size={15} /> Back to chapters</button>
        <div className="overlay-hero">
          <div className="eyebrow">Subject command centre</div>
          <h2><i className="dot lg" style={{ background: SUBJECT_COLOR[subject] }} />{subject}</h2>
          <p className="muted">Coverage, performance and a chapter-level action plan</p>
        </div>
        <div className="grid4">
          {[["Mastered", `${done}/${total}`], ["Coverage", `${Math.round((done / Math.max(total, 1)) * 100)}%`], ["Needs strengthening", weak.length], ["In progress", active.length]].map(([l, v]) => (
            <div className="card kpi static" key={l}><div className="kpi-top"><span>{l}</span></div><div className="kpi-value">{v}</div></div>
          ))}
        </div>
        <div className="grid2">
          <section className="card">
            <CardHead title="Priority distribution" />
            <div className="donut-layout compact">
              <Donut size={140} thickness={20} big={total} small="chapters" segments={PRIORITIES.map((p) => ({ value: list.filter((c) => c.priority === p.key).length, color: `var(--prio-${p.key})` }))} />
              <ul className="legend">{PRIORITIES.map((p) => { const n = list.filter((c) => c.priority === p.key).length; return <li key={p.key}><i style={{ background: `var(--prio-${p.key})` }} /><span>{p.key} · {p.label}</span><b>{n}</b><small>{Math.round((n / Math.max(total, 1)) * 100)}%</small></li>; })}</ul>
            </div>
            <div className="between split-line"><span className="muted">Average mock score</span><b>{avg === null ? "No mock data" : `${avg.toFixed(1)} / 100`}</b></div>
          </section>
          <section className="card">
            <CardHead title="Status distribution" />
            <div className="donut-layout compact">
              <Donut size={140} thickness={20} big={total} small="chapters" segments={STATUSES.map((s) => ({ value: list.filter((c) => c.status === s.key).length, color: s.color }))} />
              <ul className="legend">{STATUSES.map((s) => { const n = list.filter((c) => c.status === s.key).length; return <li key={s.key}><i style={{ background: s.color }} /><span>{s.label}</span><b>{n}</b><small>{Math.round((n / Math.max(total, 1)) * 100)}%</small></li>; })}</ul>
            </div>
          </section>
        </div>
        <section className="card insight">
          <div className="row"><span className="logo-mark sm"><Sparkles size={15} /></span><div><b>Subject overview</b><div className="muted small">Generated from your tracker data</div></div></div>
          <p className="insight-text">{overview}</p>
          <div className="grid2 tight">
            <div><b>Improvement areas</b><ul className="bullets">{improve.length ? improve.map((x) => <li key={x}>{x}</li>) : <li>Maintain mastery with spaced revision.</li>}</ul></div>
            <div><b>Recommended next focus</b><p className="muted">{focus.join(" · ") || "Maintain your current level with mixed practice."}</p></div>
          </div>
        </section>
        <section className="card">
          <CardHead title="Chapter-wise details" sub="Sorted by priority, then status" />
          <div className="list">
            {sorted.map((c) => (
              <div className={`row-item detail status-${c.status}`} key={c.id}>
                <div className="grow"><b>{c.name}</b><div className="muted small">{c.subtopics?.length || 0} subtopics</div></div>
                <PriorityBadge p={c.priority} />
                <StatusSelect chapter={c} store={store} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
