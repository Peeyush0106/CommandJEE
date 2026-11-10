"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHAPTERS } from "@commandjee/shared";
import type { Chapter, ChapterStatus } from "@commandjee/shared";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { TaskKind } from "./constants";

export type TaskItem = { subject: string; chapter: string; tasks: string[]; done?: boolean };
export type Task = {
  id: string; title: string; subject: string; chapter: string; date: string; time: string; minutes: number;
  kind: TaskKind; done: boolean; items?: TaskItem[]; dayOffsetMinutes?: number;
};
export type Mock = { id: string; name: string; date: string; p: number; c: number; m: number; notes: string };
export type FocusEntry = { id: string; date: string; minutes: number; taskId?: string; at: number };
export type Profile = { name: string; targetScore: string; studentClass: string; attempt: string };
export type StudyClass = {
  id: string; title: string; subject: string; weekdays: number[]; time: string; minutes: number;
  exceptions: Record<string, { cancelled?: boolean; date?: string; time?: string; minutes?: number }>;
};
export type State = {
  chapters: Chapter[]; tasks: Task[]; mocks: Mock[]; classes: StudyClass[];
  theme: "dark" | "light"; targetHours: number;
  dayStartMinutes: number;
  /** ISO date (YYYY-MM-DD); the exam starts at midnight IST. */
  examDate: string;
  focusLog: FocusEntry[];
  profile: Profile;
  onboardingComplete: boolean;
  weekStartsOn: "monday" | "sunday";
  pomodoroMinutes: number;
  security: { passkeysEnabled: boolean };
};

const migrateStatus = (v: string) =>
  (({ not_started: "pending", learning: "theory", theory_complete: "theory", practising: "pyqs", revision_due: "revision", retesting: "revision", mastered: "mastery" }) as Record<string, string>)[v] || v;

const freshChapters = (): Chapter[] =>
  CHAPTERS.map((x, i) => ({ ...x, sortOrder: i, status: migrateStatus(x.status) as ChapterStatus }));

export const initialState = (): State => ({
  chapters: freshChapters(), tasks: [], mocks: [], classes: [], theme: "dark", targetHours: 6,
  dayStartMinutes: 0, examDate: "2027-01-15", focusLog: [],
  profile: { name: "", targetScore: "", studentClass: "", attempt: "" },
  onboardingComplete: false, weekStartsOn: "monday", pomodoroMinutes: 25, security: { passkeysEnabled: false },
});

function normalise(raw: unknown): State {
  const base = initialState();
  if (!raw || typeof raw !== "object") return base;
  const x = raw as Partial<State>;
  const chapters = Array.isArray(x.chapters) && x.chapters.length
    ? x.chapters.map((c, i) => ({ ...c, sortOrder: c.sortOrder ?? i, status: migrateStatus(c.status) as ChapterStatus }))
    : base.chapters;
  return {
    chapters,
    tasks: Array.isArray(x.tasks) ? x.tasks : [],
    mocks: Array.isArray(x.mocks) ? x.mocks : [],
    classes: Array.isArray(x.classes) ? x.classes : [],
    theme: x.theme === "light" ? "light" : "dark",
    targetHours: typeof x.targetHours === "number" && x.targetHours > 0 ? Math.min(16, x.targetHours) : base.targetHours,
    dayStartMinutes: typeof x.dayStartMinutes === "number" ? Math.max(0, Math.min(480, Math.round(x.dayStartMinutes / 30) * 30)) : 0,
    focusLog: Array.isArray(x.focusLog) ? x.focusLog : [],
    profile: {
      name: typeof x.profile?.name === "string" ? x.profile.name.slice(0, 40) : "",
      targetScore: typeof x.profile?.targetScore === "string" ? x.profile.targetScore.slice(0, 40) : "",
      studentClass: typeof x.profile?.studentClass === "string" ? x.profile.studentClass.slice(0, 40) : "",
      attempt: typeof x.profile?.attempt === "string" ? x.profile.attempt.slice(0, 40) : "",
    },
    examDate: typeof x.examDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.examDate) ? x.examDate : base.examDate,
    onboardingComplete: x.onboardingComplete === true,
    weekStartsOn: x.weekStartsOn === "sunday" ? "sunday" : "monday",
    pomodoroMinutes: typeof x.pomodoroMinutes === "number" ? Math.max(5, Math.min(120, x.pomodoroMinutes)) : 25,
    security: { passkeysEnabled: x.security?.passkeysEnabled === true },
  };
}

export function useStore(uid: string) {
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [syncError, setSyncError] = useState("");
  const lastRemoteState = useRef("");

  useEffect(() => {
    if (!db) {
      setSyncError("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values from .env.example.");
      return;
    }
    setReady(false);
    setState(initialState());
    lastRemoteState.current = "";
    const ref = doc(db, "users", uid, "workspace", "state");
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        const remote = normalise(snapshot.data().state);
        const serialized = JSON.stringify(remote);
        lastRemoteState.current = serialized;
        setState((current) => JSON.stringify(current) === serialized ? current : remote);
      } else {
        const fresh = initialState();
        lastRemoteState.current = JSON.stringify(fresh);
        setState(fresh);
        void setDoc(ref, { state: fresh }).catch((error: unknown) => {
          lastRemoteState.current = "";
          setSaveError(true);
          setSyncError(error instanceof Error ? error.message : "Could not create your cloud workspace.");
        });
      }
      setSyncError("");
      setReady(true);
    }, (error) => {
      setSyncError(error.message);
      setReady(true);
    });
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!ready || !db || syncError) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastRemoteState.current) return;
    const ref = doc(db, "users", uid, "workspace", "state");
    const timer = window.setTimeout(() => {
      void setDoc(ref, { state }).then(() => {
        lastRemoteState.current = serialized;
        setSaveError(false);
      }).catch((error: unknown) => {
        setSaveError(true);
        setSyncError(error instanceof Error ? error.message : "Could not save your cloud workspace.");
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state, ready, syncError, uid]);

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
  const setDayStartMinutes = useCallback((dayStartMinutes: number) => setState((s) => ({ ...s, dayStartMinutes: Math.max(0, Math.min(480, Math.round(dayStartMinutes / 30) * 30)) })), []);
  const addFocus = useCallback((e: FocusEntry) => setState((s) => ({ ...s, focusLog: [...s.focusLog, e] })), []);
  const setProfile = useCallback((p: Partial<Profile>) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })), []);
  const completeOnboarding = useCallback(() => setState((s) => ({ ...s, onboardingComplete: true })), []);
  const addClass = useCallback((studyClass: StudyClass) => setState((s) => ({ ...s, classes: [...s.classes, studyClass] })), []);
  const updateClass = useCallback((id: string, patch: Partial<StudyClass>) => setState((s) => ({ ...s, classes: s.classes.map((c) => c.id === id ? { ...c, ...patch } : c) })), []);
  const removeClass = useCallback((id: string) => setState((s) => ({ ...s, classes: s.classes.filter((c) => c.id !== id) })), []);
  const updateWeekStart = useCallback((weekStartsOn: State["weekStartsOn"]) => setState((s) => ({ ...s, weekStartsOn })), []);
  const setPomodoroMinutes = useCallback((pomodoroMinutes: number) => setState((s) => ({ ...s, pomodoroMinutes: Math.max(5, Math.min(120, pomodoroMinutes)) })), []);

  return { state, ready, saveError, syncError, patchChapter, reorderChapters, addTask, updateTask, toggleTask, toggleTaskItem, removeTask, restoreTask, addMock, removeMock, restoreMock, setTheme, addFocus, setProfile, setExamDate, setTargetHours, setDayStartMinutes, completeOnboarding, addClass, updateClass, removeClass, updateWeekStart, setPomodoroMinutes };
}
export type Store = ReturnType<typeof useStore>;
