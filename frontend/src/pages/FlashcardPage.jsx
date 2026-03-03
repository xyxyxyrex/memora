import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { gsap } from "gsap";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../api";
import "./FlashcardPage.css";

function FlashcardPage() {
  const { topicId } = useParams();
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const cardRef = useRef(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await api.get(`/flashcards/topic/${topicId}`);
        setFlashcards(res.data);
      } catch (err) {
        console.error("Failed to load flashcards:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [topicId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await api.post("/flashcards/generate", {
        topic_id: parseInt(topicId),
        count: 10,
      });
      setFlashcards(res.data);
      setCurrentIndex(0);
      setFlipped(false);
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Generation failed. Please try again.";
      setError(msg);
      console.error("Generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const flipCard = () => {
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        rotateY: flipped ? 0 : 180,
        duration: 0.5,
        ease: "power2.inOut",
      });
    }
    setFlipped(!flipped);
  };

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setFlipped(false);
      if (cardRef.current) {
        gsap.to(cardRef.current, { rotateY: 0, duration: 0.3 });
      }
      gsap.fromTo(
        cardRef.current,
        { x: 100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, delay: 0.1 },
      );
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setFlipped(false);
      if (cardRef.current) {
        gsap.to(cardRef.current, { rotateY: 0, duration: 0.3 });
      }
      gsap.fromTo(
        cardRef.current,
        { x: -100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, delay: 0.1 },
      );
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading flashcards...</p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="flashcard-page">
      <div className="flashcard-container animate-fade-in-up">
        <div className="flashcard-header">
          <Link to="/dashboard" className="back-link">
            <ArrowLeft size={16} /> Back
          </Link>
          <h1 className="flashcard-title">Flashcards</h1>
          <button
            className="btn-primary generate-btn"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 size={14} className="spin" /> Generating...
              </>
            ) : (
              <>
                <RefreshCw size={14} /> Generate New
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {flashcards.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">
              <Layers size={40} />
            </div>
            <h3>No flashcards yet</h3>
            <p>Generate flashcards from your topic using AI!</p>
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Generate Flashcards
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="flashcard-progress">
              <span>
                {currentIndex + 1} / {flashcards.length}
              </span>
              <div className="progress-dots">
                {flashcards.map((_, i) => (
                  <span
                    key={i}
                    className={`dot ${i === currentIndex ? "active" : ""} ${i < currentIndex ? "done" : ""}`}
                    onClick={() => {
                      setCurrentIndex(i);
                      setFlipped(false);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Card */}
            <div className="flashcard-wrapper" onClick={flipCard}>
              <div className="flashcard-3d" ref={cardRef}>
                <div className="flashcard-face front">
                  <span className="card-label">QUESTION</span>
                  <p className="card-text">{currentCard?.question}</p>
                  <span className="card-hint">Click to reveal answer</span>
                  {currentCard?.difficulty && (
                    <span
                      className={`difficulty-badge ${currentCard.difficulty}`}
                    >
                      {currentCard.difficulty}
                    </span>
                  )}
                </div>
                <div className="flashcard-face back">
                  <span className="card-label">ANSWER</span>
                  <p className="card-text">{currentCard?.answer}</p>
                  <span className="card-hint">Click to see question</span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flashcard-nav">
              <button
                className="nav-btn"
                onClick={prevCard}
                disabled={currentIndex === 0}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                className="nav-btn"
                onClick={nextCard}
                disabled={currentIndex === flashcards.length - 1}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FlashcardPage;
