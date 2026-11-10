"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword, deleteUser, EmailAuthProvider,
  onAuthStateChanged, reauthenticateWithCredential, reload, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User,
} from "firebase/auth";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, firebaseReady } from "../lib/firebase";

type AccountMeta = {
  deletionRequestedAt?: number;
  exportRequestedAt?: number;
  exportAvailableAt?: number;
  exportLastAt?: number;
  exportDownloadedAt?: number;
};
type AuthGateProps = { children: (props: { user: User; accountMeta: AccountMeta; notice: string; signOut: () => Promise<void> }) => ReactNode };
const GRACE_PERIOD = 30 * 24 * 60 * 60 * 1000;

export default function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accountMeta, setAccountMeta] = useState<AccountMeta>({});
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "reset">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deletionPassword, setDeletionPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const [, forceAuthRefresh] = useState(0);

  useEffect(() => {
    const firestore = db;
    if (!auth || !firestore) { setChecking(false); return; }
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      void (async () => {
        setChecking(true);
        setError("");
        setUser(next);
        if (!next) {
          setAccountMeta({});
          setChecking(false);
          return;
        }
        try {
          if (!next.emailVerified) {
            await reload(next);
            await next.getIdToken(true);
          }
          if (!next.emailVerified) {
            setAccountMeta({});
            setChecking(false);
            return;
          }
          const metaRef = doc(firestore, "users", next.uid, "account", "state");
          const snapshot = await getDoc(metaRef);
          const meta = snapshot.exists() ? snapshot.data() as AccountMeta : {};
          if (meta.deletionRequestedAt) {
            if (Date.now() - meta.deletionRequestedAt < GRACE_PERIOD) {
              await setDoc(metaRef, { deletionRequestedAt: null }, { merge: true });
              setAccountMeta({ ...meta, deletionRequestedAt: undefined });
              setNotice("Welcome back. Your pending account deletion was automatically canceled.");
            } else {
              setAccountMeta(meta);
            }
          } else {
            setAccountMeta(meta);
          }
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : "Could not load your account status.");
        }
        setChecking(false);
      })();
    }, (reason) => {
      setError(reason.message);
      setChecking(false);
    });
    return unsubscribe;
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth) return;
    setWorking(true);
    setError("");
    try {
      if (mode === "sign-up") {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(credential.user);
      } else if (mode === "reset") {
        await sendPasswordResetEmail(auth, email.trim());
        setNotice("Password reset email sent. Check your inbox.");
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication failed. Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const verifyEmail = async () => {
    if (!user) return;
    setWorking(true);
    setError("");
    try {
      await reload(user);
      await user.getIdToken(true);
      if (!user.emailVerified) {
        setError("Email not verified yet. Use the link we emailed you, then check again.");
        return;
      }
      forceAuthRefresh((n) => n + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not check email verification.");
    } finally {
      setWorking(false);
    }
  };

  const signOutUser = async () => {
    if (!auth) return;
    try { await signOut(auth); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not sign out."); }
  };

  const finishExpiredDeletion = async (event: React.FormEvent) => {
    event.preventDefault();
    const firestore = db;
    if (!user || !auth || !firestore || !user.email) return;
    setWorking(true);
    setError("");
    try {
      const credential = EmailAuthProvider.credential(user.email, deletionPassword);
      await reauthenticateWithCredential(user, credential);
      await deleteDoc(doc(firestore, "users", user.uid, "workspace", "state"));
      await deleteDoc(doc(firestore, "users", user.uid, "account", "state"));
      await deleteUser(user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not finish account deletion. Sign in again and retry.");
    } finally {
      setWorking(false);
    }
  };

  if (checking) return <div className="splash" aria-busy="true"><img className="logo-img lg" src="/logo.png" alt="CommandJEE" /></div>;
  if (!firebaseReady || !auth || !db) return (
    <AuthShell>
      <h1>Connect your Firebase project</h1>
      <p className="muted">Copy the Firebase web settings in <code>apps/web/.env.example</code> to <code>apps/web/.env.local</code>, then restart the dev server.</p>
    </AuthShell>
  );
  if (user?.emailVerified && accountMeta.deletionRequestedAt && Date.now() - accountMeta.deletionRequestedAt >= GRACE_PERIOD) return (
    <AuthShell>
      <h1>Account deletion is ready</h1>
      <p className="muted">The 30-day recovery period has ended. Re-enter your password to remove your CommandJEE data and account.</p>
      <form className="auth-form" onSubmit={finishExpiredDeletion}>
        <label className="label" htmlFor="delete-password">Email password</label>
        <input id="delete-password" className="field" type="password" autoComplete="current-password" required value={deletionPassword} onChange={(e) => setDeletionPassword(e.target.value)} />
        <button className="btn danger block" disabled={working}>{working ? "Removing account…" : "Permanently delete account"}</button>
      </form>
      <AuthMessage error={error} />
      <button className="text-btn" onClick={() => void signOutUser()}>Sign out</button>
    </AuthShell>
  );
  if (user && !user.emailVerified) return (
    <AuthShell>
      <h1>Verify your email</h1>
      <p className="muted">We sent a verification link to <b>{user.email}</b>. Your study data stays locked until you verify it.</p>
      <div className="auth-actions">
        <button className="btn primary" disabled={working} onClick={() => void verifyEmail()}>{working ? "Checking…" : "I’ve verified my email"}</button>
        <button className="btn" disabled={working} onClick={() => { setWorking(true); void sendEmailVerification(user).then(() => setNotice("Verification email sent again.")).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not send verification email.")).finally(() => setWorking(false)); }}>Resend email</button>
        <button className="text-btn" onClick={() => void signOutUser()}>Sign out</button>
      </div>
      <AuthMessage error={error} notice={notice} />
    </AuthShell>
  );
  if (user) return <>{children({ user, accountMeta, notice, signOut: signOutUser })}</>;

  return (
    <AuthShell>
      <h1>{mode === "sign-up" ? "Create your account" : mode === "reset" ? "Reset your password" : "Welcome back"}</h1>
      <p className="muted">Sign in to your private CommandJEE workspace. Each account’s study data is kept separate.</p>
      <form className="auth-form" onSubmit={submit}>
        <label className="label" htmlFor="auth-email">Email</label>
        <input id="auth-email" className="field" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== "reset" && <>
          <label className="label" htmlFor="auth-password">Password</label>
          <input id="auth-password" className="field" type="password" minLength={6} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </>}
        <button className="btn primary block" disabled={working}>{working ? "Please wait…" : mode === "sign-up" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}</button>
      </form>
      <AuthMessage error={error} notice={notice} />
      <div className="auth-actions">
        {mode === "sign-in" && <button className="text-btn" onClick={() => setMode("reset")}>Forgot password?</button>}
        <button className="text-btn" onClick={() => { setError(""); setMode(mode === "sign-up" ? "sign-in" : "sign-up"); }}>{mode === "sign-up" ? "Already have an account? Sign in" : "New here? Create an account"}</button>
      </div>
      <p className="auth-foot">Email verification is required. Google and phone can be linked later in account settings.</p>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return <main className="auth-shell"><section className="auth-card"><div className="brand auth-brand"><img className="logo-img" src="/logo-128.png" alt="" /><span>Command<b>JEE</b></span></div>{children}</section></main>;
}

function AuthMessage({ error, notice }: { error: string; notice?: string }) {
  if (!error && !notice) return null;
  return <p className={error ? "auth-message error" : "auth-message"} role={error ? "alert" : "status"}>{error || notice}</p>;
}
