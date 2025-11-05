import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

export default function ProtectedRoute({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false); // New state to track if profile check is done
  const [offline, setOffline] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let unsubDoc = () => { };
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setUser(null);
        setHasProfile(false);
        setProfileChecked(true); // No user means profile check is "done" (doesn't exist)
        setReady(true);
        unsubDoc(); // cleanup listener
        return;
      }
      setUser(u);

      // Set up real-time listener for user profile
      unsubDoc = onSnapshot(doc(db, "users", u.uid),
        (snap) => {
          setHasProfile(snap.exists());
          setProfileChecked(true); // Mark profile check as done
          setOffline(false);
          setReady(true);
        },
        (error) => {
          console.error("Error fetching profile:", error);
          setOffline(true);
          setProfileChecked(true); // Even on error, mark as done to avoid hanging
          setReady(true);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubDoc();
    };
  }, []);

  if (!ready || (user && !profileChecked)) {
    // Wait until auth is ready AND (if user exists) profile check is done
    return null; // or a loader
  }

  if (!user) return <Navigate to="/" replace />;

  // If offline, let users proceed to dashboard so app isn't stuck.
  // You can also render a banner there saying "You're offline".
  if (!offline && !hasProfile && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace />;
  }

  return children;
}
