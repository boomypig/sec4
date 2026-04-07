import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="bg-surface text-primary font-sans tracking-tight w-full h-14 border-b border-outline-variant/[.15] flex justify-between items-center px-6 sticky top-0 z-50">
      {/* Left: Brand + Nav */}
      <div className="flex items-center gap-8">
        <Link
          to="/"
          className="text-lg font-bold tracking-tighter text-primary"
        >
          Sovereign Analyst
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className={`flex items-center gap-2 px-3 py-1.5 text-sm transition-all duration-200 rounded-sm ${
              location.pathname === "/"
                ? "bg-surface-container text-primary"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-lg">dashboard</span>
            <span>Dashboard</span>
          </Link>
          {user && (
            <Link
              to="/watchlist"
              className={`flex items-center gap-2 px-3 py-1.5 text-sm transition-all duration-200 rounded-sm ${
                location.pathname === "/watchlist"
                  ? "bg-surface-container text-primary font-bold"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                list_alt
              </span>
              <span>Watchlist</span>
            </Link>
          )}
        </div>
      </div>

      {/* Right: Auth */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="h-8 w-8 rounded-sm bg-primary-container flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-on-primary-container text-sm">
                person
              </span>
            </div>
            <span className="text-on-surface font-medium text-sm hidden sm:inline">
              {user.email}
            </span>
            <button
              onClick={logout}
              className="text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="metallic-gradient text-on-primary-fixed font-bold px-5 py-2 rounded-sm text-sm active:scale-95 transition-transform"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
