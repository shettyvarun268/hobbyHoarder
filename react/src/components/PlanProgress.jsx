export default function PlanProgress({ plan = [], onToggle = () => {}, className = "", compact = false }) {
  const completed = plan.filter((p) => p?.done).length;
  const total = plan.length || 5;
  const percent = Math.min(100, Math.round((completed / total) * 100));

  const dotSize = compact ? "w-7 h-7" : "w-9 h-9";
  const trackH = compact ? "h-2.5" : "h-3";

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")}> 
      <div className={`relative ${trackH} bg-gray-200 rounded-full`}>
        <div
          className={`absolute left-0 top-0 ${trackH} bg-green-600 rounded-full`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="relative mt-4">
        <ul className="flex justify-between items-center">
          {plan.map((m, idx) => (
            <li key={m.id || idx} className="relative group flex flex-col items-center">
              <button
                type="button"
                aria-pressed={!!m.done}
                onClick={() => onToggle(idx)}
                className={[
                  `${dotSize} rounded-full border-2 flex items-center justify-center transition`,
                  m.done
                    ? "bg-green-600 border-green-600 text-white"
                    : "bg-white border-gray-300 text-gray-700",
                  "shadow-sm hover:shadow",
                ].join(" ")}
                title={m.long}
              >
                <span className={m.done ? "" : "sr-only"}>✓</span>
              </button>

              <div className="mt-2 text-xs text-gray-700 text-center max-w-[8rem]">
                {m.short}
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 -top-3 translate-y-[-100%] w-64 z-20 hidden group-hover:block">
                <div className="rounded-lg border border-gray-200 bg-white shadow p-3 text-xs text-gray-800">
                  {m.long}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

