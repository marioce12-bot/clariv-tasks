import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function initAdmin() {
  if (getApps().length) return getApps()[0];

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawServiceAccount) {
    return initializeApp({ credential: cert(parseServiceAccount(rawServiceAccount)) });
  }

  return initializeApp({ credential: applicationDefault() });
}

function parseServiceAccount(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  }
}

export const adminApp = initAdmin();
export const adminDb = getFirestore(adminApp);
export const adminMessaging = getMessaging(adminApp);
