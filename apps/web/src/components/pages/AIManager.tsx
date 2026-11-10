"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Send, Sparkles } from "lucide-react";
import { CardHead, useToast } from "../ui";
import { addDays, today } from "../../lib/date";
import { suggestTime } from "../EventWizard";
import type { Store, Task } from "../../lib/store";

type Msg = { role: "assistant" | "user"; text: string };
type Proposal = { lines: string[]; applyLabel?: string; apply?: () => string };
const makeId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const PROMPTS = ["Plan tomorrow", "I missed some tasks, reschedule", "I'm weak in a chapter", "What should I focus on?"];

export default function AIManager({ store }: { store: Store }) {
  const toast = useToast();
  const { state } = store;
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: "I'm your CommandJEE planning assistant. Tell me what changed or where you're stuck, and I'll suggest changes for your approval." }]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [msgs, proposal]);

  const reply = (q: string) => {
    const t0 = today();
    let answer = "Let's break that down. Tell me the chapter, the time you have and the deadline for a more specific proposal.";
    let next: Proposal | null = null;

    if (/plan|tomorrow|schedule/i.test(q)) {
      const day = addDays(t0, 1);
      const defs: { title: string; subject: string; minutes: number; kind: Task["kind"] }[] = [
        { title: "Physics problem-solving block", subject: "Physics", minutes: 90, kind: "study" },
        { title: "Chemistry concepts + PYQs", subject: "Chemistry", minutes: 90, kind: "study" },
        { title: "Mathematics independent practice", subject: "Mathematics", minutes: 90, kind: "study" },
        { title: "Spaced revision session", subject: "General", minutes: 45, kind: "revision" },
      ];
      answer = "Here's a balanced draft for tomorrow based on your priorities. It's rule-based — no AI model is connected yet.";
      next = {
        lines: defs.map((d) => `${d.title} · ${d.minutes} min`), applyLabel: "Add to tomorrow's planner",
        apply: () => {
          const acc = [...state.tasks];
          defs.forEach((d) => { const task: Task = { id: makeId(), title: d.title, subject: d.subject, chapter: "", date: day, time: suggestTime(acc, day), minutes: d.minutes, kind: d.kind, done: false }; acc.push(task); store.addTask(task); });
          return `Added ${defs.length} blocks to tomorrow's planner.`;
        },
      };
    } else if (/miss|move|reschedul|overdue/i.test(q)) {
      const overdue = state.tasks.filter((t) => t.date < t0 && !t.done);
      if (!overdue.length) { answer = "You have no unfinished blocks from earlier days — nothing to reschedule."; }
      else {
        answer = `You have ${overdue.length} unfinished block${overdue.length === 1 ? "" : "s"} from earlier days. I can spread them into the next free slots. Nothing changes until you approve.`;
        next = {
          lines: overdue.slice(0, 6).map((t) => `${t.title} (was ${t.date})`), applyLabel: "Move to next free slots",
          apply: () => {
            const acc = [...state.tasks.filter((t) => !overdue.some((o) => o.id === t.id))];
            overdue.forEach((t) => {
              let day = t0, time = suggestTime(acc, day), n = 0;
              while (time >= "21:00" && n++ < 14) { day = addDays(day, 1); time = suggestTime(acc, day); }
              store.updateTask(t.id, { date: day, time }); acc.push({ ...t, date: day, time });
            });
            return `Rescheduled ${overdue.length} block${overdue.length === 1 ? "" : "s"}.`;
          },
        };
      }
    } else if (/weak|stuck|accuracy/i.test(q)) {
      const weak = state.chapters.filter((c) => c.status === "complete_weak").slice(0, 2);
      answer = "Let's diagnose the gap before adding more workload.";
      next = {
        lines: ["Identify the weakest subtopic", "Redo three previously missed questions", "Schedule a short retest in 2–3 days"],
        ...(weak.length ? {
          applyLabel: "Schedule the retest",
          apply: () => {
            const day = addDays(t0, 2);
            store.addTask({ id: makeId(), title: `Retest: ${weak.map((c) => c.name).join(" + ")}`, subject: weak.length === 1 ? weak[0].subject : "Mixed", chapter: weak.map((c) => c.name).join(" + "), date: day, time: suggestTime(state.tasks, day), minutes: 60, kind: "revision", done: false, items: weak.map((c) => ({ subject: c.subject, chapter: c.name, tasks: ["Revision"], done: false })) });
            return "Added a retest block two days from now.";
          },
        } : {}),
      };
    } else if (/focus|next|prioriti/i.test(q)) {
      const pool = state.chapters.filter((c) => c.status === "complete_weak").concat(state.chapters.filter((c) => c.status !== "mastery" && c.priority === "P1" && c.status !== "complete_weak"));
      const top = pool.slice(0, 4);
      answer = top.length ? "Based on your tracker, these deserve attention first (weak chapters, then unfinished P1s):" : "Everything marked P1 is mastered — nice. Keep revising and take a mock.";
      next = top.length ? { lines: top.map((c) => `${c.name} (${c.subject}, ${c.priority})`) } : null;
    }
    setMsgs((m) => [...m, { role: "assistant", text: answer }]);
    setProposal(next);
  };

  const ask = (q: string) => { const v = q.trim(); if (!v) return; setMsgs((m) => [...m, { role: "user", text: v }]); setText(""); reply(v); };
  const submit = (e: FormEvent) => { e.preventDefault(); ask(text); };

  return (
    <div className="grid-chat">
      <section className="card chat">
        <CardHead title="AI Study Manager" sub="Suggest · Review · Approve" right={<span className="logo-mark sm"><Sparkles size={15} /></span>} />
        <div className="chat-log" aria-live="polite">
          {msgs.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.text}</div>)}
          {proposal && (
            <div className="proposal">
              <b>Proposed changes</b>
              <ul>{proposal.lines.map((l) => <li key={l}>{l}</li>)}</ul>
              <div className="row">
                {proposal.apply && <button className="btn primary sm" onClick={() => { const done = proposal.apply!(); setMsgs((m) => [...m, { role: "assistant", text: done }]); setProposal(null); toast({ title: done, tone: "success" }); }}><Check size={14} /> {proposal.applyLabel}</button>}
                <button className="btn sm" onClick={() => setProposal(null)}>{proposal.apply ? "Reject" : "Dismiss"}</button>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="chips prompts">{PROMPTS.map((p) => <button key={p} className="chip" onClick={() => ask(p)}>{p}</button>)}</div>
        <form className="chat-form" onSubmit={submit}>
          <input className="field" aria-label="Message" placeholder="Tell CommandJEE what changed…" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn primary" disabled={!text.trim()}><Send size={15} /> Send</button>
        </form>
        <p className="muted small foot-note">Rule-based local assistant. Live AI will connect through a secure server route later.</p>
      </section>

      <aside className="card">
        <CardHead title="Assistant context" sub="What the assistant can see" />
        <div className="list">
          {[["P1 chapters", state.chapters.filter((c) => c.priority === "P1").length], ["In progress", state.chapters.filter((c) => c.status === "pyqs" || c.status === "theory").length], ["Planned blocks", state.tasks.length], ["Mock tests", state.mocks.length]].map(([l, v]) => (
            <div className="between kv" key={String(l)}><span className="muted">{l}</span><b>{v}</b></div>
          ))}
        </div>
        <div className="note"><b>Permission mode</b><p className="muted small">Suggestions only. Nothing changes until you press the approve button.</p></div>
      </aside>
    </div>
  );
}
