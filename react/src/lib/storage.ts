import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

function inferContentType(name: string, fallback?: string) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (fallback && fallback.startsWith("image/")) return fallback;
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function withinLimit(file: File, maxMB: number) {
  return file.size <= maxMB * 1024 * 1024;
}

export async function uploadUserAvatar(uid: string, file: File) {
  if (import.meta.env.VITE_DISABLE_STORAGE === "true") return { imageURL: "", imagePath: "" };
  const maxMB = Number(import.meta.env.VITE_STORAGE_MAX_MB_AVATAR || 10);
  if (!withinLimit(file, maxMB)) throw new Error(`Avatar exceeds ${maxMB}MB limit`);
  const path = `users/${uid}/avatars/${file.name}`;
  const ct = inferContentType(file.name, file.type);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: ct });
  const imageURL = await getDownloadURL(storageRef);
  return { imageURL, imagePath: path };
}

export async function uploadProjectImage(uid: string, file: File) {
  if (import.meta.env.VITE_DISABLE_STORAGE === "true") return { imageURL: "", imagePath: "" };
  const maxMB = Number(import.meta.env.VITE_STORAGE_MAX_MB || 10);
  if (!withinLimit(file, maxMB)) throw new Error(`Image exceeds ${maxMB}MB limit`);
  const path = `users/${uid}/projects/${Date.now()}-${file.name}`;
  const ct = inferContentType(file.name, file.type);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: ct });
  const imageURL = await getDownloadURL(storageRef);
  return { imageURL, imagePath: path };
}

export async function uploadLogImage(uid: string, projectId: string, file: File) {
  if (import.meta.env.VITE_DISABLE_STORAGE === "true") return { imageURL: "", imagePath: "" };
  const maxMB = Number(import.meta.env.VITE_STORAGE_MAX_MB || 10);
  if (!withinLimit(file, maxMB)) throw new Error(`Image exceeds ${maxMB}MB limit`);
  const path = `users/${uid}/projects/${projectId}/logs/${Date.now()}-${file.name}`;
  const ct = inferContentType(file.name, file.type);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: ct });
  const imageURL = await getDownloadURL(storageRef);
  return { imageURL, imagePath: path };
}

