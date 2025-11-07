import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { uploadProjectImage } from "../lib/storage";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import Layout from "../components/Layout";
import Button from "../components/ui/Button";
import { toast } from "../components/ui/Toast";

export default function ProjectNew() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [hobby, setHobby] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [titleErr, setTitleErr] = useState("");
  const [hobbyErr, setHobbyErr] = useState("");
  // Plan generation removed on create page

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
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
      // Optional image upload
      let imageURL = "";
      let imagePath = "";
      try {
        if (image) {
          console.log("[ProjectNew] Upload image start", { name: image.name, size: image.size, type: image.type });
          const { imageURL: url, imagePath: path } = await uploadProjectImage(user.uid, image);
          imageURL = url || "";
          imagePath = path || "";
          if (imageURL) toast("Image uploaded");
        }
      } catch (e) {
        console.warn("Image upload failed; continuing without image", e);
      }

      await addDoc(collection(db, "users", user.uid, "projects"), {
        title,
        hobby,
        imageURL,
        imagePath,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast("Project created!");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error in onSubmit:", err);
      setError("Failed to create project: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  // Suggest Plan UI removed on create page

  return (
    <Layout>
      <div className="w-full flex items-center justify-center">
        <div className="w-[90%] max-w-lg p-8 bg-white flex flex-col gap-5 rounded-xl border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">New Project</h1>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <form onSubmit={onSubmit} className="w-full flex flex-col gap-4">
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
                placeholder="Hobby (e.g., bonsai, watercolor)"
                value={hobby}
                onChange={(e) => setHobby(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              {hobbyErr && (
                <p className="text-xs text-red-600 mt-1">{hobbyErr}</p>
              )}
            </div>

            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button type="submit" disabled={busy} className="w-full md:w-auto">
                {busy ? "Creating..." : "Create project"}
              </Button>
            </div>
          </form>

        </div>
      </div>
    </Layout>
  );
}
