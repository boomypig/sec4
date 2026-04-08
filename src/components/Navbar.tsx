import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="bg-surface text-primary font-sans tracking-tight w-full h-14 border-b border-outline-variant/[.1] flex justify-between items-center px-6 sticky top-0 z-50">
      {/* Left: Brand + Nav */}
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary-container text-lg"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            security
          </span>
          <div className="leading-none">
            <span className="text-sm font-extrabold tracking-tighter text-primary uppercase">
              Ametrine
            </span>
            <span className="text-[8px] block text-on-surface-variant uppercase tracking-[0.15em] -mt-0.5">
              Intelligence
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" label="Home" icon="dashboard" active={location.pathname === "/"} />
          {user && (
            <NavLink
              to="/watchlist"
              label="Watchlist"
              icon="list_alt"
              active={location.pathname === "/watchlist"}
            />
          )}
        </nav>
      </div>

      {/* Right: Auth */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-on-surface-variant text-xs hidden sm:inline">
              {user.email}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="metallic-gradient text-on-primary-fixed font-bold px-5 py-1.5 rounded-sm text-xs"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}

function NavLink({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm transition-all duration-200 ${
        active
          ? "bg-surface-container-high text-primary font-bold"
          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
      }`}
    >
      <span className="material-symbols-outlined text-base">{icon}</span>
      {label}
    </Link>
  );
}
