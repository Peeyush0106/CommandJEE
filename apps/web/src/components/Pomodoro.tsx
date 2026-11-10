"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Minimize2, Pause, Play, SkipForward, Square } from "lucide-react";
import { RollText, useNow } from "./Now";
import { currentTask, pad } from "../lib/date";
import type { Task } from "../lib/store";

export type Phase = "focus" | "short" | "long";
export const PRESETS = [
  { id: "classic", label: "Classic 25 · 5", focus: 25, short: 5, long: 15, every: 4 },
  { id: "deep", label: "Deep 50 · 10", focus: 50, short: 10, long: 30, every: 3 },
  { id: "sprint", label: "Sprint 15 · 3", focus: 15, short: 3, long: 10, every: 4 },
] as const;
export const PHASE_LABEL: Record<Phase, string> = { focus: "Focus", short: "Short break", long: "Long break" };
export const PHASE_COLORS: Record<Phase, [string, string]> = { focus: ["#00e5ff", "#9a63ff"], short: ["#3dffb5", "#00c8ff"], long: ["#ff4fd8", "#ffb347"] };
const PHASE_HUES: Record<Phase, [number, number]> = { focus: [185, 275], short: [140, 195], long: [295, 345] };

type Saved = { active: boolean; phase: Phase; running: boolean; remaining: number; cycles: number; presetId: string; taskId: string | null; taskTitle: string | null; endAt: number | null };
const KEY = "commandjee.pomodoro.v1";
const presetOf = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];
const secondsFor = (phase: Phase, presetId: string) => presetOf(presetId)[phase] * 60;
const idle = (presetId = "classic"): Saved => ({ active: false, phase: "focus", running: false, remaining: secondsFor("focus", presetId), cycles: 0, presetId, taskId: null, taskTitle: null, endAt: null });

export type PomodoroApi = Saved & {
  fullscreen: boolean; total: number; progress: number;
  start: (task?: { id: string; title: string } | null) => void;
  toggle: () => void; skip: () => void; stop: () => void;
  minimize: () => void; expand: () => void; setPreset: (id: string) => void;
};
const Ctx = createContext<PomodoroApi | null>(null);
export const usePomodoro = () => { const c = useContext(Ctx); if (!c) throw new Error("PomodoroProvider missing"); return c; };

function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [0, 0.22, 0.44].forEach((d, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 660 + i * 220; o.type = "sine"; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + d); g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + d + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d + 0.2);
      o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.22);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch { /* audio unavailable */ }
}

export function PomodoroProvider({ children, onFocusComplete }: { children: ReactNode; onFocusComplete: (minutes: number, taskId: string | null) => void }) {
  const [s, setS] = useState<Saved>(() => idle());
  const [fullscreen, setFullscreen] = useState(false);
  const sRef = useRef(s); sRef.current = s;
  const endAt = useRef<number | null>(null);
  const nativeFs = useRef(false);
  const cbRef = useRef(onFocusComplete); cbRef.current = onFocusComplete;

  // restore after a refresh
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const v = JSON.parse(raw) as Saved;
      if (!v.active) return;
      if (v.running && v.endAt) { endAt.current = v.endAt; v.remaining = Math.max(0, Math.ceil((v.endAt - Date.now()) / 1000)); }
      setS(v);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ ...s, endAt: endAt.current })); } catch { /* ignore */ } }, [s]);

  const enter = useCallback((phase: Phase, base: Saved, run: boolean): Saved => {
    const remaining = secondsFor(phase, base.presetId);
    endAt.current = run ? Date.now() + remaining * 1000 : null;
    return { ...base, phase, remaining, running: run, endAt: endAt.current };
  }, []);

  const complete = useCallback(() => {
    const cur = sRef.current;
    const preset = presetOf(cur.presetId);
    beep();
    if (cur.phase === "focus") {
      cbRef.current(preset.focus, cur.taskId);
      const cycles = cur.cycles + 1;
      setS(enter(cycles % preset.every === 0 ? "long" : "short", { ...cur, cycles }, true));
    } else {
      setS(enter("focus", cur, true));
    }
  }, [enter]);

  useEffect(() => {
    if (!s.running) return;
    const id = setInterval(() => {
      if (endAt.current === null) return;
      const rem = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      if (rem <= 0) complete();
      else setS((p) => (p.remaining === rem ? p : { ...p, remaining: rem }));
    }, 250);
    return () => clearInterval(id);
  }, [s.running, complete]);

  const total = secondsFor(s.phase, s.presetId);
  const progress = Math.min(1, Math.max(0, 1 - s.remaining / total));

  useEffect(() => {
    if (s.active) document.title = `${pad(Math.floor(s.remaining / 60))}:${pad(s.remaining % 60)} · ${PHASE_LABEL[s.phase]} — CommandJEE`;
    else document.title = "CommandJEE";
  }, [s.active, s.remaining, s.phase]);

  const enterFs = useCallback(() => {
    setFullscreen(true);
    try { document.documentElement.requestFullscreen?.().then(() => { nativeFs.current = true; }).catch(() => {}); } catch { /* not allowed */ }
  }, []);
  const leaveFs = useCallback(() => {
    setFullscreen(false);
    nativeFs.current = false;
    try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement && nativeFs.current) { nativeFs.current = false; setFullscreen(false); } };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const api = useMemo<PomodoroApi>(() => ({
    ...s, fullscreen, total, progress,
    start: (task) => { setS((p) => enter("focus", { ...p, active: true, taskId: task?.id ?? null, taskTitle: task?.title ?? null }, true)); enterFs(); },
    toggle: () => setS((p) => {
      if (!p.active) return enter("focus", { ...p, active: true }, true);
      if (p.running) { endAt.current = null; return { ...p, running: false, endAt: null }; }
      endAt.current = Date.now() + p.remaining * 1000; return { ...p, running: true, endAt: endAt.current };
    }),
    skip: () => { const cur = sRef.current; const preset = presetOf(cur.presetId);
      if (cur.phase === "focus") { const cycles = cur.cycles + 1; setS(enter(cycles % preset.every === 0 ? "long" : "short", { ...cur, cycles }, cur.running)); }
      else setS(enter("focus", cur, cur.running)); },
    stop: () => { endAt.current = null; setS(idle(sRef.current.presetId)); leaveFs(); },
    minimize: leaveFs, expand: enterFs,
    setPreset: (id) => setS((p) => (p.active ? p : { ...idle(id) })),
  }), [s, fullscreen, total, progress, enter, enterFs, leaveFs]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/* ───────── The hypnotic background: one tiny GPU shader at half resolution ───────── */
const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uT;uniform vec3 uA;uniform vec3 uB;
float layer(vec2 p,float dir,float N,float freq,float tw,float t){
  float r=length(p)+1e-4;float a=atan(p.y,p.x)*dir/6.2831853;
  float z=0.4/r*(1.0+0.05*sin(t*1.7));
  float ring=abs(fract(z*freq+t)-0.5);
  float arm=abs(fract(a*N+z*tw+t*0.15)-0.5);
  float g=exp(-ring*26.0)*1.5+exp(-arm*18.0)*0.65;
  return g*exp(-z*0.045)*smoothstep(0.03,0.30,r);
}
void main(){
  vec2 p=(gl_FragCoord.xy-0.5*uRes)/min(uRes.x,uRes.y);float t=uT;float r=length(p);
  float g=layer(p,1.0,7.0,0.55,0.35,t*0.35)+0.7*layer(p,-1.0,5.0,0.33,-0.25,t*0.22);
  vec3 c=mix(uA,uB,0.5+0.5*sin(0.9/(r+0.1)+t*0.25+atan(p.y,p.x)*2.0));
  vec3 col=c*g*1.35+mix(uA,uB,0.5)*0.10*exp(-r*2.2);
  col*=1.0-0.55*smoothstep(0.55,1.25,r);
  gl_FragColor=vec4(1.0-exp(-col*1.25),1.0);
}`;
const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

function NeonTunnel({ phase, running }: { phase: Phase; running: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const target = useRef({ a: hex(PHASE_COLORS[phase][0]), b: hex(PHASE_COLORS[phase][1]), run: running });
  target.current = { a: hex(PHASE_COLORS[phase][0]), b: hex(PHASE_COLORS[phase][1]), run: running };
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) { setFallback(true); return; }
    const sh = (type: number, src: string) => { const o = gl.createShader(type)!; gl.shaderSource(o, src); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    if (!vs || !fs) { setFallback(true); return; }
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setFallback(true); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "uRes"), uT = gl.getUniformLocation(prog, "uT"), uA = gl.getUniformLocation(prog, "uA"), uB = gl.getUniformLocation(prog, "uB");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const cur = { a: [...target.current.a], b: [...target.current.b], speed: 1 };
    let raf = 0, t = 0, last = performance.now();
    const fit = () => {
      const scale = Math.min(0.5, 960 / Math.max(canvas.clientWidth, 1));
      canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale)); canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    fit();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      cur.speed += ((target.current.run ? 1 : 0.12) - cur.speed) * Math.min(1, dt * 3);
      t += dt * cur.speed;
      for (let i = 0; i < 3; i++) { cur.a[i] += (target.current.a[i] - cur.a[i]) * Math.min(1, dt * 2.5); cur.b[i] += (target.current.b[i] - cur.b[i]) * Math.min(1, dt * 2.5); }
      gl.uniform2f(uRes, canvas.width, canvas.height); gl.uniform1f(uT, t);
      gl.uniform3f(uA, cur.a[0], cur.a[1], cur.a[2]); gl.uniform3f(uB, cur.b[0], cur.b[1], cur.b[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); setFallback(true); };
    canvas.addEventListener("webglcontextlost", onLost);
    window.addEventListener("resize", fit);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", fit); canvas.removeEventListener("webglcontextlost", onLost); };
  }, []);
  return fallback ? <div className="pomo-fallback" aria-hidden /> : <canvas ref={ref} className="pomo-canvas" aria-hidden />;
}

/* ───────── Full-screen interface ───────── */
export function PomodoroScreen({ tasks }: { tasks: Task[] }) {
  const p = usePomodoro();
  const now = useNow();
  const live = currentTask(tasks, now);
  const preset = presetOf(p.presetId);
  const [c1, c2] = PHASE_COLORS[p.phase];
  const R = 168, C = 2 * Math.PI * R;
  const mm = pad(Math.floor(p.remaining / 60)), ss = pad(p.remaining % 60);
  const linked = p.active ? p.taskTitle : live?.title ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); p.minimize(); }
      else if (e.key === " " && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); p.active ? p.toggle() : p.start(live ? { id: live.id, title: live.title } : null); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  useEffect(() => { document.body.classList.add("pomo-open"); return () => document.body.classList.remove("pomo-open"); }, []);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => { rootRef.current?.focus(); }, []);

  return (
    <div ref={rootRef} tabIndex={-1} className={`pomo-screen phase-${p.phase} ${p.running ? "running" : ""}`} role="dialog" aria-modal="true" aria-label="Pomodoro timer"
      style={{ "--n1": c1, "--n2": c2 } as CSSProperties}>
      <NeonTunnel phase={p.phase} running={p.running} />
      <div className="pomo-vignette" />
      <header className="pomo-top">
        <span className="pomo-tag">CommandJEE · Focus mode</span>
        <button className="pomo-min" onClick={p.minimize} aria-label="Minimize to island"><Minimize2 size={18} /><span>Minimize</span></button>
      </header>

      <div className="pomo-center">
        <div className="pomo-phase" key={p.phase}>{p.active ? PHASE_LABEL[p.phase] : "Ready to focus"}</div>
        <div className="pomo-ring">
          <svg viewBox="0 0 400 400" aria-hidden>
            <defs>
              <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient>
              
            </defs>
            <g className="pomo-ticks">{Array.from({ length: 60 }, (_, i) => <line key={i} x1="200" y1="8" x2="200" y2={i % 5 === 0 ? 24 : 16} stroke="url(#pg)" strokeWidth={i % 5 === 0 ? 2.5 : 1.2} opacity={i % 5 === 0 ? 0.9 : 0.45} transform={`rotate(${i * 6} 200 200)`} />)}</g>
            <circle className="pomo-dash" cx="200" cy="200" r="188" fill="none" stroke="url(#pg)" strokeWidth="1" strokeDasharray="2 10" opacity=".5" />
            <circle cx="200" cy="200" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
            {[26, 16, 10].map((w, i) => <circle key={w} cx="200" cy="200" r={R} fill="none" stroke="url(#pg)" strokeWidth={w} strokeOpacity={i === 2 ? 1 : i === 1 ? 0.22 : 0.1} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p.progress)} transform="rotate(-90 200 200)" style={{ transition: "stroke-dashoffset .5s linear" }} />)}
          </svg>
          <div className="pomo-digits" aria-live="off" aria-label={`${mm} minutes ${ss} seconds`}><RollText text={`${mm}:${ss}`} /></div>
        </div>
        {linked && <div className="pomo-task"><i /> {linked}</div>}
        <div className="pomo-dots" aria-label={`${p.cycles} focus sessions completed`}>
          {Array.from({ length: preset.every }, (_, i) => <span key={i} className={i < p.cycles % preset.every || (p.cycles > 0 && p.cycles % preset.every === 0 && p.phase === "long") ? "on" : ""} />)}
          <small>{p.cycles} done</small>
        </div>
        <div className="pomo-controls">
          <button className="pomo-btn side" onClick={p.stop} aria-label="Stop and reset" disabled={!p.active}><Square size={18} /></button>
          <button className="pomo-btn main" onClick={() => (p.active ? p.toggle() : p.start(live ? { id: live.id, title: live.title } : null))} aria-label={p.running ? "Pause" : p.active ? "Resume" : "Start"}>
            {p.running ? <Pause size={30} /> : <Play size={30} />}
          </button>
          <button className="pomo-btn side" onClick={p.skip} aria-label="Skip to next phase" disabled={!p.active}><SkipForward size={18} /></button>
        </div>
        <div className="pomo-presets">
          {PRESETS.map((x) => <button key={x.id} className={x.id === p.presetId ? "on" : ""} disabled={p.active && x.id !== p.presetId} onClick={() => p.setPreset(x.id)}>{x.label}</button>)}
        </div>
        <div className="pomo-hint">Space to {p.running ? "pause" : "start"} · Esc to minimize</div>
      </div>
    </div>
  );
}
