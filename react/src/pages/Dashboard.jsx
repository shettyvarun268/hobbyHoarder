import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "projects"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (!user) return null; // short loading state

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Projects</h1>
        <div className="flex gap-3">
          <Link to="/projects/new" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            New Project
          </Link>
          <button className="px-4 py-2 bg-gray-900 text-white rounded" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-600">No projects yet. Create your first one.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <li key={p.id} className="border rounded-lg p-4 shadow-sm">
              {p.imageURL && (
                <img src={p.imageURL} alt={p.title} className="w-full h-40 object-cover rounded-md mb-3" />
              )}
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm text-gray-500">{p.hobby}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
