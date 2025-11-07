import { getApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

export async function generatePlanClient(title: string, hobby: string): Promise<string[]> {
  const app = getApp();
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });

  const safeTitle = (title || "Project").trim();
  const safeHobby = (hobby || "hobby").trim();
  const prompt =
    `Generate 5 concrete, actionable steps to achieve "${safeTitle}" for the hobby "${safeHobby}". ` +
    `Return ONLY a JSON array of 5 strings.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response?.text ? response.text() : "[]";

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length) return parsed.slice(0, 5);
  } catch {
    // fall through to line-split parsing
  }

  return String(text)
    .split(/\n+/)
    .map((s) => s.replace(/^\d+[\).\s-]*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

