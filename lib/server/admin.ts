import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function initAdmin() {
  if (getApps().length) return getApps()[0];

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawServiceAccount) {
    return initializeApp({ credential: cert(JSON.parse(rawServiceAccount)) });
  }

  return initializeApp({ credential: applicationDefault() });
}

export const adminApp = initAdmin();
export const adminDb = getFirestore(adminApp);
export const adminMessaging = getMessaging(adminApp);
