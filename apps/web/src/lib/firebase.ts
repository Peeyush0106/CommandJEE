import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const firebaseReady = Boolean(config.apiKey && config.projectId && config.appId);
const app = firebaseReady ? (getApps().length ? getApps()[0] : initializeApp(config)) : null;
export const auth = app ? getAuth(app) : null;
const globalCache = globalThis as typeof globalThis & { __commandJeeFirestore?: Firestore };
export const db = app
  ? typeof window !== "undefined"
    ? globalCache.__commandJeeFirestore ?? (globalCache.__commandJeeFirestore = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }))
    : getFirestore(app)
  : null;
