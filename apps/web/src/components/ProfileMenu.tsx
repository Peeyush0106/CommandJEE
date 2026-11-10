"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarPlus, ChartNoAxesCombined, Download, Keyboard, Moon, Settings as SettingsIcon, Sun, Timer, User, CalendarClock } from "lucide-react";
import { initials } from "./pages/Profile";

type Props = {
  name: string; theme: "dark" | "light";
  onProfile: () => void; onSettings: () => void; onToday: () => void; onAddBlock: () => void; onPomodoro: () => void;
  onAddMock: () => void; onTheme: () => void; onExport: () => void; onShortcuts: () => void;
};

export default function ProfileMenu(p: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  const run = (fn: () => void) => () => { setOpen(false); fn(); };
  const Item = ({ icon, label, onClick, kbd }: { icon: ReactNode; label: string; onClick: () => void; kbd?: string }) => (
    <button role="menuitem" className="menu-item" onClick={run(onClick)}>{icon}<span>{label}</span>{kbd && <kbd>{kbd}</kbd>}</button>
  );
  return (
    <div className="menu-wrap" ref={box}>
      <button className="avatar" aria-haspopup="menu" aria-expanded={open} aria-label="Open profile menu" onClick={() => setOpen((o) => !o)}>{initials(p.name)}</button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head"><div className="avatar lg" aria-hidden>{initials(p.name)}</div><div><b>{p.name}</b><small>Private cloud workspace</small></div></div>
          <div className="menu-label">Quick tools</div>
          <Item icon={<CalendarPlus size={16} />} label="Add study block" onClick={p.onAddBlock} kbd="N" />
          <Item icon={<Timer size={16} />} label="Open Pomodoro" onClick={p.onPomodoro} kbd="P" />
          <Item icon={<CalendarClock size={16} />} label="Today view" onClick={p.onToday} kbd="T" />
          <Item icon={<ChartNoAxesCombined size={16} />} label="Record a mock test" onClick={p.onAddMock} />
          <div className="menu-sep" />
          <Item icon={<User size={16} />} label="Profile" onClick={p.onProfile} />
          <Item icon={<SettingsIcon size={16} />} label="Settings" onClick={p.onSettings} />
          <Item icon={p.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} label={`Switch to ${p.theme === "dark" ? "light" : "dark"} theme`} onClick={p.onTheme} />
          <Item icon={<Download size={16} />} label="Manage data export" onClick={p.onExport} />
          <Item icon={<Keyboard size={16} />} label="Keyboard shortcuts" onClick={p.onShortcuts} kbd="?" />
        </div>
      )}
    </div>
  );
}
