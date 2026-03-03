import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useState, useEffect } from "react";
import { Sun, Moon, LogOut } from "lucide-react";
import api from "../api";
import "./Navbar.css";

function Navbar({ session, theme, toggleTheme }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState({
    xp: 0,
    level: 1,
    xp_to_next_level: 100,
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get("/auth/progress");
        setProgress(res.data);
      } catch (err) {
        // Not logged in or API not available
      }
    };
    if (session) fetchProgress();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const xpPercent = ((100 - progress.xp_to_next_level) / 100) * 100;

  return (
    <nav className="navbar glass">
      <div className="navbar-inner">
        <Link to="/dashboard" className="navbar-brand">
          <img src="/logowhite.png" alt="Memora.AI" className="brand-logo" />
        </Link>

        <div className="navbar-links">
          <Link to="/dashboard" className="nav-link">
            Dashboard
          </Link>
          <Link to="/topics/new" className="nav-link">
            + New Topic
          </Link>
        </div>

        <div className="navbar-right">
          <div className="xp-display">
            <span className="xp-level">Lv.{progress.level}</span>
            <div className="xp-bar-container">
              <div
                className="xp-bar-fill"
                style={{ width: `${xpPercent}%` }}
              ></div>
            </div>
            <span className="xp-text">{progress.xp} XP</span>
          </div>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={
              theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"
            }
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button className="avatar-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {session?.user?.user_metadata?.avatar_url ? (
              <img
                src={session.user.user_metadata.avatar_url}
                alt="avatar"
                className="avatar-img"
              />
            ) : (
              <span className="avatar-fallback">
                {session?.user?.email?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </button>

          {menuOpen && (
            <div className="dropdown-menu glass">
              <div className="dropdown-header">
                <p className="dropdown-email">{session?.user?.email}</p>
              </div>
              <hr className="dropdown-divider" />
              <button onClick={handleLogout} className="dropdown-item">
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
