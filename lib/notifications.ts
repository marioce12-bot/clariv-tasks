import { getToken } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import { saveUserConfig } from "./firestore-service";

export async function registerPushNotifications(uid: string) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || !("Notification" in window)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const firebaseConfig = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? ""
  });

  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${firebaseConfig.toString()}`);

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  if (token) {
    await saveUserConfig(uid, { fcm_token: token });
  }

  return token;
}
