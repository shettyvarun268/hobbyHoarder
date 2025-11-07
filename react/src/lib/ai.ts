import { httpsCallable, getFunctions } from "firebase/functions";
import { generatePlanClient } from "./clientAi";
import { normalizeSteps as cleanLines } from "./plan";

// Normalize an arbitrary array of strings/objects into exactly 5 milestones
export function normalizePlan(steps: Array<{ title?: string; detail?: string; long?: any; short?: any; text?: any; content?: any } | string> | string) {
  // Extract meaningful text from various object shapes (strings, arrays, content parts)
  const getText = (v: any): string => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.map((x) => getText(x)).filter(Boolean).join(" ");
    if (typeof v === "object") {
      // Prefer explicit fields
      const cand = v.long ?? v.detail ?? v.title ?? v.short ?? v.text ?? v.content;
      if (cand) return getText(cand);
      // Parts-based structures
      if (v.parts) return getText(v.parts);
      // Fallback to JSON string
      try { return JSON.stringify(v); } catch { return ""; }
    }
    return String(v);
  };

  // Accept a single string blob or arrays of strings/objects. Sanitize code fences and brackets.
  const toObj = (s: any, i: number) => {
    const rawTitle = typeof s === "string" ? s : (s?.title ?? s?.detail ?? s?.long ?? s?.short ?? s?.text ?? s?.content ?? `Step ${i + 1}`);
    const rawDetail = typeof s === "string" ? s : (s?.detail ?? s?.long ?? s?.title ?? s?.short ?? s?.text ?? s?.content ?? rawTitle);
    // strip fences/brackets/quotes/commas
    const scrub = (x: string) => String(x ?? "").trim()
      .replace(/^```(json)?/i, "").replace(/```$/i, "")
      .replace(/^\[|\]$/g, "")
      .replace(/^`+|^"+|^'+/, "").replace(/,+\s*$/, "");
    let txt = scrub(getText(rawTitle));
    if (!txt) txt = `Step ${i + 1}`;
    const short = txt.length > 60 ? txt.slice(0, 57) + "…" : txt;
    const long = scrub(getText(rawDetail)) || short;
    return { short, long, done: false, id: `m${i}` };
  };

  let base: any[] = [];
  if (typeof steps === "string") {
    // Split by lines and sanitize with cleanLines
    base = cleanLines(steps.split(/\r?\n/));
  } else if (Array.isArray(steps)) {
    // If simple string array, sanitize via cleanLines; else leave objects
    if (steps.every((s) => typeof s === "string")) {
      base = cleanLines(steps as string[]);
    } else {
      base = steps as any[];
    }
  }

  const arr = base.slice(0, 5).map(toObj);
  while (arr.length < 5) {
    const i = arr.length;
    arr.push(toObj(`Milestone ${i + 1}: Set a concrete, achievable sub-goal and outline tasks.`, i));
  }
  return arr;
}

export async function generatePlan(title: string, hobby: string) {
  // Prefer client AI (Firebase AI Logic); fallback to callable if it fails
  try {
    const steps = await generatePlanClient(title, hobby);
    if (Array.isArray(steps) && steps.length) return { steps } as any;
  } catch (e) {
    // swallow and fall back to callable
  }

  const fns = getFunctions(undefined, "us-central1");
  const fn = httpsCallable(fns, "generatePlan");
  const res: any = await fn({ title, hobby });
  return res.data;
}
