// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function ProtectedRoute({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [offline, setOffline] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setHasProfile(false);
        setReady(true);
        return;
      }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        setHasProfile(snap.exists());
        setOffline(false);
      } catch (e) {
        // Firestore throws "client is offline" when the Listen failed
        console.error(e);
        setOffline(true);
      } finally {
        setReady(true);
      }
    });
    return () => unsub();
  }, []);

  if (!ready) return null; // or a loader

  if (!user) return <Navigate to="/" replace />;

  // If offline, let users proceed to dashboard so app isn't stuck.
  // You can also render a banner there saying "You're offline".
  if (!offline && !hasProfile && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace />;
  }

  return children;
}
