import { NavLink } from "react-router-dom";

const linkBase =
  "block px-4 py-2 rounded-lg text-sm transition-colors text-gray-600 hover:text-gray-900";

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r h-screen sticky top-0 bg-white">
      <nav className="p-4 space-y-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? "bg-gray-100 text-gray-900" : ""}`
          }
          end
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/projects/new"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? "bg-gray-100 text-gray-900" : ""}`
          }
        >
          New Project
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? "bg-gray-100 text-gray-900" : ""}`
          }
        >
          My Profile
        </NavLink>
      </nav>
    </aside>
  );
}

