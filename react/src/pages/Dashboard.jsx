import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  deleteDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { auth, db, storage } from "../firebase";
import { ref, deleteObject } from "firebase/storage";
import Layout from "../components/Layout";
import Button from "../components/ui/Button";
import { toast } from "../components/ui/Toast";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterHobby, setFilterHobby] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState("desc"); // 'desc' | 'asc'
  const [menuOpenId, setMenuOpenId] = useState(null);
  const navigate = useNavigate();

  // Track user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) navigate("/");
    });
    return () => unsub();
  }, [navigate]);

  // Subscribe to projects based on filters
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");

    const constraints = [orderBy("createdAt", sort)];
    if (filterHobby) constraints.unshift(where("hobby", "==", filterHobby));

    const q = query(collection(db, "users", user.uid, "projects"), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        console.error("Error fetching projects:", e);
        setError("Failed to load projects.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, sort, filterHobby]);

  // Client-side search
  const visibleProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((p) => (p.title || "").toLowerCase().includes(term));
  }, [projects, searchTerm]);

  const formatDate = (ts) => {
    try {
      if (!ts) return "";
      const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
      return d.toLocaleDateString();
    } catch {
      return "";
    }
  };

  const handleDelete = async (id, imagePath) => {
    if (!user) return;
    const ok = window.confirm("Delete this project? This cannot be undone.");
    if (!ok) return;
    try {
      // 1) delete all logs in subcollection (and their images if present)
      const logsCol = collection(db, "users", user.uid, "projects", id, "logs");
      const logsSnap = await getDocs(logsCol);
      const batch = writeBatch(db);
      const deletions = [];
      logsSnap.forEach((d) => {
        batch.delete(d.ref);
        const data = d.data();
        if (data?.imagePath) {
          deletions.push(
            deleteObject(ref(storage, data.imagePath)).catch((e) => {
              console.warn("Failed to delete log image", e);
            })
          );
        }
      });
      await batch.commit();
      await Promise.allSettled(deletions);

      // 2) delete project image if any
      if (imagePath) {
        try {
          await deleteObject(ref(storage, imagePath));
        } catch (e) {
          console.warn("Failed to delete project image", e);
        }
      }

      // 3) delete project document
      await deleteDoc(doc(db, "users", user.uid, "projects", id));
      toast("Deleted");
    } catch (e) {
      console.error("Delete failed:", e);
      setError("Failed to delete project.");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Your Projects</h1>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title"
              className="sm:w-64 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={filterHobby}
              onChange={(e) => setFilterHobby(e.target.value)}
              placeholder="Filter by hobby"
              className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="desc">Newest</option>
              <option value="asc">Oldest</option>
            </select>
            <Link to="/projects/new">
              <Button>New Project</Button>
            </Link>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="w-full h-40 rounded-md bg-gray-100 animate-pulse" />
                <div className="mt-3 h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
                <div className="mt-2 h-3 w-1/3 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="border rounded-lg p-6 text-center bg-white">
            <p className="text-gray-600 mb-4">No projects yet.</p>
            <Link to="/projects/new">
              <Button>Create your first project</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleProjects.map((p) => (
              <div key={p.id} className="border rounded-lg p-4 bg-white">
                {p.imageURL ? (
                  <Link to={`/projects/${p.id}`}>
                    <img
                      src={p.imageURL}
                      alt={p.title}
                      className="w-full h-40 object-cover rounded-md mb-3"
                    />
                  </Link>
                ) : (
                  <Link to={`/projects/${p.id}`} className="block">
                    <div className="w-full h-40 rounded-md bg-gray-100 mb-3" />
                  </Link>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link to={`/projects/${p.id}`} className="hover:underline">
                      <h3 className="font-semibold text-gray-900">{p.title}</h3>
                    </Link>
                    <p className="text-sm text-gray-500">{p.hobby}</p>
                    {p.createdAt && (
                      <p className="text-xs text-gray-400 mt-1">{formatDate(p.createdAt)}</p>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900"
                      onClick={() => setMenuOpenId((cur) => (cur === p.id ? null : p.id))}
                      aria-label="More options"
                    >
                      <span className="inline-block">⋯</span>
                    </button>
                    {menuOpenId === p.id && (
                      <div className="absolute right-0 mt-2 w-36 bg-white border rounded-lg shadow-lg py-1 z-10">
                        <button
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => navigate(`/projects/${p.id}/edit`)}
                        >
                          Edit
                        </button>
                        <button
                          className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(p.id, p.imagePath)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
