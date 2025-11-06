import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";

function initialsFromUser(user) {
  if (!user) return "";
  const name = user.displayName || user.email || "";
  const parts = name.replace(/@.*$/, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || parts[0]?.[1] || "";
  return (first + second).toUpperCase();
}

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const doSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (e) {
      // noop; ProtectedRoute will also handle redirect on sign-out
      console.error(e);
    }
  };

  return (
    <div className="h-14 bg-white border-b px-4 flex items-center justify-between">
      <div className="text-xl font-bold text-gray-900">
        <Link to="/dashboard">HobbyHoarder</Link>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-medium">
              {initialsFromUser(user)}
            </div>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg py-1 z-50">
            <button
              className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setOpen(false);
                navigate("/profile");
              }}
            >
              Profile
            </button>
            <button
              className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setOpen(false);
                navigate("/projects/new");
              }}
            >
              New Project
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={doSignOut}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
