import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  // If you're on an older SDK you might need setLogLevel or getFirestore instead.
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// ✅ Use more compatible transport; fixes 400 Listen on some networks/proxies/ad blockers
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false, // helps in older browsers/extensions
});

// Optional offline persistence; ignore failures (unsupported browsers, multiple tabs)
enableIndexedDbPersistence(db).catch(() => {});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
if (import.meta.env.VITE_USE_STORAGE_EMULATOR === "true") {
  try {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    // eslint-disable-next-line no-console
    console.log("[Storage] Connected to emulator 127.0.0.1:9199");
  } catch {}
}
export let messaging = undefined;
if (typeof window !== "undefined" && "Notification" in window) {
  try {
    messaging = getMessaging(app);
  } catch (_) {
    // ignore if unsupported
  }
}

// App Check (optional). Only enable if you set VITE_ENABLE_APPCHECK=true in .env
if (typeof window !== "undefined" && import.meta.env.VITE_ENABLE_APPCHECK === "true") {
  try {
    if (import.meta.env.DEV) {
      // Enable debug token for localhost/dev
      // eslint-disable-next-line no-undef
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    const siteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;
    if (siteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else {
      // eslint-disable-next-line no-console
      console.warn("App Check enabled but VITE_RECAPTCHA_V3_SITE_KEY is missing.");
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("App Check init skipped:", e);
  }
}
