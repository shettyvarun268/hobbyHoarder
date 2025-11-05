import { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

export default function ProjectNew() {
  const [user, setUser] = useState(null); // Manage user state
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [hobby, setHobby] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/login'); // Redirect if not authenticated
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setError("");

    try {
      setBusy(true);
      console.log("Starting project creation...");

      let imageURL = "";
      if (image) {
        console.log("Image selected, starting upload...");
        const path = `users/${user.uid}/projects/${Date.now()}-${image.name}`;
        console.log("Upload path:", path);
        const storageRef = ref(storage, path);
        try {
          await uploadBytes(storageRef, image);
          console.log("Upload successful, getting download URL...");
          imageURL = await getDownloadURL(storageRef);
          console.log("Got download URL:", imageURL);
        } catch (uploadError) {
          console.error("Error during image upload:", uploadError);
          throw new Error("Image upload failed: " + uploadError.message);
        }
      } else {
        console.log("No image selected, skipping upload.");
      }

      console.log("Creating firestore document...");
      console.log("user.uid:", user.uid);
      await addDoc(collection(db, "users", user.uid, "projects"), {
        title,
        hobby,
        imageURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("Document created successfully");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error in onSubmit:", err);
      setError("Failed to create project: " + err.message);
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
