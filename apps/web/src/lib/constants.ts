import type { ChapterStatus, Priority, Subject } from "@commandjee/shared";

export const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Mathematics"];
export const SUBJECT_SHORT: Record<string, string> = { Physics: "Physics", Chemistry: "Chemistry", Mathematics: "Maths", Mixed: "Mixed", General: "General" };
export const SUBJECT_COLOR: Record<string, string> = { Physics: "#4cc9f0", Chemistry: "#f4a261", Mathematics: "#b794f6", Mixed: "#94a3b8", General: "#94a3b8" };

export const STATUSES: { key: ChapterStatus; label: string; color: string }[] = [
  { key: "pending", label: "Pending", color: "#8b9ab4" },
  { key: "theory", label: "Theory", color: "#5b8cff" },
  { key: "pyqs", label: "PYQs", color: "#a58bff" },
  { key: "revision", label: "Revision", color: "#f2b14a" },
  { key: "mastery", label: "Mastery", color: "#3ccf91" },
  { key: "complete_weak", label: "Complete but Weak", color: "#f0646c" },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.label])) as Record<ChapterStatus, string>;
export const STATUS_COLOR = Object.fromEntries(STATUSES.map((s) => [s.key, s.color])) as Record<ChapterStatus, string>;

export const PRIORITIES: { key: Priority; label: string; hint: string }[] = [
  { key: "P1", label: "Must do", hint: "Core, high-yield chapters" },
  { key: "P2", label: "Should do", hint: "Important, after P1" },
  { key: "P3", label: "Deferred", hint: "Only if time permits" },
];
export const PRIORITY_LABEL: Record<Priority, string> = { P1: "Must do", P2: "Should do", P3: "Deferred" };

export type TaskKind = "study" | "revision" | "mock" | "coaching";
export const KIND_LABEL: Record<TaskKind, string> = { study: "Study", revision: "Revision", mock: "Mock test", coaching: "Coaching" };
export const KIND_COLOR: Record<TaskKind, string> = { study: "#5b8cff", revision: "#3ccf91", mock: "#f2b14a", coaching: "#a58bff" };
/** Kinds that count toward "study time". */
export const COUNTED_KINDS: TaskKind[] = ["study", "revision", "mock"];
