import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

export default function Dashboard() {
  const user = auth.currentUser; // Get user directly. ProtectedRoute ensures this is available.
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      // This is a safeguard. ProtectedRoute should prevent this from happening.
      navigate("/");
      return;
    }

    // Set up the real-time listener for projects using the user's UID.
    const q = query( 
      collection(db, "users", user.uid, "projects"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeProjects = onSnapshot(
      q,
      (snapshot) => {
        setProjects(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false); // Data is here, stop loading.
      },
      (error) => {
        console.error("Error fetching projects:", error);
        // You might want to set an error state here to display to the user
        setLoading(false);
      }
    );

    // Cleanup on component unmount
    return () => {
      unsubscribeProjects();
    };
  }, [user, navigate]); // Rerun if user or navigate changes.

  const logout = async () => {
    await signOut(auth);
    // After signing out, onAuthStateChanged in ProtectedRoute will trigger a redirect,
    // but for a faster UX, we can navigate immediately.
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 flex justify-center items-center">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

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
