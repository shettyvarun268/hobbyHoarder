import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You could send the error to an error reporting service here
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="w-[90%] max-w-md p-6 bg-white border border-gray-200 rounded-xl text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong.</h1>
            <p className="text-sm text-gray-600 mb-4">Please try reloading the page.</p>
            <button
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

