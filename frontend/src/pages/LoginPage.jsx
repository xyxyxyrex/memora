import { supabase } from "../supabaseClient";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Brain, NotebookPen, BookOpen } from "lucide-react";
import "./LoginPage.css";

function LoginPage() {
  const heroRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-logo", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });
      gsap.from(".ai-label", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        delay: 0.1,
        ease: "power3.out",
      });
      gsap.from(".hero-title", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        delay: 0.15,
        ease: "power3.out",
      });
      gsap.from(".hero-subtitle", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        delay: 0.3,
        ease: "power3.out",
      });
      gsap.from(".login-buttons", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        delay: 0.45,
        ease: "power3.out",
      });
      gsap.from(".demo-video-wrap", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        delay: 0.6,
        ease: "power3.out",
      });
      gsap.from(".feature-card", {
        y: 50,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        delay: 0.75,
        ease: "power3.out",
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  const handleLogin = async (provider) => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
  };

  return (
    <div className="login-page" ref={heroRef}>
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="login-container">
        {/* Hero */}
        <div className="hero-section">
          <img src="/logowhite.png" alt="Memora.AI" className="hero-logo" />
          <p className="ai-label">
            A I &nbsp;&nbsp; P O W E R E D &nbsp;&nbsp; L E A R N I N G
          </p>
          <h1 className="hero-title">
            Master Any Topic with{" "}
            <span className="gradient-text">MEMORA.AI</span>
          </h1>
          <p className="hero-subtitle">
            Upload PDFs, generate flashcards &amp; quizzes with AI, and track
            your progress with gamified learning.
          </p>

          <div className="login-buttons">
            <button
              onClick={() => handleLogin("google")}
              className="login-btn google-btn"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => handleLogin("github")}
              className="login-btn github-btn"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
          </div>
        </div>

        {/* Demo video */}
        <div className="demo-video-wrap">
          <video
            className="demo-video"
            autoPlay
            muted
            loop
            playsInline
            src="/demo.mp4"
          />
          <div className="demo-video-glow"></div>
        </div>

        {/* Feature cards */}
        <div className="features-section">
          <p className="features-eyebrow">W H A T &nbsp; Y O U &nbsp; G E T</p>
          <h2 className="features-heading">
            Everything you need to{" "}
            <span className="gradient-text">actually learn</span>
          </h2>
          <p className="features-subheading">
            Upload a PDF and Memora turns it into a full study toolkit — no
            setup, no manual work.
          </p>
          <div className="features-grid">
            {/* Flashcards */}
            <div className="feature-card">
              <div className="feature-card-banner feature-card-banner--purple">
                <div className="mock-flashcard">
                  <div className="mock-flashcard-q">Question</div>
                  <div className="mock-flashcard-text">
                    What is the primary function of mitochondria?
                  </div>
                  <div className="mock-flashcard-divider" />
                  <div className="mock-flashcard-a">Answer</div>
                  <div className="mock-flashcard-answer">
                    To produce ATP through cellular respiration.
                  </div>
                </div>
              </div>
              <div className="feature-card-body">
                <span className="feature-tag feature-tag--purple">
                  <Brain size={12} /> Flashcards
                </span>
                <h3>Study smarter with AI cards</h3>
                <p>
                  Automatically generated Q&A pairs from your material. Flip
                  through them, mark confidence, and revisit weak spots.
                </p>
                <div className="feature-pills">
                  <span className="feature-pill">Auto-generated</span>
                  <span className="feature-pill">Confidence tracking</span>
                  <span className="feature-pill">Spaced review</span>
                </div>
              </div>
            </div>

            {/* Quizzes */}
            <div className="feature-card">
              <div className="feature-card-banner feature-card-banner--cyan">
                <div className="mock-quiz">
                  <div className="mock-quiz-q">
                    Which process converts glucose into pyruvate?
                  </div>
                  {[
                    { label: "A. Krebs cycle", correct: false },
                    { label: "B. Glycolysis", correct: true },
                    { label: "C. Fermentation", correct: false },
                    { label: "D. Oxidation", correct: false },
                  ].map((opt) => (
                    <div
                      key={opt.label}
                      className={`mock-quiz-option${opt.correct ? " correct" : ""}`}
                    >
                      <div
                        className={`mock-quiz-dot${opt.correct ? " filled" : ""}`}
                      />
                      {opt.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="feature-card-body">
                <span className="feature-tag feature-tag--cyan">
                  <NotebookPen size={12} /> Quizzes
                </span>
                <h3>Test yourself with real questions</h3>
                <p>
                  Multiple choice, identification, enumeration, and modified
                  true/false — all AI-graded with typo tolerance.
                </p>
                <div className="feature-pills">
                  <span className="feature-pill">4 question types</span>
                  <span className="feature-pill">AI grading</span>
                  <span className="feature-pill">Typo detection</span>
                </div>
              </div>
            </div>

            {/* Reviewer */}
            <div className="feature-card">
              <div className="feature-card-banner feature-card-banner--amber">
                <div className="mock-reviewer">
                  <div className="mock-reviewer-heading" />
                  <div className="mock-reviewer-bar">
                    <div
                      className="mock-reviewer-fill"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div className="mock-reviewer-line long" />
                  <div className="mock-reviewer-line medium" />
                  <div className="mock-reviewer-line long" />
                  <div className="mock-reviewer-line short" />
                  <div
                    className="mock-reviewer-heading"
                    style={{ marginTop: "12px" }}
                  />
                  <div className="mock-reviewer-line medium" />
                  <div className="mock-reviewer-line long" />
                  <div className="mock-reviewer-line short" />
                </div>
              </div>
              <div className="feature-card-body">
                <span className="feature-tag feature-tag--amber">
                  <BookOpen size={12} /> Reviewer
                </span>
                <h3>Get a full AI-written review</h3>
                <p>
                  Memora reads your source and writes a structured, detailed
                  reviewer you can read, search, and reference anytime.
                </p>
                <div className="feature-pills">
                  <span className="feature-pill">Source-grounded</span>
                  <span className="feature-pill">Structured sections</span>
                  <span className="feature-pill">Searchable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
