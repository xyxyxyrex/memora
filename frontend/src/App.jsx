import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TopicPage from "./pages/TopicPage";
import ReviewerPage from "./pages/ReviewerPage";
import FlashcardPage from "./pages/FlashcardPage";
import QuizPage from "./pages/QuizPage";

function App() {
  const [session, setSession] = useState(undefined);
  const sessionRef = useRef(undefined);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("lm-theme") || "dark",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("lm-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionRef.current = session;
      setSession(session);
    });

    // Listen for auth changes — debounce to avoid rapid state flickers
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Only update if the session actually changed (different user or signed out)
      const prev = sessionRef.current;
      const prevUserId = prev?.user?.id;
      const newUserId = newSession?.user?.id;

      if (event === "SIGNED_OUT") {
        sessionRef.current = null;
        setSession(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Only update state if user actually changed (prevents re-mount)
        if (prevUserId !== newUserId || !prev) {
          sessionRef.current = newSession;
          setSession(newSession);
        } else {
          // Just update the ref (for fresh tokens) without triggering re-render
          sessionRef.current = newSession;
        }
      } else if (event === "INITIAL_SESSION") {
        // Initial session already handled by getSession above — skip
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Loading state
  if (session === undefined) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="spinner"
            style={{ width: 48, height: 48, margin: "0 auto 16px" }}
          ></div>
          <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {session && (
        <Navbar session={session} theme={theme} toggleTheme={toggleTheme} />
      )}
      <main className={session ? "main-content" : ""}>
        <Routes>
          <Route
            path="/login"
            element={session ? <Navigate to="/dashboard" /> : <LoginPage />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute session={session}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topics/new"
            element={
              <ProtectedRoute session={session}>
                <TopicPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topics/:topicId/review"
            element={
              <ProtectedRoute session={session}>
                <ReviewerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topics/:topicId/flashcards"
            element={
              <ProtectedRoute session={session}>
                <FlashcardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topics/:topicId/quiz"
            element={
              <ProtectedRoute session={session}>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={<Navigate to={session ? "/dashboard" : "/login"} />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
