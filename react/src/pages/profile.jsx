import { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate, Link } from "react-router-dom";

export default function Profile() {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [hobbies, setHobbies] = useState(""); // comma-separated for MVP
  const [avatarFile, setAvatarFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const u = snap.data();
        setDisplayName(u.displayName || "");
        setHobbies((u.hobbies || []).join(", "));
      }
    })();
  }, [user]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      setBusy(true);
      let avatarURL = undefined;

      if (avatarFile) {
        const storageRef = ref(storage, `users/${user.uid}/avatars/${avatarFile.name}`);
        await uploadBytes(storageRef, avatarFile);
        avatarURL = await getDownloadURL(storageRef);
      }

      const hobbiesArr = hobbies
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean);

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName || "",
        avatarURL: avatarURL || undefined,
        hobbies: hobbiesArr,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Failed to save profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-white">
      <div className="w-[90%] max-w-sm md:max-w-md p-8 bg-white flex-col flex items-center gap-5 rounded-xl shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Set up your profile</h1>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <form onSubmit={onSubmit} className="w-full flex flex-col gap-4 mt-3">
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />

          <input
            type="text"
            placeholder="Hobbies (comma separated)"
            value={hobbies}
            onChange={(e) => setHobbies(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full p-3 bg-green-600 text-white rounded-lg mt-2 hover:bg-green-700 font-medium disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save profile"}
          </button>
        </form>

        <p className="text-sm text-gray-500">
          <Link to="/dashboard" className="text-green-600 hover:underline">Skip for now</Link>
        </p>
      </div>
    </div>
  );
}
