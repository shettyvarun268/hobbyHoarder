import { useEffect, useState } from "react";

export default function OnlineStatus() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-40">
      <div className="mx-auto max-w-7xl px-4">
        <div className="rounded-lg bg-gray-900 text-white text-sm px-3 py-2 shadow">
          You are offline. Some data may be stale.
        </div>
      </div>
    </div>
  );
}

