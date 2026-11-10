"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, CalendarClock, CalendarDays, CalendarPlus, ChartNoAxesCombined, CheckCircle2, Ellipsis, LayoutDashboard, ListTodo, RefreshCw, Settings as SettingsIcon, Sparkles, Timer, User, X } from "lucide-react";
import type { Subject } from "@commandjee/shared";
import { Modal, ToastContext, type ToastInput } from "./ui";
import EventWizard from "./EventWizard";
import { CountdownChip, NowProvider, SidebarClock } from "./Now";
import { PomodoroProvider, PomodoroScreen, usePomodoro } from "./Pomodoro";
import Island from "./Island";
import ProfileMenu from "./ProfileMenu";
import Dashboard from "./pages/Dashboard";
import Today from "./pages/Today";
import Chapters from "./pages/Chapters";
import CalendarPage from "./pages/Calendar";
import Planner from "./pages/Planner";
import Revisions from "./pages/Revisions";
import Mocks from "./pages/Mocks";
import AIManager from "./pages/AIManager";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import { useStore, type Store, type Task } from "../lib/store";
import { exportBackup } from "../lib/backup";
import { SUBJECTS } from "../lib/constants";
import { toISO } from "../lib/date";

type PageId = "dashboard" | "today" | "chapters" | "calendar" | "planner" | "revisions" | "mocks" | "ai" | "settings" | "profile";
type NavItem = { id: PageId | "pomodoro"; label: string; Icon: typeof BookOpen; group: string; primary?: boolean };
const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard, group: "Workspace", primary: true },
  { id: "today", label: "Today", Icon: CalendarClock, group: "Workspace", primary: true },
  { id: "chapters", label: "Chapters", Icon: BookOpen, group: "Workspace", primary: true },
  { id: "calendar", label: "Calendar", Icon: CalendarDays, group: "Workspace" },
  { id: "planner", label: "Study Planner", Icon: ListTodo, group: "Workspace", primary: true },
  { id: "revisions", label: "Revisions", Icon: RefreshCw, group: "Workspace" },
  { id: "pomodoro", label: "Pomodoro", Icon: Timer, group: "Focus" },
  { id: "mocks", label: "Mock Tests", Icon: ChartNoAxesCombined, group: "Performance" },
  { id: "ai", label: "AI Study Manager", Icon: Sparkles, group: "Command centre" },
  { id: "settings", label: "Settings", Icon: SettingsIcon, group: "System" },
  { id: "profile", label: "Profile", Icon: User, group: "System" },
];
const GROUPS = ["Workspace", "Focus", "Performance", "Command centre", "System"];
const PAGE_IDS = NAV.filter((n) => n.id !== "pomodoro").map((n) => n.id as PageId);

type Route = { page: PageId; param: string | null };
const parseHash = (): Route => {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/");
  const first = parts[0] === "overview" ? "dashboard" : parts[0]; // old links
  const page = PAGE_IDS.find((p) => p === first) ?? "dashboard";
  return { page, param: parts[1] ? decodeURIComponent(parts[1]) : null };
};

export default function CommandApp() {
  return <NowProvider><Shell /></NowProvider>;
}

function Shell() {
  const store = useStore();
  const onFocusComplete = useCallback((minutes: number, taskId: string | null) => {
    store.addFocus({ id: Math.random().toString(36).slice(2, 10), date: toISO(new Date()), minutes, taskId: taskId ?? undefined, at: Date.now() });
  }, [store.addFocus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!store.ready) return <div className="splash" aria-busy="true"><img className="logo-img lg" src="/logo.png" alt="CommandJEE" /></div>;
  return <PomodoroProvider onFocusComplete={onFocusComplete}><App store={store} /></PomodoroProvider>;
}

const SHORTCUTS: [string, string][] = [["N", "Add a study block"], ["P", "Open the Pomodoro timer"], ["T", "Go to Today"], ["D", "Go to Dashboard"], ["Space", "Start / pause (in Pomodoro)"], ["Esc", "Close dialog · minimize Pomodoro"], ["?", "Show this list"]];

function App({ store }: { store: Store }) {
  const { state } = store;
  const pomo = usePomodoro();
  const [route, setRoute] = useState<Route>({ page: "dashboard", param: null });
  const [wizard, setWizard] = useState<{ date?: string } | null>(null);
  const [more, setMore] = useState(false);
  const [help, setHelp] = useState(false);
  const [toasts, setToasts] = useState<(ToastInput & { id: number })[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    const read = () => setRoute(parseHash());
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = state.theme; }, [state.theme]);
  useEffect(() => { if (!route.param) window.scrollTo({ top: 0 }); }, [route.page, route.param]);

  const go = useCallback((to: string) => { setMore(false); window.location.hash = `/${to}`; }, []);
  const toast = useCallback((t: ToastInput) => {
    const id = ++toastId.current;
    setToasts((a) => [...a.slice(-2), { ...t, id }]);
    window.setTimeout(() => setToasts((a) => a.filter((x) => x.id !== id)), t.action ? 7000 : 4000);
  }, []);
  const dismiss = (id: number) => setToasts((a) => a.filter((x) => x.id !== id));
  const addBlock = useCallback((date?: string) => setWizard({ date }), []);
  const deleteTask = (id: string) => {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    store.removeTask(id);
    toast({ title: `Deleted “${t.title}”`, action: { label: "Undo", onClick: () => store.restoreTask(t) } });
  };
  const saveTask = (t: Task) => {
    store.addTask(t);
    setWizard(null);
    toast({ title: "Study block added", message: t.title, tone: "success", action: { label: "View planner", onClick: () => go("planner") } });
  };
  const openPomodoro = pomo.expand;

  // keyboard shortcuts (ignored while typing or when a dialog is open)
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target as HTMLElement;
    if (el.closest("input,textarea,select,[contenteditable='true']")) return;
    if (document.querySelector(".modal-backdrop,.pomo-screen,.overlay")) return;
    const k = e.key.toLowerCase();
    if (k === "n") { e.preventDefault(); addBlock(); }
    else if (k === "p") { e.preventDefault(); openPomodoro(); }
    else if (k === "t") go("today");
    else if (k === "d") go("dashboard");
    else if (e.key === "?") setHelp(true);
  };
  useEffect(() => { const h = (e: KeyboardEvent) => keyRef.current(e); document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, []);

  const current = NAV.find((p) => p.id === route.page)!;
  const subject = route.page === "chapters" && SUBJECTS.includes(route.param as Subject) ? (route.param as Subject) : null;
  const dueCount = state.chapters.filter((c) => c.status === "revision").length;
  const theme = state.theme;
  const pick = (id: NavItem["id"]) => (id === "pomodoro" ? (setMore(false), openPomodoro()) : go(id));
  const badge = (id: NavItem["id"]) =>
    id === "revisions" && dueCount > 0 ? <em className="nav-count">{dueCount}</em>
    : id === "pomodoro" && pomo.active ? <em className={`nav-live ${pomo.running ? "on" : ""}`} aria-label="Timer active" /> : null;

  return (
    <ToastContext.Provider value={toast}>
      <div className="app">
        <aside className="sidebar">
          <a className="brand" href="#/dashboard"><img className="logo-img" src="/logo-128.png" alt="" /><span>Command<b>JEE</b></span></a>
          <nav aria-label="Main">
            {GROUPS.map((g) => (
              <div key={g} className="nav-group">
                <div className="nav-label">{g}</div>
                {NAV.filter((p) => p.group === g).map(({ id, label, Icon }) => (
                  <button key={id} className={`nav-btn ${route.page === id ? "active" : ""}`} aria-current={route.page === id ? "page" : undefined} onClick={() => pick(id)}>
                    <Icon size={17} /><span>{label}</span>{badge(id)}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="side-foot">
            <SidebarClock />
            <div className="saved"><CheckCircle2 size={14} /><span>{store.saveError ? "Saving blocked — export a backup" : "Saved in this browser"}</span></div>
          </div>
        </aside>

        <div className="content">
          <header className="topbar">
            <div className="title-block">
              <div className="eyebrow">CommandJEE / {current.label}</div>
              <h1>{current.label}</h1>
            </div>
            <div className="top-actions">
              <CountdownChip examDate={state.examDate} onClick={() => go("settings")} />
              <button className="btn primary add-btn" onClick={() => addBlock()} aria-label="Add study block"><CalendarPlus size={16} /><span className="hide-md">Add study block</span></button>
              <ProfileMenu name={state.profile.name} theme={theme}
                onProfile={() => go("profile")} onSettings={() => go("settings")} onToday={() => go("today")} onAddBlock={() => addBlock()} onPomodoro={openPomodoro}
                onAddMock={() => go("mocks/new")} onTheme={() => store.setTheme(theme === "dark" ? "light" : "dark")} onExport={() => exportBackup(state)} onShortcuts={() => setHelp(true)} />
            </div>
          </header>

          <main key={route.page} className="page">
            {route.page === "dashboard" && <Dashboard store={store} go={go} addBlock={() => addBlock()} onDelete={deleteTask} />}
            {route.page === "today" && <Today store={store} go={go} addBlock={() => addBlock()} onDelete={deleteTask} />}
            {route.page === "chapters" && <Chapters store={store} subject={subject} openSubject={(s) => go(`chapters/${s}`)} closeSubject={() => go("chapters")} />}
            {route.page === "calendar" && <CalendarPage store={store} addBlock={addBlock} onDelete={deleteTask} />}
            {route.page === "planner" && <Planner store={store} addBlock={() => addBlock()} onDelete={deleteTask} />}
            {route.page === "revisions" && <Revisions store={store} go={go} />}
            {route.page === "mocks" && <Mocks key={route.param ?? ""} store={store} autoOpen={route.param === "new"} />}
            {route.page === "ai" && <AIManager store={store} />}
            {route.page === "settings" && <Settings store={store} />}
            {route.page === "profile" && <Profile store={store} go={go} exportBackup={() => exportBackup(state)} />}
          </main>
        </div>

        <nav className="tabbar" aria-label="Main (mobile)">
          {NAV.filter((p) => p.primary).map(({ id, label, Icon }) => (
            <button key={id} className={route.page === id ? "active" : ""} aria-current={route.page === id ? "page" : undefined} onClick={() => pick(id)}>
              <Icon size={20} /><span>{label === "Study Planner" ? "Planner" : label}</span>
            </button>
          ))}
          <button className={!NAV.find((p) => p.id === route.page)?.primary ? "active" : ""} onClick={() => setMore(true)}><Ellipsis size={20} /><span>More</span></button>
        </nav>

        <Island tasks={state.tasks} openToday={() => go("today")} />

        {more && (
          <Modal title="More" size="sm" onClose={() => setMore(false)}>
            <div className="more-list">
              {NAV.filter((p) => !p.primary).map(({ id, label, Icon }) => (
                <button key={id} className="nav-btn" onClick={() => pick(id)}><Icon size={18} /><span>{label}</span>{badge(id)}</button>
              ))}
            </div>
          </Modal>
        )}
        {help && (
          <Modal title="Keyboard shortcuts" size="sm" onClose={() => setHelp(false)}>
            <dl className="shortcuts">{SHORTCUTS.map(([k, d]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>)}</dl>
          </Modal>
        )}
        {wizard && <EventWizard initialDate={wizard.date} chapters={state.chapters} tasks={state.tasks} onClose={() => setWizard(null)} onSave={saveTask} />}
        {pomo.fullscreen && <PomodoroScreen tasks={state.tasks} />}

        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.tone ?? ""}`}>
              <span className="toast-icon"><CheckCircle2 size={18} /></span>
              <div className="grow"><b>{t.title}</b>{t.message && <small>{t.message}</small>}</div>
              {t.action && <button className="text-btn" onClick={() => { t.action!.onClick(); dismiss(t.id); }}>{t.action.label}</button>}
              <button className="icon-btn" aria-label="Dismiss" onClick={() => dismiss(t.id)}><X size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
