import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardFeed from "./pages/DashboardFeed";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WatchlistPage from "./pages/WatchlistPage";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardFeed />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/watchlist"
            element={
              <ProtectedRoute>
                <WatchlistPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </AuthProvider>
  );
}

export default App;
