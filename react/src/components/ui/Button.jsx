export default function Button({ children, className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition";
  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}

