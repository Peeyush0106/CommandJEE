"use client";
import { CheckCircle2 } from "lucide-react";
import { CardHead, EmptyState, PriorityBadge } from "../ui";
import { SUBJECT_COLOR, SUBJECT_SHORT } from "../../lib/constants";
import type { Store } from "../../lib/store";
import { useToast } from "../ui";

export default function Revisions({ store, go }: { store: Store; go: (p: string) => void }) {
  const toast = useToast();
  const due = store.state.chapters.filter((c) => c.status === "revision").sort((a, b) => a.priority.localeCompare(b.priority) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return (
    <section className="card">
      <CardHead title="Revision queue" sub="Recall first, rereading second" right={<span className="badge">{due.length} due</span>} />
      <p className="muted info-line">Chapters set to <b>Revision</b> in the tracker appear here. After a retest, record how it went.</p>
      {due.length ? (
        <div className="list">
          {due.map((c) => (
            <div className="row-item wrap" key={c.id}>
              <div className="grow">
                <b>{c.name}</b>
                <div className="muted small"><i className="dot" style={{ background: SUBJECT_COLOR[c.subject] }} />{SUBJECT_SHORT[c.subject]}</div>
              </div>
              <PriorityBadge p={c.priority} />
              <div className="row wrap-actions">
                <button className="btn sm success" onClick={() => { store.patchChapter(c.id, { status: "mastery" }); toast({ title: `${c.name} marked as mastered`, tone: "success", action: { label: "Undo", onClick: () => store.patchChapter(c.id, { status: "revision" }) } }); }}>Retest passed</button>
                <button className="btn sm" onClick={() => { store.patchChapter(c.id, { status: "complete_weak" }); toast({ title: `${c.name} marked as weak`, action: { label: "Undo", onClick: () => store.patchChapter(c.id, { status: "revision" }) } }); }}>Still weak</button>
                <button className="btn sm" onClick={() => { store.patchChapter(c.id, { status: "pyqs" }); toast({ title: `${c.name} moved back to PYQs`, action: { label: "Undo", onClick: () => store.patchChapter(c.id, { status: "revision" }) } }); }}>Practise more</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<CheckCircle2 size={22} />} title="No revisions due">
          Set a chapter's status to Revision in the <button className="text-btn" onClick={() => go("chapters")}>chapter tracker</button> to queue it here.
        </EmptyState>
      )}
    </section>
  );
}
