"use client";
import { useCallback, useEffect, useState } from "react";
import { CHAPTERS } from "@commandjee/shared";
import type { Chapter, ChapterStatus } from "@commandjee/shared";
import type { TaskKind } from "./constants";

export type TaskItem = { subject: string; chapter: string; tasks: string[]; done?: boolean };
export type Task = {
  id: string; title: string; subject: string; chapter: string; date: string; time: string; minutes: number;
  kind: TaskKind; done: boolean; items?: TaskItem[];
};
export type Mock = { id: string; name: string; date: string; p: number; c: number; m: number; notes: string };
export type FocusEntry = { id: string; date: string; minutes: number; taskId?: string; at: number };
export type Profile = { name: string; targetScore: string };
export type State = {
  chapters: Chapter[]; tasks: Task[]; mocks: Mock[];
  theme: "dark" | "light"; targetHours: number;
  /** ISO date (YYYY-MM-DD); the exam starts at midnight IST. */
  examDate: string;
  focusLog: FocusEntry[];
  profile: Profile;
};

/** Same key as earlier versions, so existing browser data keeps working. */
export const STORAGE_KEY = "commandjee.web.v1";

const migrateStatus = (v: string) =>
  (({ not_started: "pending", learning: "theory", theory_complete: "theory", practising: "pyqs", revision_due: "revision", retesting: "revision", mastered: "mastery" }) as Record<string, string>)[v] || v;

const freshChapters = (): Chapter[] =>
  CHAPTERS.map((x, i) => ({ ...x, sortOrder: i, status: migrateStatus(x.status) as ChapterStatus }));

const initial = (): State => ({ chapters: freshChapters(), tasks: [], mocks: [], theme: "dark", targetHours: 6, examDate: "2027-01-15", focusLog: [], profile: { name: "Aspirant", targetScore: "" } });

function normalise(raw: unknown): State {
  const base = initial();
  if (!raw || typeof raw !== "object") return base;
  const x = raw as Partial<State>;
  const chapters = Array.isArray(x.chapters) && x.chapters.length
    ? x.chapters.map((c, i) => ({ ...c, sortOrder: c.sortOrder ?? i, status: migrateStatus(c.status) as ChapterStatus }))
    : base.chapters;
  return {
    chapters,
    tasks: Array.isArray(x.tasks) ? x.tasks : [],
    mocks: Array.isArray(x.mocks) ? x.mocks : [],
    theme: x.theme === "light" ? "light" : "dark",
    targetHours: typeof x.targetHours === "number" && x.targetHours > 0 ? Math.min(16, x.targetHours) : base.targetHours,
    focusLog: Array.isArray(x.focusLog) ? x.focusLog : [],
    profile: { name: typeof x.profile?.name === "string" && x.profile.name.trim() ? x.profile.name : "Aspirant", targetScore: typeof x.profile?.targetScore === "string" ? x.profile.targetScore : "" },
    examDate: typeof x.examDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.examDate) ? x.examDate : base.examDate,
  };
}

export function useStore() {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) setState(normalise(JSON.parse(v)));
    } catch { /* corrupt or blocked storage: start fresh */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setSaveError(false); }
    catch { setSaveError(true); }
  }, [state, ready]);

  const patchChapter = useCallback((id: string, patch: Partial<Chapter>) =>
    setState((s) => ({ ...s, chapters: s.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)) })), []);
  const reorderChapters = useCallback((orderedIds: string[]) =>
    setState((s) => ({ ...s, chapters: s.chapters.map((c) => { const n = orderedIds.indexOf(c.id); return n >= 0 ? { ...c, sortOrder: n } : c; }) })), []);
  const addTask = useCallback((t: Task) => setState((s) => ({ ...s, tasks: [...s.tasks, t] })), []);
  const toggleTask = useCallback((id: string) =>
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })), []);
  const toggleTaskItem = useCallback((id: string, index: number) =>
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => {
        if (t.id !== id || !t.items) return t;
        const items = t.items.map((it, i) => (i === index ? { ...it, done: !it.done } : it));
        // A block with chapter checklists is complete once every chapter is ticked.
        return { ...t, items, done: items.every((it) => it.done) };
      }),
    })), []);
  const removeTask = useCallback((id: string) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })), []);
  const restoreTask = useCallback((t: Task) => setState((s) => (s.tasks.some((x) => x.id === t.id) ? s : { ...s, tasks: [...s.tasks, t] })), []);
  const updateTask = useCallback((id: string, patch: Partial<Task>) =>
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })), []);
  const addMock = useCallback((m: Mock) => setState((s) => ({ ...s, mocks: [...s.mocks, m] })), []);
  const removeMock = useCallback((id: string) => setState((s) => ({ ...s, mocks: s.mocks.filter((m) => m.id !== id) })), []);
  const restoreMock = useCallback((m: Mock) => setState((s) => (s.mocks.some((x) => x.id === m.id) ? s : { ...s, mocks: [...s.mocks, m] })), []);
  const setTheme = useCallback((theme: State["theme"]) => setState((s) => ({ ...s, theme })), []);
  const setExamDate = useCallback((examDate: string) => setState((s) => ({ ...s, examDate })), []);
  const setTargetHours = useCallback((targetHours: number) => setState((s) => ({ ...s, targetHours })), []);
  const addFocus = useCallback((e: FocusEntry) => setState((s) => ({ ...s, focusLog: [...s.focusLog, e] })), []);
  const setProfile = useCallback((p: Partial<Profile>) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })), []);
  const importState = useCallback((raw: unknown) => setState(normalise(raw)), []);
  const resetAll = useCallback(() => setState(initial()), []);

  return { state, ready, saveError, patchChapter, reorderChapters, addTask, updateTask, toggleTask, toggleTaskItem, removeTask, restoreTask, addMock, removeMock, restoreMock, setTheme, addFocus, setProfile, setExamDate, setTargetHours, importState, resetAll };
}
export type Store = ReturnType<typeof useStore>;
