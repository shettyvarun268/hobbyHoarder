import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { MdEmail } from "react-icons/md";
import { FaFingerprint, FaEye, FaGoogle } from "react-icons/fa";
import { setPersistence, browserLocalPersistence } from "firebase/auth";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const checkProfileAndNavigate = async (user) => {
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        navigate('/dashboard');
      } else {
        navigate('/profile');
      }
    } catch (err) {
      console.error("Error checking profile:", err);
      // Fallback to dashboard if check fails
      navigate('/dashboard');
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await checkProfileAndNavigate(userCredential.user);
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      console.error(err);
    }
  };

const handleGoogleLogin = async () => {
  setError("");
  try {
    // persist across tabs/reloads
    await setPersistence(auth, browserLocalPersistence);

    // popup login
    const result = await signInWithPopup(auth, googleProvider);

    // success → check profile
    await checkProfileAndNavigate(result.user);
  } catch (err) {
    console.error(err);
    setError("Failed to sign in with Google.");
    console.log(err)
  }
};

  return (
    <div className="w-full h-screen flex items-center justify-center bg-white">
      <div className="w-[90%] max-w-sm md:max-w-md p-8 bg-white flex-col flex items-center gap-5 rounded-xl shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
        <h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>

        <p className="text-sm text-gray-500 text-center">
          Don’t have an account?{" "}
          <a href="/register" className="text-green-600 font-medium hover:underline">
            Sign up
          </a>
        </p>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Form */}
        <form onSubmit={handleEmailLogin} className="w-full flex flex-col gap-4 mt-3">
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
          <div className="w-full flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white relative">
            <FaFingerprint className="text-gray-500" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              placeholder="Password"
              className="bg-transparent border-0 w-full outline-none text-sm md:text-base text-gray-900 ml-2"
            />
            <FaEye className="absolute right-3 text-gray-500" />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full p-3 bg-green-600 text-white rounded-lg mt-2 hover:bg-green-700 font-medium"
          >
            Login
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-3">
          <a href="/forgot-password" className="text-green-600 hover:underline">
            Forgot your password?
          </a>
        </p>

        {/* Divider */}
        <div className="relative w-full flex items-center justify-center py-3">
          <div className="w-2/5 h-[1px] bg-gray-300"></div>
          <h3 className="text-xs md:text-sm px-3 text-gray-400">Or</h3>
          <div className="w-2/5 h-[1px] bg-gray-300"></div>
        </div>

        {/* Google Login */}
        <div className="relative w-full">
          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-2 w-full p-3 bg-gray-100 border border-gray-300 text-gray-700 cursor-pointer rounded-lg hover:bg-gray-200 font-medium"
          >
            <FaGoogle className="text-lg md:text-xl text-red-500" />
            <span className="text-sm md:text-base">Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;