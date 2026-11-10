"use client";
import { useEffect, useState } from "react";
import { EmailAuthProvider, GoogleAuthProvider, linkWithPopup, reauthenticateWithCredential, type User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Download, Link2, LogOut, ShieldAlert, Trash2 } from "lucide-react";
import { db } from "../lib/firebase";
import { exportBackup } from "../lib/backup";
import { CardHead } from "./ui";
import type { State } from "../lib/store";

type AccountMeta = { deletionRequestedAt?: number; exportRequestedAt?: number; exportAvailableAt?: number; exportLastAt?: number; exportDownloadedAt?: number };
const DAY = 24 * 60 * 60 * 1000;

export default function AccountSecurity({ user, state, meta, signOut }: { user: User; state: State; meta: AccountMeta; signOut: () => Promise<void> }) {
  const [action, setAction] = useState<"export" | "delete" | null>(null);
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [accountMeta, setAccountMeta] = useState(meta);
  const [, setClock] = useState(Date.now());
  const googleLinked = user.providerData.some((provider) => provider.providerId === "google.com");
  const exportReadyAt = accountMeta.exportAvailableAt;
  const exportReady = !!exportReadyAt && Date.now() >= exportReadyAt && Date.now() < exportReadyAt + 60 * 60 * 1000 && !accountMeta.exportDownloadedAt;
  const exportExpired = !!exportReadyAt && Date.now() >= exportReadyAt + 60 * 60 * 1000 && !accountMeta.exportDownloadedAt;
  const exportCooldown = !!accountMeta.exportLastAt && Date.now() - accountMeta.exportLastAt < 30 * DAY;
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const linkGoogle = async () => {
    setBusy(true);
    setError("");
    try {
      await linkWithPopup(user, new GoogleAuthProvider());
      setMessage("Google is now linked to this email/password account.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not link Google.");
    } finally { setBusy(false); }
  };

  const downloadExport = async () => {
    if (!db || !exportReady) return;
    try {
      const exportDownloadedAt = Date.now();
      await setDoc(doc(db, "users", user.uid, "account", "state"), { exportDownloadedAt }, { merge: true });
      setAccountMeta({ ...accountMeta, exportDownloadedAt });
      exportBackup(state);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record the data export.");
    }
  };

  const submitAction = async () => {
    if (!db || !user.email) return;
    const expected = action === "export" ? "EXPORT MY DATA" : `DELETE ${user.email}`;
    if (phrase !== expected) {
      setError(`Type ${expected} exactly to continue.`);
      return;
    }
    if (action === "export" && exportCooldown) {
      setError("An export was requested in the last 30 days. Please wait before requesting another.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      const now = Date.now();
      const ref = doc(db, "users", user.uid, "account", "state");
      if (action === "export") {
        const next: AccountMeta = { ...accountMeta, exportRequestedAt: now, exportAvailableAt: now + DAY, exportLastAt: now };
        delete next.deletionRequestedAt;
        delete next.exportDownloadedAt;
        await setDoc(ref, { exportRequestedAt: now, exportAvailableAt: now + DAY, exportLastAt: now, exportDownloadedAt: null }, { merge: true });
        setAccountMeta(next);
        setMessage("Export request confirmed. Your download unlocks after a 24-hour wait.");
      } else {
        await setDoc(ref, { deletionRequestedAt: now }, { merge: true });
        setAccountMeta({ ...accountMeta, deletionRequestedAt: now });
        setMessage("Deletion is scheduled. You are being signed out; signing in again within 30 days automatically restores your account.");
        window.setTimeout(() => { void signOut(); }, 1200);
      }
      setAction(null);
      setPassword("");
      setPhrase("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not confirm this account action.");
    } finally { setBusy(false); }
  };

  return (
    <section className="card account-card">
      <CardHead title="Account & data" sub="Your workspace is private to this email account." />
      <div className="account-row">
        <div className="account-method"><b>{user.email}</b><small>Email and password · verified</small></div>
        <span className="badge success">Primary</span>
      </div>
      <div className="account-row">
        <div className="account-method"><b>Google</b><small>{googleLinked ? "Linked as an additional sign-in method" : "Optional sign-in method for this account"}</small></div>
        <button className="btn sm" disabled={busy || googleLinked} onClick={() => void linkGoogle()}><Link2 size={14} />{googleLinked ? "Connected" : "Connect Google"}</button>
      </div>
      <div className="account-row">
        <div className="account-method"><b>Phone number</b><small>Phone sign-in may require Firebase billing/SMS charges; deferred while using free resources.</small></div>
        <button className="btn sm" disabled title="Deferred to avoid unexpected SMS charges">Unavailable</button>
      </div>
      <div className="account-actions">
        {exportReady
          ? <button className="btn primary" onClick={() => void downloadExport()}><Download size={15} /> Download requested export</button>
          : <button className="btn" disabled={exportCooldown} onClick={() => { setAction("export"); setError(""); setPhrase(""); }}><Download size={15} />{exportCooldown ? "Export cooldown active" : "Request data export"}</button>}
        <button className="btn danger" onClick={() => { setAction("delete"); setError(""); setPhrase(""); }}><Trash2 size={15} /> Schedule account deletion</button>
        <button className="btn" onClick={() => void signOut()}><LogOut size={15} /> Sign out</button>
      </div>
      {exportReadyAt && !exportReady && !exportExpired && !accountMeta.exportDownloadedAt && <p className="muted small">Export download available {new Date(exportReadyAt).toLocaleString()} after the 24-hour delay.</p>}
      {exportExpired && <p className="muted small">The one-hour download window expired. A new export can be requested after the 30-day cooldown.</p>}
      {accountMeta.exportDownloadedAt && <p className="muted small">Your requested export has been downloaded.</p>}
      {accountMeta.deletionRequestedAt && <p className="warn">Deletion is scheduled for a 30-day recovery period. Logging in during that period cancels it automatically.</p>}
      {action && <div className="account-confirm">
        <div className="row"><ShieldAlert size={18} /><b>{action === "export" ? "Confirm a delayed data export" : "Confirm account deletion"}</b></div>
        <p className="muted small">{action === "export"
          ? "Your complete workspace will be downloadable after 24 hours. Exports are limited to one every 30 days."
          : "Your account is marked for deletion for 30 days. Sign in during that period to automatically restore it. With free-only hosting, final cleanup runs when you return after the grace period; no paid scheduled function is enabled."}</p>
        <label className="label" htmlFor={`${action}-password`}>Re-enter your email password</label>
        <input id={`${action}-password`} className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <label className="label" htmlFor={`${action}-phrase`}>Type <code>{action === "export" ? "EXPORT MY DATA" : `DELETE ${user.email}`}</code></label>
        <input id={`${action}-phrase`} className="field" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
        <div className="account-actions">
          <button className={`btn ${action === "delete" ? "danger" : "primary"}`} disabled={busy || !password || !phrase} onClick={() => void submitAction()}>{busy ? "Confirming…" : action === "export" ? "Confirm export request" : "Confirm deletion"}</button>
          <button className="btn" disabled={busy} onClick={() => setAction(null)}>Cancel</button>
        </div>
      </div>}
      {error && <p className="auth-message error" role="alert">{error}</p>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <p className="muted small account-foot">Passkeys and two-factor authentication are reserved for a later phase. Do not store recovery codes or payment information in this workspace.</p>
    </section>
  );
}
