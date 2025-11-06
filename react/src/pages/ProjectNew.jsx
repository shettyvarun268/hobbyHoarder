import { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
  const [plan, setPlan] = useState([]);
  const [planning, setPlanning] = useState(false);

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
      let imageURL = "";
      let imagePath = "";
      if (image) {
        const path = `users/${user.uid}/projects/${Date.now()}-${image.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, image);
        imageURL = await getDownloadURL(storageRef);
        imagePath = path;
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

  // Placeholder GenAI stub: returns a static 5-step plan
  async function generatePlan(inputTitle, inputHobby) {
    const t = (inputTitle || "Project").trim();
    const h = (inputHobby || "hobby").trim();
    return [
      `Define goals for ${t} in ${h}`,
      `Gather materials/tools needed for ${h}`,
      `Break ${t} into 3 milestones`,
      `Schedule practice sessions and checkpoints`,
      `Review progress and share updates`,
    ];
  }

  const onSuggestPlan = async () => {
    setPlanning(true);
    try {
      const steps = await generatePlan(title, hobby);
      setPlan(steps);
    } catch (e) {
      console.error(e);
    } finally {
      setPlanning(false);
    }
  };

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
              <Button
                type="button"
                disabled={planning}
                onClick={onSuggestPlan}
                className="bg-gray-900 hover:bg-gray-800 md:w-auto w-full"
              >
                {planning ? "Generating..." : "Suggest Plan"}
              </Button>
            </div>
          </form>

          {plan.length > 0 && (
            <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-white">
              <h2 className="font-semibold text-gray-900 mb-2">Suggested plan</h2>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                {plan.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
