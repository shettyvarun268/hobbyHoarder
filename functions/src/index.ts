import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const generatePlan = functions.https.onCall((data, context) => {
  const titleRaw = (data && (data.title as string)) || "Project";
  const hobbyRaw = (data && (data.hobby as string)) || "hobby";
  const title = String(titleRaw).trim() || "Project";
  const hobby = String(hobbyRaw).trim() || "hobby";

  const steps = [
    `Define clear goals for ${title} in ${hobby}`,
    `List materials/tools needed for ${hobby}`,
    `Split ${title} into 3 milestones with dates`,
    `Schedule regular practice and review sessions`,
    `Share progress and reflect on learnings`,
  ];

  return { steps };
});

export const remindInactiveProjects = functions.pubsub
  .schedule("every 24 hours")
  .timeZone("Etc/UTC")
  .onRun(async () => {
    const onlyEnv = process.env.ONLY_UID as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg: any = functions.config?.() || {};
    const onlyCfg = cfg?.demo?.uid as string | undefined;
    const onlyUid = onlyEnv || onlyCfg || undefined;

    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const cutoff = admin.firestore.Timestamp.fromMillis(now - threeDaysMs);

    const outdated = await admin
      .firestore()
      .collectionGroup("projects")
      .where("updatedAt", "<", cutoff)
      .limit(500)
      .get();

    const uids = new Set<string>();
    outdated.forEach((docSnap) => {
      const uid = docSnap.ref.parent.parent?.id;
      if (!uid) return;
      if (onlyUid && uid !== onlyUid) return;
      uids.add(uid);
    });

    const messages: Promise<admin.messaging.BatchResponse>[] = [];
    for (const uid of uids) {
      const tokensSnap = await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .collection("tokens")
        .get();
      const tokens = tokensSnap.docs.map((d) => d.id).filter(Boolean);
      if (tokens.length === 0) continue;
      messages.push(
        admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: "Keep your hobby moving!",
            body: "It’s been a few days since you updated a project.",
          },
        })
      );
    }

    await Promise.all(messages);
    return null;
  });
