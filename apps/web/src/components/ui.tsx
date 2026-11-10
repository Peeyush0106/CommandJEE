"use client";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Priority } from "@commandjee/shared";

/* ───────── Toasts ───────── */
export type ToastInput = { title: string; message?: string; tone?: "success" | "info"; action?: { label: string; onClick: () => void } };
export const ToastContext = createContext<(t: ToastInput) => void>(() => {});
export const useToast = () => useContext(ToastContext);

/* ───────── Modal ───────── */
export function Modal({ title, onClose, children, size = "md", footer }: { title: string; onClose: () => void; children: ReactNode; size?: "sm" | "md" | "lg"; footer?: ReactNode }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); closeRef.current(); } };
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} tabIndex={-1} className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ title, message, confirmLabel = "Confirm", danger, onConfirm, onClose }: { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal title={title} size="sm" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className={`btn ${danger ? "danger" : "primary"}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
    </>}>
      <p className="confirm-text">{message}</p>
    </Modal>
  );
}

/* ───────── Small pieces ───────── */
export function PriorityBadge({ p }: { p: Priority }) {
  return <span className={`badge prio-${p}`}>{p}</span>;
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <b>{title}</b>
      {children && <p>{children}</p>}
    </div>
  );
}

export function CardHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="card-head">
      <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
      {right}
    </div>
  );
}

export function Progress({ value, color }: { value: number; color?: string }) {
  return <div className="bar" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(100, value))}%`, ...(color ? { background: color } : {}) }} /></div>;
}

export function Donut({ segments, size = 168, thickness = 22, big, small }: { segments: { value: number; color: string }[]; size?: number; thickness?: number; big: ReactNode; small: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  let acc = 0;
  const stops = total
    ? segments.map((s) => { const a = (acc / total) * 100; acc += s.value; return `${s.color} ${a}% ${(acc / total) * 100}%`; }).join(",")
    : "var(--panel-3) 0 100%";
  return (
    <div className="donut" style={{ width: size, height: size, background: `conic-gradient(${stops})` }}>
      <div className="donut-hole" style={{ inset: thickness }}>
        <b>{big}</b><span>{small}</span>
      </div>
    </div>
  );
}
