const functions = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();

async function generateWithGenkit(title, hobby) {
  // Dynamic import so we keep CJS entrypoint while using ESM Genkit packages
  const core = await import("@genkit-ai/core");
  const google = await import("@genkit-ai/googleai");
  // Initialize Genkit with GoogleAI plugin in us-central1
  const ai = core.genkit({ plugins: [google.googleAI({ location: "us-central1" })] });
  const prompt =
    `Generate 5 concrete, actionable steps to achieve "${title}" for the hobby "${hobby}". ` +
    `Return ONLY a JSON array of 5 strings.`;
  const resp = await ai.generate({
    model: "googleai/gemini-1.5-flash",
    temperature: 0.7,
    prompt,
  });
  // Try common Genkit response shapes for text
  let text = "";
  try {
    if (resp && typeof resp.text === "function") text = resp.text();
    else if (resp && typeof resp.outputText === "string") text = resp.outputText;
    else if (resp && resp.candidates && resp.candidates[0]?.content?.parts?.[0]?.text)
      text = resp.candidates[0].content.parts[0].text;
  } catch {}
  if (!text) text = "[]";

  let steps = [];
  try {
    steps = JSON.parse(text);
  } catch {
    steps = String(text)
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[\).\s-]*/, "").trim())
      .filter(Boolean)
      .slice(0, 5);
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error("Failed to parse AI response");
  }
  return steps.slice(0, 5);
}

// Callable: generatePlan (now backed by Genkit/Gemini with fallback)
exports.generatePlan = functions.https.onCall(async (data, context) => {
  const rawTitle = data && data.title ? String(data.title) : "Project";
  const rawHobby = data && data.hobby ? String(data.hobby) : "hobby";
  const title = rawTitle.trim() || "Project";
  const hobby = rawHobby.trim() || "hobby";
  try {
    const steps = await generateWithGenkit(title, hobby);
    return { steps };
  } catch (e) {
    // Fallback deterministic plan keeps UI working even if Vertex/Genkit fails
    return {
      steps: [
        `Define clear goals for ${title} in ${hobby}`,
        `List materials/tools needed for ${hobby}`,
        `Break ${title} into milestones with dates`,
        `Schedule practice sessions and reviews`,
        `Share progress and reflect on learnings`,
      ],
    };
  }
});

// Scheduled: remind inactive projects every 24 hours
exports.remindInactiveProjects = onSchedule(
  { schedule: "every 24 hours", timeZone: "Etc/UTC" },
  async () => {
    const onlyUid = process.env.ONLY_UID; // optional env filter
    const now = Date.now();
    const cutoff = admin.firestore.Timestamp.fromMillis(now - 3 * 24 * 60 * 60 * 1000);

    const outdated = await admin
      .firestore()
      .collectionGroup("projects")
      .where("updatedAt", "<", cutoff)
      .limit(500)
      .get();

    const uids = new Set();
    outdated.forEach((docSnap) => {
      const parent = docSnap.ref.parent.parent;
      const uid = parent ? parent.id : undefined;
      if (!uid) return;
      if (onlyUid && uid !== onlyUid) return;
      uids.add(uid);
    });

    for (const uid of uids) {
      const tokensSnap = await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .collection("tokens")
        .get();
      const tokens = tokensSnap.docs.map((d) => d.id).filter(Boolean);
      if (tokens.length === 0) continue;

      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: "Keep your hobby moving!",
          body: "It's been a few days since you updated a project.",
        },
      });
    }
    return null;
  },
);

// (generateProjectImage removed; rolling back to text-only projects)
