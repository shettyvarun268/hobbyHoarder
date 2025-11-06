import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, db, storage } from "../firebase";
import Layout from "../components/Layout";
import Button from "../components/ui/Button";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // new log form
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [textErr, setTextErr] = useState("");

  // Track user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) navigate("/");
    });
    return () => unsub();
  }, [navigate]);

  // Subscribe to project and logs
  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    setError("");

    const projectRef = doc(db, "users", user.uid, "projects", id);
    const unsubProject = onSnapshot(
      projectRef,
      (snap) => {
        if (!snap.exists()) {
          setError("Project not found.");
          setProject(null);
          setLoading(false);
          return;
        }
        setProject({ id: snap.id, ...snap.data() });
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setError("Failed to load project.");
        setLoading(false);
      }
    );

    const logsRef = collection(db, "users", user.uid, "projects", id, "logs");
    const ql = query(logsRef, orderBy("createdAt", "desc"));
    const unsubLogs = onSnapshot(
      ql,
      (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.error("logs error", e)
    );

    return () => {
      unsubProject();
      unsubLogs();
    };
  }, [user, id]);

  const formatDate = (ts) => {
    try {
      if (!ts) return "";
      const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
      return d.toLocaleString();
    } catch {
      return "";
    }
  };

  const onAddLog = async (e) => {
    e.preventDefault();
    if (!user || !id) return;
    setTextErr("");
    if (!text.trim()) {
      setTextErr("Log text is required.");
      return;
    }
    setError("");
    try {
      setSubmitting(true);
      let imageURL = "";
      let imagePath = "";
      if (photo) {
        const path = `users/${user.uid}/projects/${id}/logs/${Date.now()}-${photo.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, photo);
        imageURL = await getDownloadURL(storageRef);
        imagePath = path;
      }
      await addDoc(collection(db, "users", user.uid, "projects", id, "logs"), {
        text: text.trim(),
        imageURL,
        imagePath,
        createdAt: serverTimestamp(),
      });
      setText("");
      setPhoto(null);
    } catch (e) {
      console.error(e);
      setError("Failed to add log.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteLog = async (logId) => {
    if (!user || !id) return;
    const ok = window.confirm("Delete this log?");
    if (!ok) return;
    try {
      const log = logs.find((l) => l.id === logId);
      if (log?.imagePath) {
        try {
          await deleteObject(ref(storage, log.imagePath));
        } catch (e) {
          console.warn("Failed to delete log image", e);
        }
      }
      await deleteDoc(doc(db, "users", user.uid, "projects", id, "logs", logId));
    } catch (e) {
      console.error(e);
      setError("Failed to delete log.");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Project header */}
        {loading ? (
          <div className="border rounded-lg p-4">
            <div className="w-full h-40 bg-gray-100 rounded-md animate-pulse" />
            <div className="mt-3 h-5 w-1/3 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : project ? (
          <div className="border rounded-lg p-4 bg-white">
            {project.imageURL ? (
              <img
                src={project.imageURL}
                alt={project.title}
                className="w-full h-60 object-cover rounded-md mb-3"
              />
            ) : (
              <div className="w-full h-60 bg-gray-100 rounded-md mb-3" />
            )}
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-sm text-gray-500">{project.hobby}</p>
            {project.createdAt && (
              <p className="text-xs text-gray-400 mt-1">Created {formatDate(project.createdAt)}</p>
            )}
          </div>
        ) : (
          <div className="text-gray-600">Project not found.</div>
        )}

        {/* Add log form */}
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="font-semibold text-gray-900 mb-3">Add progress log</h2>
          <form onSubmit={onAddLog} className="space-y-3">
            <textarea
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you do?"
              className="w-full min-h-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {textErr && (
              <p className="text-xs text-red-600 -mt-2">{textErr}</p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add log"}
              </Button>
            </div>
          </form>
        </div>

        {/* Logs list */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Progress logs</h2>
          {logs.length === 0 ? (
            <div className="text-sm text-gray-500">No logs yet.</div>
          ) : (
            <ul className="space-y-3">
              {logs.map((l) => (
                <li key={l.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{l.text}</p>
                      {l.createdAt && (
                        <p className="text-xs text-gray-400 mt-1">{formatDate(l.createdAt)}</p>
                      )}
                    </div>
                    <div>
                      <button
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => onDeleteLog(l.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {l.imageURL && (
                    <img
                      src={l.imageURL}
                      alt="log"
                      className="w-full h-48 object-cover rounded-md mt-3"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
