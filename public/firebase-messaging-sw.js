importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: new URL(location.href).searchParams.get("apiKey"),
  authDomain: new URL(location.href).searchParams.get("authDomain"),
  projectId: new URL(location.href).searchParams.get("projectId"),
  storageBucket: new URL(location.href).searchParams.get("storageBucket"),
  messagingSenderId: new URL(location.href).searchParams.get("messagingSenderId"),
  appId: new URL(location.href).searchParams.get("appId")
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Clariv-Tasks";
  const options = {
    body: payload.notification?.body || "Notification",
    data: payload.data || {},
    actions: [
      { action: "approve", title: "Publier" },
      { action: "edit", title: "Modifier" }
    ]
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  const postId = event.notification.data?.postId;
  event.notification.close();

  if (event.action === "approve" && postId) {
    event.waitUntil(fetch("/api/notifications/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action: "approve" })
    }));
    return;
  }

  const target = postId ? `/post/${postId}` : "/dashboard";
  event.waitUntil(clients.openWindow(target));
});
