import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import ToastContainer from "./ui/Toast";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="mx-auto max-w-7xl">
        <div className="md:flex">
          <Sidebar />
          <main className="flex-1 p-4">
            {children}
            <ToastContainer />
          </main>
        </div>
      </div>
    </div>
  );
}
