import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Close on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  /** Initials avatar from email */
  function initials(email: string) {
    return email[0].toUpperCase();
  }

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
              Insider Track
            </span>
            <span className="text-[8px] block text-on-surface-variant uppercase tracking-[0.15em] -mt-0.5">
              SEC Form 4 Feed
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
          <div className="relative" ref={menuRef}>
            {/* Avatar button */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-surface-container-high transition-colors group"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              {/* Initials circle */}
              <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container text-xs font-bold flex items-center justify-center shrink-0">
                {initials(user.email)}
              </span>
              {/* Email — hidden on small screens */}
              <span className="text-on-surface-variant text-xs hidden sm:inline max-w-[160px] truncate">
                {user.email}
              </span>
              {/* Chevron */}
              <span
                className={`material-symbols-outlined text-on-surface-variant text-sm transition-transform duration-200 ${
                  menuOpen ? "rotate-180" : ""
                }`}
              >
                expand_more
              </span>
            </button>

            {/* Dropdown panel */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-surface-container border border-outline-variant/20 rounded shadow-lg py-1 z-50">
                {/* Account header */}
                <div className="px-4 py-2.5 border-b border-outline-variant/10">
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
                    Account
                  </p>
                  <p className="text-xs text-on-surface mt-0.5 truncate">{user.email}</p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  {/* — future items go here — */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-on-surface-variant hover:text-error hover:bg-error/5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
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
