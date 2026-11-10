"use client";
import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CardHead, EmptyState, Modal, useToast } from "../ui";
import { SUBJECT_COLOR } from "../../lib/constants";
import { fmtDate, today } from "../../lib/date";
import type { Mock, Store } from "../../lib/store";

const makeId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const total = (m: Mock) => m.p + m.c + m.m;

function TrendChart({ mocks }: { mocks: Mock[] }) {
  const W = 640, H = 200, L = 40, R = 16, T = 16, B = 30;
  const data = [...mocks].sort((a, b) => a.date.localeCompare(b.date));
  const x = (i: number) => (data.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (data.length - 1));
  const y = (v: number) => T + (1 - Math.max(0, Math.min(300, v)) / 300) * (H - T - B);
  const line = data.map((m, i) => `${x(i)},${y(total(m))}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend" role="img" aria-label="Total mock score over time">
      {[0, 100, 200, 300].map((v) => (<g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid-line" /><text x={L - 8} y={y(v) + 4} textAnchor="end" className="axis-text">{v}</text></g>))}
      {data.length > 1 && <polyline points={line} className="trend-line" fill="none" />}
      {data.map((m, i) => (
        <g key={m.id}>
          <circle cx={x(i)} cy={y(total(m))} r={5} className="trend-dot"><title>{`${m.name}: ${total(m)}/300`}</title></circle>
          <text x={x(i)} y={y(total(m)) - 11} textAnchor="middle" className="axis-text strong">{total(m)}</text>
          <text x={x(i)} y={H - 8} textAnchor="middle" className="axis-text">{fmtDate(m.date, { day: "numeric", month: "short" })}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Mocks({ store, autoOpen = false }: { store: Store; autoOpen?: boolean }) {
  const toast = useToast();
  const { mocks } = store.state;
  const [open, setOpen] = useState(autoOpen);
  const [error, setError] = useState("");
  const sorted = [...mocks].sort((a, b) => b.date.localeCompare(a.date));
  const avg = (k: "p" | "c" | "m") => (mocks.length ? mocks.reduce((a, m) => a + m[k], 0) / mocks.length : 0);
  const best = mocks.length ? Math.max(...mocks.map(total)) : 0;
  const latest = sorted[0];
  const previous = sorted[1];

  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nums = (["p", "c", "m"] as const).map((k) => Number(f.get(k)));
    if (nums.some((n) => !Number.isFinite(n) || n < -25 || n > 100)) { setError("Each subject score must be between -25 and 100."); return; }
    store.addMock({ id: makeId(), name: String(f.get("name")).trim(), date: String(f.get("date")), p: nums[0], c: nums[1], m: nums[2], notes: String(f.get("notes") || "") });
    setOpen(false); setError("");
    toast({ title: "Mock recorded", tone: "success" });
  };
  const remove = (m: Mock) => { store.removeMock(m.id); toast({ title: `Deleted “${m.name}”`, action: { label: "Undo", onClick: () => store.restoreMock(m) } }); };

  return (
    <div className="stack">
      <section className="card">
        <CardHead title="Mock test analytics" sub="Subject-wise scores and trends" right={<button className="btn primary" onClick={() => { setError(""); setOpen(true); }}><Plus size={15} /> Add mock</button>} />
        {mocks.length === 0 ? <EmptyState title="No mocks yet">Record a coaching or full-syllabus mock to set your baseline.</EmptyState> : (
          <>
            <div className="grid-auto tight-top">
              <div className="card kpi static inner"><div className="kpi-top"><span>Latest total</span></div><div className="kpi-value">{total(latest)}<small>/300</small></div>
                <div className="kpi-hint">{previous ? `${total(latest) - total(previous) >= 0 ? "+" : ""}${total(latest) - total(previous)} vs previous` : "First mock"}</div></div>
              <div className="card kpi static inner"><div className="kpi-top"><span>Best total</span></div><div className="kpi-value">{best}<small>/300</small></div><div className="kpi-hint">{mocks.length} mock{mocks.length === 1 ? "" : "s"} recorded</div></div>
              {([["Physics", "p"], ["Chemistry", "c"], ["Mathematics", "m"]] as const).map(([n, k]) => (
                <div className="card kpi static inner" key={n}><div className="kpi-top"><span><i className="dot" style={{ background: SUBJECT_COLOR[n] }} />{n} avg</span></div><div className="kpi-value">{avg(k).toFixed(1)}<small>/100</small></div></div>
              ))}
            </div>
            <TrendChart mocks={mocks} />
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Mock</th><th>Date</th><th>Physics</th><th>Chemistry</th><th>Maths</th><th>Total</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {sorted.map((m) => (
                    <tr key={m.id}>
                      <td><b>{m.name}</b>{m.notes && <div className="muted small">{m.notes}</div>}</td>
                      <td>{fmtDate(m.date, { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td>{m.p}</td><td>{m.c}</td><td>{m.m}</td><td><b>{total(m)}/300</b></td>
                      <td className="right"><button className="icon-btn" aria-label={`Delete ${m.name}`} onClick={() => remove(m)}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {open && (
        <Modal title="Record mock test" onClose={() => setOpen(false)}>
          <form className="form-grid" onSubmit={save}>
            <div className="span"><label className="label" htmlFor="m-name">Mock name</label><input id="m-name" className="field" name="name" required autoFocus placeholder="e.g. Full syllabus mock 1" /></div>
            <div className="span"><label className="label" htmlFor="m-date">Date</label><input id="m-date" className="field" name="date" type="date" defaultValue={today()} required /></div>
            {([["Physics", "p"], ["Chemistry", "c"], ["Mathematics", "m"]] as const).map(([n, k]) => (
              <div key={k}><label className="label" htmlFor={`m-${k}`}>{n}</label><input id={`m-${k}`} className="field" name={k} type="number" min={-25} max={100} defaultValue={0} required /></div>
            ))}
            <div className="span"><label className="label" htmlFor="m-notes">Notes <span className="muted">(optional)</span></label><textarea id="m-notes" className="field" name="notes" rows={3} placeholder="Silly mistakes, time management, topics to revisit…" /></div>
            {error && <div className="span warn" role="alert">{error}</div>}
            <div className="span modal-actions"><button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn primary">Save mock</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
