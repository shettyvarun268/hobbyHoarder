import { useState } from "react";
import { auth, db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";

export default function ProjectNew() {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [hobby, setHobby] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setError("");

    try {
      setBusy(true);

      let imageURL = "";
      if (image) {
        const path = `users/${user.uid}/projects/${Date.now()}-${image.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, image);
        imageURL = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "users", user.uid, "projects"), {
        title,
        hobby,
        imageURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Failed to create project");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-white">
      <div className="w-[90%] max-w-sm md:max-w-md p-8 bg-white flex-col flex items-center gap-5 rounded-xl shadow-lg border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">New Project</h1>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <form onSubmit={onSubmit} className="w-full flex flex-col gap-4 mt-3">
          <input
            type="text"
            placeholder="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-3 py-2"
          />

          <input
            type="text"
            placeholder="Hobby (e.g., bonsai, watercolor)"
            value={hobby}
            onChange={(e) => setHobby(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-3 py-2"
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full p-3 bg-green-600 text-white rounded-lg mt-2 hover:bg-green-700 font-medium disabled:opacity-60"
          >
            {busy ? "Creating..." : "Create project"}
          </button>
        </form>
      </div>
    </div>
  );
}
