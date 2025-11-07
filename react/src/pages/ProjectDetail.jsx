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
import { getDocs, getDoc, writeBatch } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { uploadLogImage } from "../lib/storage";
import { auth, db, storage } from "../firebase";
import Layout from "../components/Layout";
import Button from "../components/ui/Button";
import { generatePlan as aiGeneratePlan, normalizePlan } from "../lib/ai";
import { toast } from "../components/ui/Toast";
import { normalizeSteps } from "../lib/plan";
import PlanProgress from "../components/PlanProgress";
import { updateDoc } from "firebase/firestore";
import { setDoc, deleteDoc as deleteDocFs } from "firebase/firestore";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [plan, setPlan] = useState([]);
  const [planning, setPlanning] = useState(false);
  // Controls whether the persisted Plan & Progress bar is shown in this session
  const [showProgress, setShowProgress] = useState(false);
  // When viewing via Explore, the route :id may be the public doc id — resolve to the actual project doc id
  const [ownerUid, setOwnerUid] = useState(null);
  const [projectDocId, setProjectDocId] = useState(null);
  const milestones = useMemo(() => (Array.isArray(plan) && (plan[0]?.id) ? plan : normalizePlan(plan)), [plan]);
  // Render list directly from milestone.long to avoid object artifacts
  const listItems = useMemo(() => milestones.map((m) => String(m.long ?? "")), [milestones]);
  const isOwner = useMemo(() => !!(user && ownerUid && user.uid === ownerUid), [user, ownerUid]);

  // Determine if the persisted plan contains real (non-placeholder) steps
  const hasRealPersisted = useMemo(() => {
    const arr = project?.plan;
    if (!Array.isArray(arr) || arr.length === 0) return false;
    return arr.some((m) => typeof m?.long === "string" && !/^Milestone \d+:/.test(m.long));
  }, [project]);

  // If a project already has a real plan, auto-show the progress bar on load
  useEffect(() => {
    if (hasRealPersisted) setShowProgress(true);
  }, [hasRealPersisted]);

  const deleteProject = async () => {
    if (!user || !project || !isOwner) return;
    const ok = window.confirm("Delete this project and all its logs? This cannot be undone.");
    if (!ok) return;
    try {
      const logsCol = collection(db, "users", user.uid, "projects", project.id, "logs");
      const snap = await getDocs(logsCol);
      const batch = writeBatch(db);
      const deletions = [];
      snap.forEach((d) => {
        batch.delete(d.ref);
        const data = d.data();
        if (data?.imagePath) {
          deletions.push(deleteObject(ref(storage, data.imagePath)).catch(() => {}));
        }
      });
      await batch.commit();
      await Promise.allSettled(deletions);
      await deleteDoc(doc(db, "users", user.uid, "projects", project.id));
      toast("Deleted");
      navigate("/dashboard");
    } catch (e) {
      console.error("Delete project failed", e);
      toast("Failed to delete project");
    }
  };

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

  // Subscribe to project and logs, resolving owner via publicPosts when needed
  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    setError("");

    let unsubProject = () => {};
    let unsubLogs = () => {};
    let unsubPublic = () => {};
    let active = true;

    (async () => {
      try {
        const publicRef = doc(db, "publicPosts", id);
        let owner = user.uid;
        let candidateId = id;
        let pubSnap = null;
        try {
          pubSnap = await getDoc(publicRef);
          if (pubSnap.exists()) {
            const d = pubSnap.data();
            if (d?.uid) owner = d.uid;
            if (d?.projectId) candidateId = d.projectId;
          }
        } catch {
          // ignore public doc read errors
        }
        if (!active) return;
        setOwnerUid(owner);
        setProjectDocId(candidateId);

        const projectRef = doc(db, "users", owner, "projects", candidateId);
        unsubProject = onSnapshot(
          projectRef,
          (snap) => {
            if (!snap.exists()) {
              // Fallback: if coming from public link, try to locate by matching basic fields
              const tryFallback = async () => {
                if (owner === user.uid) {
                  setProject(null);
                  setLoading(false);
                  setError("Project not found.");
                  return;
                }
                const meta = pubSnap?.data?.() || (pubSnap && pubSnap.data());
                try {
                  const coll = collection(db, "users", owner, "projects");
                  const all = await getDocs(coll);
                  let found = null;
                  all.forEach((d) => {
                    const v = d.data();
                    if (!found) {
                      const titleMatch = meta?.title && v?.title === meta.title;
                      const hobbyMatch = meta?.hobby && v?.hobby === meta.hobby;
                      const imageMatch = meta?.imageURL && v?.imageURL === meta.imageURL;
                      if ((titleMatch && hobbyMatch) || imageMatch) {
                        found = { id: d.id };
                      }
                    }
                  });
                  if (found) {
                    setProjectDocId(found.id);
                    return; // effect will re-run and attach listeners to new id
                  }
                } catch {}
                setProject(null);
                setLoading(false);
                setError("Project unavailable.");
              };
              tryFallback();
              return;
            }
            const data = snap.data();
            const proj = { id: snap.id, ...data };
            setProject(proj);
            setLoading(false);

            // Normalize any legacy plan (e.g., 3-step) to 5 steps and persist once (owners only)
            try {
              if (owner === user.uid && Array.isArray(proj.plan) && proj.plan.length !== 5) {
                const fixed = normalizePlan(proj.plan);
                if (JSON.stringify(fixed) !== JSON.stringify(proj.plan)) {
                  updateDoc(projectRef, { plan: fixed, updatedAt: serverTimestamp() }).catch(() => {});
                }
              }
            } catch (e) {
              // ignore normalization errors (e.g., offline)
            }
          },
          (e) => {
            console.error(e);
            setError("Failed to load project.");
            setLoading(false);
          }
        );

        const logsRef = collection(db, "users", owner, "projects", candidateId, "logs");
        const ql = query(logsRef, orderBy("createdAt", "desc"));
        unsubLogs = onSnapshot(
          ql,
          (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
          (e) => console.error("logs error", e)
        );

        unsubPublic = onSnapshot(
          publicRef,
          (snap) => setIsPublic(snap.exists()),
          () => {}
        );
      } catch (e) {
        console.error(e);
        setError("Failed to load project.");
        setLoading(false);
      }
    })();

    return () => {
      active = false;
      try { unsubProject(); } catch {}
      try { unsubLogs(); } catch {}
      try { unsubPublic(); } catch {}
    };
  }, [user, id, projectDocId]);

  const formatDate = (ts) => {
    try {
      if (!ts) return "";
      const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
      return d.toLocaleString();
    } catch {
      return "";
    }
  };

  const onTogglePublic = async (checked) => {
    if (!user || !project) return;
    try {
      const publicRef = doc(db, "publicPosts", project.id);
      if (checked) {
        await setDoc(
          publicRef,
          {
            uid: user.uid,
            projectId: project.id,
            title: project.title || "",
            hobby: project.hobby || "",
            imageURL: project.imageURL || "",
            createdAt: project.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await deleteDocFs(publicRef);
      }
      setIsPublic(checked);
    } catch (e) {
      console.error("Failed to toggle public:", e);
      setError("Failed to update sharing setting.");
    }
  };

  const onSuggestPlan = async () => {
    if (!project || !isOwner) return;
    setPlanning(true);
    try {
      const res = await aiGeneratePlan(project.title || "Project", project.hobby || "");
      const raw = res?.steps ?? res;
      let normalized = normalizePlan(raw);
      const hasReal = normalized.some((m) => typeof m.long === "string" && !/^Milestone \d+:/.test(m.long));
      if (!hasReal && Array.isArray(raw) && raw.length) {
        normalized = raw.slice(0, 5).map((s, i) => {
          const textSrc = (s && typeof s === "object")
            ? (s.long ?? s.detail ?? s.title ?? s.short ?? s.text ?? s.content)
            : s;
          const text = String(textSrc ?? s ?? "Step " + (i + 1));
          const short = text.length > 60 ? text.slice(0, 57) + "…" : text;
          return { id: `m${i}`, short, long: text, done: false };
        });
        while (normalized.length < 5) {
          const i = normalized.length;
          const text = `Milestone ${i + 1}: Set a concrete, achievable sub-goal and outline tasks.`;
          const short = text.length > 60 ? text.slice(0, 57) + "…" : text;
          normalized.push({ id: `m${i}`, short, long: text, done: false });
        }
      }
      // Replace any generic placeholders with meaningful defaults
      const generic = [
        `Define success criteria for ${project?.title || "this project"} in ${project?.hobby || "your hobby"}.`,
        `List materials/resources needed and set up your workspace.`,
        `Create a weekly schedule (3–5 sessions) and calendar reminders.`,
        `Practice and log progress after each session; note blockers.`,
        `Do a weekly review: adjust next steps and share one update.`,
      ];
      normalized = normalized.map((m, i) => {
        if (/^Milestone \d+:/.test(m.long || "")) {
          const text = generic[i] || generic[generic.length - 1];
          const short = text.length > 60 ? text.slice(0, 57) + "…" : text;
          return { ...m, long: text, short };
        }
        return m;
      });
      // Persist the normalized plan so the main progress bar reflects these milestones
      try {
        if (user && (projectDocId || id)) {
          await updateDoc(doc(db, "users", ownerUid || user.uid, "projects", projectDocId || id), {
            plan: normalized,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (persistErr) {
        // Non-fatal (e.g., offline) — preview still shows, snapshot will catch up later
        console.warn("Failed to persist generated plan", persistErr);
      }
      // Keep preview list visible for this session after click
      setPlan(normalized);
      setShowProgress(true);
      if (normalized.length) toast("Plan generated");
      else toast("No steps returned");
    } catch (e) {
      console.error(e);
      setError("Failed to generate plan.");
      toast("Failed to generate plan");
    } finally {
      setPlanning(false);
    }
  };

  const onAddLog = async (e) => {
    e.preventDefault();
    if (!user || !id || !isOwner) return;
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
        try {
          const { imageURL: url, imagePath: path } = await uploadLogImage(user.uid, id, photo);
          imageURL = url || "";
          imagePath = path || "";
        } catch (e) {
          console.warn("Log photo upload failed; saving without photo", e);
        }
      }
      await addDoc(collection(db, "users", ownerUid || user.uid, "projects", projectDocId || id, "logs"), {
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
    if (!user || !id || !isOwner) return;
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
      await deleteDoc(doc(db, "users", ownerUid || user.uid, "projects", projectDocId || id, "logs", logId));
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
          <>
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
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {isOwner && (
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={isPublic}
                    onChange={(e) => onTogglePublic(e.target.checked)}
                  />
                  Share publicly
                </label>
              )}
              {isOwner && (
                <Button type="button" disabled={planning} onClick={onSuggestPlan} className="px-3 py-1 text-sm">
                  {planning ? "Generating..." : "Suggest Plan"}
                </Button>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={deleteProject}
                  className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                >
                  Delete Project
                </button>
              )}
            </div>
          </div>

          {plan.length > 0 && (
            <div className="border rounded-lg p-4 bg-white">
              <h2 className="font-semibold text-gray-900 mb-2">Suggested plan</h2>
              <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700">
                {listItems.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
              {/* Preview progress bar removed to avoid duplicate; persisted section below shows current progress */}
            </div>
          )}

          {/* Persisted Plan & Progress */}
          {showProgress && hasRealPersisted && (
            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Plan & Progress</h2>
              <PlanProgress
                plan={project.plan}
                onToggle={
                  isOwner
                    ? async (i) => {
                        try {
                          const updated = (project.plan || []).map((p, idx) =>
                            idx === i ? { ...p, done: !p.done } : p
                          );
                          await updateDoc(doc(db, "users", ownerUid || user.uid, "projects", projectDocId || id), {
                            plan: updated,
                            updatedAt: serverTimestamp(),
                          });
                        } catch (e) {
                          console.error(e);
                          toast("Failed to update milestone");
                        }
                      }
                    : () => {}
                }
              />
            </section>
          )}
          </>
        ) : (
          <div className="text-gray-600">Project not found.</div>
        )}

        {/* Add log form */}
        {isOwner && (
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
        )}

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
                    {isOwner && (
                      <div>
                        <button
                          className="text-sm text-red-600 hover:underline"
                          onClick={() => onDeleteLog(l.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
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
