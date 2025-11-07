import { messaging, db } from "../firebase";
import { getToken as getFcmToken } from "firebase/messaging";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied" as NotificationPermission;
  const result = await Notification.requestPermission();
  return result;
}

export async function getToken(): Promise<string | null> {
  if (!messaging || !("serviceWorker" in navigator)) return null;
  const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  try {
    const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY;
    const token = await getFcmToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });
    return token || null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("FCM getToken failed", e);
    return null;
  }
}

export async function subscribeUser(uid: string, token: string): Promise<void> {
  await setDoc(
    doc(db, "users", uid, "tokens", token),
    { createdAt: serverTimestamp() },
    { merge: true }
  );
}

