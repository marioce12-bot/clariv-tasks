import { getToken } from "firebase/messaging";
import { firebaseConfig, getFirebaseMessaging } from "./firebase";
import { saveUserConfig } from "./firestore-service";

export async function registerPushNotifications(uid: string) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || !("Notification" in window)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const serviceWorkerConfig = new URLSearchParams({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId
  });

  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${serviceWorkerConfig.toString()}`);

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  if (token) {
    await saveUserConfig(uid, { fcm_token: token });
  }

  return token;
}
