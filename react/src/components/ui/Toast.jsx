import { useEffect, useState } from "react";

// Simple singleton toast store
const store = {
  toasts: [],
  listeners: new Set(),
};

function notify() {
  store.listeners.forEach((l) => {
    try {
      l(store.toasts);
    } catch {}
  });
}

export function toast(message, type = "info") {
  const id = Math.random().toString(36).slice(2);
  const item = { id, message, type };
  store.toasts = [...store.toasts, item];
  notify();
  setTimeout(() => {
    store.toasts = store.toasts.filter((t) => t.id !== id);
    notify();
  }, 3000);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState(store.toasts);

  useEffect(() => {
    const handler = (next) => setToasts(next);
    store.listeners.add(handler);
    return () => store.listeners.delete(handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 px-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="min-w-[200px] max-w-md rounded-lg bg-gray-900 text-white text-sm px-3 py-2 shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

