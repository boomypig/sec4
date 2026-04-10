import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, Link, useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(email, password);
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="atmospheric-glow min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-tertiary/5 blur-[100px]" />
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <span
              className="material-symbols-outlined text-primary text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_person
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-surface uppercase">
            Terminal Access
          </h1>
          <p className="text-on-surface-variant text-sm tracking-tight mt-2">
            Register for Institutional Intelligence
          </p>
        </div>

        <div className="w-full glass-panel p-10 rounded-lg shadow-2xl relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1"
                htmlFor="reg-email"
              >
                Network Identifier
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg group-focus-within:text-primary transition-colors">
                  alternate_email
                </span>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary/50 rounded-sm py-4 pl-10 pr-4 text-on-surface placeholder:text-outline/50 transition-all"
                  placeholder="analyst@sovereign.io"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1"
                htmlFor="reg-password"
              >
                Authentication Key
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg group-focus-within:text-primary transition-colors">
                  lock
                </span>
                <input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary/50 rounded-sm py-4 pl-10 pr-4 text-on-surface placeholder:text-outline/50 transition-all"
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start space-x-3 p-3 bg-error-container/20 border-l-2 border-error rounded-sm">
                <span className="material-symbols-outlined text-error text-xl">
                  error
                </span>
                <p className="text-xs text-error font-medium leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full metallic-gradient text-on-primary-fixed font-bold py-4 rounded-sm shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] uppercase tracking-widest text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>
                {submitting ? "Creating Access..." : "Request Access"}
              </span>
              {!submitting && (
                <span className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-outline-variant/[.15] flex flex-col items-center">
            <p className="text-xs text-on-surface-variant">
              Already verified?{" "}
              <Link
                to="/login"
                className="text-primary font-bold hover:underline"
              >
                Initialize Session
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
