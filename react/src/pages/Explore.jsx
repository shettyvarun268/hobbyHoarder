import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import Layout from "../components/Layout";

export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const q = query(collection(db, "publicPosts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim().toLowerCase()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const filtered = useMemo(() => {
    if (!debounced) return posts;
    return posts.filter((p) => {
      const t = (p.title || "").toLowerCase();
      const h = (p.hobby || "").toLowerCase();
      return t.includes(debounced) || h.includes(debounced);
    });
  }, [posts, debounced]);

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(text, term) {
    if (!term) return text;
    const safe = escapeRegExp(term);
    const regex = new RegExp(`(${safe})`, "ig");
    const parts = String(text || "").split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        // reset lastIndex issue by recreating regex for test above; or compare case-insensitively
        <mark key={i} className="bg-yellow-200">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Explore</h1>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or hobby"
            className="sm:w-64 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
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
        ) : filtered.length === 0 ? (
          <div className="text-gray-600">No public posts yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div key={p.id} className="border rounded-lg p-4 bg-white">
                {p.imageURL ? (
                  <img
                    src={p.imageURL}
                    alt={p.title}
                    className="w-full h-40 object-cover rounded-md mb-3"
                  />
                ) : (
                  <div className="w-full h-40 rounded-md bg-gray-100 mb-3" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{highlight(p.title, debounced)}</h3>
                  <p className="text-sm text-gray-500">{p.hobby}</p>
                </div>
                <div className="mt-3">
                  <Link
                    to={`/projects/${p.id}`}
                    className="text-sm text-green-600 hover:underline"
                  >
                    View details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
