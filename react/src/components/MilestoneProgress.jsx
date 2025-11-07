export default function MilestoneProgress({ items = [] }) {
  const n = items.length || 5;
  const percent = 0; // optionally compute completion later
  return (
    <div className="w-full">
      <div className="relative h-3 bg-gray-200 rounded-full">
        <div
          className="absolute left-0 top-0 h-3 bg-green-600 rounded-full"
          style={{ width: `${percent}%` }}
        />
        <div className="absolute inset-0 flex justify-between items-center px-1">
          {items.map((m, i) => (
            <div key={m.id || i} className="relative flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full border-2 shadow-sm ${m.done ? "bg-green-600 border-green-600" : "bg-white border-gray-300"}`}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {items.map((m, i) => (
          <div key={`lbl-${m.id || i}`} className="text-xs text-gray-600 text-center">
            {m.short}
          </div>
        ))}
      </div>
    </div>
  );
}

