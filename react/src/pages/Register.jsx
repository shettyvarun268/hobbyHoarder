// src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, setPersistence, browserLocalPersistence } from "firebase/auth";
import { MdEmail } from "react-icons/md";
import { FaFingerprint } from "react-icons/fa";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setBusy(true);
      await setPersistence(auth, browserLocalPersistence);
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      // Friendly error messages
      let msg = "Failed to create account.";
      if (err.code === "auth/email-already-in-use") msg = "Email already in use.";
      else if (err.code === "auth/invalid-email") msg = "Invalid email address.";
      else if (err.code === "auth/weak-password") msg = "Password is too weak.";
      setError(msg);
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-white">
      <div className="w-[90%] max-w-sm md:max-w-md p-8 bg-white flex-col flex items-center gap-5 rounded-xl shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
        <h2 className="text-2xl font-bold text-gray-900">Sign up</h2>

        <p className="text-sm text-gray-500 text-center">
          Already have an account?{" "}
          <Link to="/" className="text-green-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <form onSubmit={handleRegister} className="w-full flex flex-col gap-4 mt-3">
          {/* Email */}
          <div className="w-full flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
            <MdEmail className="text-gray-500" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              placeholder="Email address"
              className="bg-transparent border-0 w-full outline-none text-sm md:text-base text-gray-900 ml-2"
            />
          </div>

          {/* Password */}
          <div className="w-full flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
            <FaFingerprint className="text-gray-500" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              placeholder="Password"
              className="bg-transparent border-0 w-full outline-none text-sm md:text-base text-gray-900 ml-2"
            />
          </div>

          {/* Confirm Password */}
          <div className="w-full flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
            <FaFingerprint className="text-gray-500" />
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              type="password"
              placeholder="Confirm password"
              className="bg-transparent border-0 w-full outline-none text-sm md:text-base text-gray-900 ml-2"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full p-3 bg-green-600 text-white rounded-lg mt-2 hover:bg-green-700 font-medium disabled:opacity-60"
          >
            {busy ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-2">
          By creating an account you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  );
}
export default Register;