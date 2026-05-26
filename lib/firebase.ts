import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { enableIndexedDbPersistence, getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

let persistenceEnabled = false;

export async function enableOfflinePersistence() {
  if (persistenceEnabled || typeof window === "undefined") return;
  persistenceEnabled = true;

  try {
    await enableIndexedDbPersistence(db);
  } catch {
    // Multiple tabs or private mode can reject persistence; Firestore still works online.
  }
}

export async function getFirebaseMessaging() {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
}
