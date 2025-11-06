import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, storage } from "../firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import Layout from "../components/Layout";
import Button from "../components/ui/Button";

export default function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [hobby, setHobby] = useState("");
  const [currentImageURL, setCurrentImageURL] = useState("");
  const [currentImagePath, setCurrentImagePath] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [titleErr, setTitleErr] = useState("");
  const [hobbyErr, setHobbyErr] = useState("");

  // Track user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) navigate("/");
    });
    return () => unsub();
  }, [navigate]);

  // Load project
  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    setError("");
    const refDoc = doc(db, "users", user.uid, "projects", id);
    const unsub = onSnapshot(
      refDoc,
      (snap) => {
        if (!snap.exists()) {
          setError("Project not found.");
          setLoading(false);
          return;
        }
        const data = snap.data();
        setTitle(data.title || "");
        setHobby(data.hobby || "");
        setCurrentImageURL(data.imageURL || "");
        setCurrentImagePath(data.imagePath || "");
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setError("Failed to load project.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, id]);

  const onSave = async (e) => {
    e.preventDefault();
    if (!user || !id) return;
    setError("");
    setTitleErr("");
    setHobbyErr("");

    const t = title.trim();
    const h = hobby.trim();
    let invalid = false;
    if (t.length < 2) {
      setTitleErr("Title must be at least 2 characters.");
      invalid = true;
    }
    if (h.length < 2) {
      setHobbyErr("Hobby must be at least 2 characters.");
      invalid = true;
    }
    if (invalid) return;
    try {
      setBusy(true);
      const refDoc = doc(db, "users", user.uid, "projects", id);
      let nextImageURL = currentImageURL;
      let nextImagePath = currentImagePath;

      if (newImage) {
        const path = `users/${user.uid}/projects/${Date.now()}-${newImage.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, newImage);
        const url = await getDownloadURL(storageRef);

        // Optional: delete old image if existed
        if (currentImagePath) {
          try {
            const oldRef = ref(storage, currentImagePath);
            await deleteObject(oldRef);
          } catch (delErr) {
            // ignore failures; the new image is already uploaded
            console.warn("Failed to delete old image", delErr);
          }
        }

        nextImageURL = url;
        nextImagePath = path;
      }

      await updateDoc(refDoc, {
        title,
        hobby,
        imageURL: nextImageURL || "",
        imagePath: nextImagePath || "",
        updatedAt: serverTimestamp(),
      });

      navigate(`/projects/${id}`);
    } catch (err) {
      console.error(err);
      setError("Failed to save project.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="w-full flex items-center justify-center">
        <div className="w-[90%] max-w-lg p-8 bg-white flex flex-col gap-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Edit Project</h1>
            <Link to={`/projects/${id}`} className="text-sm text-gray-600 hover:text-gray-900">
              Back to details
            </Link>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {loading ? (
            <div>
              <div className="w-full h-40 bg-gray-100 rounded-md animate-pulse" />
              <div className="mt-3 h-5 w-1/3 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : (
            <form onSubmit={onSave} className="w-full flex flex-col gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Project title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                {titleErr && (
                  <p className="text-xs text-red-600 mt-1">{titleErr}</p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Hobby"
                  value={hobby}
                  onChange={(e) => setHobby(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                {hobbyErr && (
                  <p className="text-xs text-red-600 mt-1">{hobbyErr}</p>
                )}
              </div>
              {currentImageURL && (
                <img
                  src={currentImageURL}
                  alt="current"
                  className="w-full h-40 object-cover rounded-md"
                />
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewImage(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
