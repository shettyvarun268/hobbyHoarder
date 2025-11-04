import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="p-6 rounded-xl shadow border">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="mb-4">You’re signed in as {auth.currentUser?.email ?? "Google user"}.</p>
        <button onClick={logout} className="px-4 py-2 bg-gray-900 text-white rounded">
          Sign out
        </button>
      </div>
    </div>
  );
}
