import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { gsap } from "gsap";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Star,
  ThumbsUp,
  TrendingUp,
  AlertTriangle,
  NotebookPen,
  Sparkles,
  CheckCircle2,
  XCircle,
  Send,
  Pencil,
  Crosshair,
  Zap,
  BookOpen,
  GraduationCap,
  X,
  ChevronDown,
  Plus,
} from "lucide-react";
import api from "../api";
import "./QuizPage.css";

function QuizPage() {
  const { topicId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showInlinePicker, setShowInlinePicker] = useState(false);
  const [enumAnswers, setEnumAnswers] = useState({}); // { questionId: string[] }
  const resultRef = useRef(null);
  const inlinePickerRef = useRef(null);

  // Close inline picker on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (
        inlinePickerRef.current &&
        !inlinePickerRef.current.contains(e.target)
      ) {
        setShowInlinePicker(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await api.get(`/quizzes/topic/${topicId}`);
        setQuizzes(res.data);
        if (res.data.length > 0) {
          // Load the latest quiz
          const quizRes = await api.get(`/quizzes/${res.data[0].id}`);
          setQuiz(quizRes.data);
        }
      } catch (err) {
        console.error("Failed to load quizzes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [topicId]);

  const handleGenerate = async (count) => {
    setShowPicker(false);
    setShowInlinePicker(false);
    setGenerating(true);
    setResult(null);
    setAnswers({});
    setEnumAnswers({});
    setError("");
    try {
      const res = await api.post("/quizzes/generate", {
        topic_id: parseInt(topicId),
        count,
        types: [
          "multiple_choice",
          "identification",
          "enumeration",
          "modified_true_false",
        ],
      });
      setQuiz(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Generation failed. Please try again.";
      setError(msg);
      console.error("Generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  /** Parse how many boxes an enumeration question needs.
   *  Returns a number (fixed count) or "all" (expandable). */
  const WORD_NUMBERS = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
  };

  const parseEnumCount = (questionText) => {
    const text = questionText || "";
    // Match digit: "List 3 ...", "Name 2 ...", "Give 4 ...", "Identify 5 ..."
    const digitMatch = text.match(
      /\b(?:list|name|give|identify|enumerate)\s+(\d+)/i,
    );
    if (digitMatch) return parseInt(digitMatch[1], 10);
    // Match word number: "List two ...", "Name three ..."
    const wordPattern = Object.keys(WORD_NUMBERS).join("|");
    const wordMatch = text.match(
      new RegExp(
        `\\b(?:list|name|give|identify|enumerate)\\s+(${wordPattern})\\b`,
        "i",
      ),
    );
    if (wordMatch) return WORD_NUMBERS[wordMatch[1].toLowerCase()];
    if (/\ball\b/i.test(text)) return "all";
    return "all"; // safe fallback
  };

  const handleEnumAnswer = (questionId, index, value) => {
    setEnumAnswers((prev) => {
      const arr = [...(prev[questionId] || [])];
      arr[index] = value;
      return { ...prev, [questionId]: arr };
    });
  };

  const addEnumBox = (questionId) => {
    setEnumAnswers((prev) => ({
      ...prev,
      [questionId]: [...(prev[questionId] || [""]), ""],
    }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      // Merge per-item enumeration boxes into flat comma-separated answers
      const mergedAnswers = { ...answers };
      quiz.questions.forEach((q) => {
        if (q.question_type === "enumeration") {
          const count = parseEnumCount(q.question_text);
          const isAll = count === "all";
          const boxes =
            enumAnswers[q.id] || (isAll ? [""] : Array(count).fill(""));
          mergedAnswers[q.id] = boxes.filter((v) => v.trim()).join(", ");
        }
      });
      const res = await api.post("/quizzes/submit", {
        quiz_id: quiz.id,
        answers: mergedAnswers,
      });
      setResult(res.data);

      // Animate result
      setTimeout(() => {
        if (resultRef.current) {
          gsap.from(resultRef.current, {
            scale: 0.8,
            opacity: 0,
            duration: 0.5,
            ease: "back.out(1.5)",
          });
        }
      }, 100);
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const parseChoices = (choicesStr) => {
    try {
      return JSON.parse(choicesStr);
    } catch {
      return {};
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading quiz...</p>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="quiz-container animate-fade-in-up">
        {/* Quiz Mode Picker Modal */}
        {showPicker && (
          <div
            className="quiz-picker-overlay"
            onClick={() => setShowPicker(false)}
          >
            <div
              className="quiz-picker-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="quiz-picker-header">
                <h2>Choose Quiz Mode</h2>
                <button
                  className="quiz-picker-close"
                  onClick={() => setShowPicker(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="quiz-picker-options">
                <button
                  className="quiz-mode-card"
                  onClick={() => handleGenerate(12)}
                >
                  <div className="quiz-mode-icon quiz-mode-icon--short">
                    <Zap size={22} />
                  </div>
                  <div className="quiz-mode-info">
                    <span className="quiz-mode-title">Short Quiz</span>
                    <span className="quiz-mode-desc">
                      Quick review of the essentials
                    </span>
                    <span className="quiz-mode-count">10 – 15 items</span>
                  </div>
                </button>
                <button
                  className="quiz-mode-card"
                  onClick={() => handleGenerate(35)}
                >
                  <div className="quiz-mode-icon quiz-mode-icon--long">
                    <BookOpen size={22} />
                  </div>
                  <div className="quiz-mode-info">
                    <span className="quiz-mode-title">Long Quiz</span>
                    <span className="quiz-mode-desc">
                      Thorough coverage of the topic
                    </span>
                    <span className="quiz-mode-count">30 – 40 items</span>
                  </div>
                </button>
                <button
                  className="quiz-mode-card"
                  onClick={() => handleGenerate(55)}
                >
                  <div className="quiz-mode-icon quiz-mode-icon--exam">
                    <GraduationCap size={22} />
                  </div>
                  <div className="quiz-mode-info">
                    <span className="quiz-mode-title">Exam</span>
                    <span className="quiz-mode-desc">
                      Full comprehensive assessment
                    </span>
                    <span className="quiz-mode-count">50 – 60 items</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="quiz-header">
          <Link to="/dashboard" className="back-link">
            <ArrowLeft size={16} /> Back
          </Link>
          <h1 className="quiz-title">Quiz</h1>

          {/* Generate button — inline picker when quiz exists, modal when starting fresh */}
          <div className="generate-wrap" ref={inlinePickerRef}>
            <button
              className={`btn-primary generate-btn${showInlinePicker ? " active" : ""}`}
              onClick={() =>
                quiz ? setShowInlinePicker((p) => !p) : setShowPicker(true)
              }
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="spin" /> Generating...
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Generate New Quiz
                  {quiz && (
                    <ChevronDown
                      size={13}
                      className={`gen-chevron${showInlinePicker ? " open" : ""}`}
                    />
                  )}
                </>
              )}
            </button>

            {/* Inline mode strip — only shown when a quiz already exists */}
            {quiz && (
              <div
                className={`quiz-inline-picker${showInlinePicker ? " open" : ""}`}
              >
                <button
                  className="inline-mode-btn inline-mode-btn--short"
                  data-tooltip="Quick review of the essentials · 10–15 items"
                  onClick={() => handleGenerate(12)}
                >
                  <Zap size={15} />
                  <span>Short</span>
                </button>
                <div className="inline-mode-divider" />
                <button
                  className="inline-mode-btn inline-mode-btn--long"
                  data-tooltip="Thorough coverage of the topic · 30–40 items"
                  onClick={() => handleGenerate(35)}
                >
                  <BookOpen size={15} />
                  <span>Long</span>
                </button>
                <div className="inline-mode-divider" />
                <button
                  className="inline-mode-btn inline-mode-btn--exam"
                  data-tooltip="Full comprehensive assessment · 50–60 items"
                  onClick={() => handleGenerate(55)}
                >
                  <GraduationCap size={15} />
                  <span>Exam</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="result-section" ref={resultRef}>
            <div
              className={`result-card ${result.score_percent >= 80 ? "great" : result.score_percent >= 50 ? "good" : "needs-work"}`}
            >
              <div className="result-score">
                <span className="score-number">
                  {Math.round(result.score_percent)}%
                </span>
                <span className="score-label">
                  {result.score_percent >= 80 ? (
                    <>
                      <Star size={16} /> Excellent!
                    </>
                  ) : result.score_percent >= 50 ? (
                    <>
                      <ThumbsUp size={16} /> Good job!
                    </>
                  ) : (
                    <>
                      <TrendingUp size={16} /> Keep learning!
                    </>
                  )}
                </span>
              </div>
              <div className="result-details">
                <span>
                  {result.correct_answers} / {result.total_questions} correct
                </span>
                <span className="xp-earned">
                  +{result.xp_earned} XP earned!
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {!quiz ? (
          <div className="empty-state card">
            <div className="empty-icon">
              <NotebookPen size={40} />
            </div>
            <h3>No quiz yet</h3>
            <p>Generate a quiz from your topic using AI!</p>
            <button
              className="btn-primary"
              onClick={() => setShowPicker(true)}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Generate Quiz
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            <div className="questions-list">
              {quiz.questions?.map((question, index) => (
                <div
                  key={question.id}
                  className={`question-card card ${
                    result?.results?.[index]?.is_correct === true
                      ? "correct"
                      : result?.results?.[index]?.verdict === "close"
                        ? "close"
                        : result?.results?.[index]?.is_correct === false
                          ? "incorrect"
                          : ""
                  }`}
                >
                  <div className="question-header">
                    <span className="question-number">Q{index + 1}</span>
                    <span
                      className={`question-type type-${question.question_type}`}
                    >
                      {question.question_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="question-text">
                    {question.question_type === "modified_true_false"
                      ? "Select from the choices below:"
                      : question.question_text}
                  </p>

                  {/* Modified True/False — always show statements then 4 fixed choices */}
                  {question.question_type === "modified_true_false" ? (
                    <>
                      {(question.statement_a || question.statement_b) && (
                        <div className="statements">
                          {question.statement_a && (
                            <p className="statement">
                              <strong>Statement A:</strong>{" "}
                              {question.statement_a}
                            </p>
                          )}
                          {question.statement_b && (
                            <p className="statement">
                              <strong>Statement B:</strong>{" "}
                              {question.statement_b}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="choices-grid">
                        {[
                          { key: "A", label: "Only Statement A is correct" },
                          { key: "B", label: "Only Statement B is correct" },
                          { key: "C", label: "Both statements are correct" },
                          { key: "D", label: "Both statements are incorrect" },
                        ].map(({ key, label }) => (
                          <label
                            key={key}
                            className={`choice-item ${
                              answers[question.id] === key ? "selected" : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q-${question.id}`}
                              value={key}
                              checked={answers[question.id] === key}
                              onChange={() => handleAnswer(question.id, key)}
                              disabled={!!result}
                            />
                            <span className="choice-letter">{key}</span>
                            <span className="choice-text">{label}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  ) : question.question_type === "multiple_choice" &&
                    question.choices ? (
                    <div className="choices-grid">
                      {Object.entries(parseChoices(question.choices)).map(
                        ([key, value]) => (
                          <label
                            key={key}
                            className={`choice-item ${answers[question.id] === key ? "selected" : ""}`}
                          >
                            <input
                              type="radio"
                              name={`q-${question.id}`}
                              value={key}
                              checked={answers[question.id] === key}
                              onChange={() => handleAnswer(question.id, key)}
                              disabled={!!result}
                            />
                            <span className="choice-letter">{key}</span>
                            <span className="choice-text">{value}</span>
                          </label>
                        ),
                      )}
                    </div>
                  ) : question.question_type === "enumeration" ? (
                    /* Enumeration — one box per expected item */
                    (() => {
                      const count = parseEnumCount(question.question_text);
                      const isAll = count === "all";
                      const existing = enumAnswers[question.id] || [];
                      // Always maintain the full expected length so boxes don't
                      // disappear after the first keystroke updates state.
                      const boxes = isAll
                        ? existing.length > 0
                          ? existing
                          : [""]
                        : Array.from(
                            { length: count },
                            (_, i) => existing[i] ?? "",
                          );
                      return (
                        <div className="enum-inputs">
                          {boxes.map((val, i) => (
                            <div key={i} className="enum-row">
                              <span className="enum-index">{i + 1}</span>
                              <input
                                type="text"
                                className="input-field answer-input"
                                placeholder={`Item ${i + 1}`}
                                value={val}
                                onChange={(e) =>
                                  handleEnumAnswer(
                                    question.id,
                                    i,
                                    e.target.value,
                                  )
                                }
                                disabled={!!result}
                              />
                            </div>
                          ))}
                          {isAll && !result && (
                            <button
                              className="btn-add-enum"
                              onClick={() => addEnumBox(question.id)}
                            >
                              <Plus size={13} /> Add another
                            </button>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    /* Identification — single box */
                    <input
                      type="text"
                      className="input-field answer-input"
                      placeholder="Type your answer..."
                      value={answers[question.id] || ""}
                      onChange={(e) =>
                        handleAnswer(question.id, e.target.value)
                      }
                      disabled={!!result}
                    />
                  )}

                  {/* Feedback */}
                  {result?.results?.[index] && (
                    <div
                      className={`feedback ${
                        result.results[index].is_correct
                          ? "feedback-correct"
                          : result.results[index].verdict === "typo"
                            ? "feedback-typo"
                            : result.results[index].verdict === "close"
                              ? "feedback-close"
                              : "feedback-incorrect"
                      }`}
                    >
                      <span>
                        {result.results[index].is_correct ? (
                          <>
                            <CheckCircle2 size={14} /> Correct!
                          </>
                        ) : result.results[index].verdict === "typo" ? (
                          <>
                            <Pencil size={14} /> You made a typo!{" "}
                            <em>
                              Correct: {result.results[index].correct_answer}
                            </em>
                          </>
                        ) : result.results[index].verdict === "close" ? (
                          <>
                            <Crosshair size={14} /> Close!{" "}
                            <em>
                              Correct answer:{" "}
                              {result.results[index].correct_answer}
                            </em>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} /> Correct answer:{" "}
                            {result.results[index].correct_answer}
                          </>
                        )}
                      </span>
                      {result.results[index].explanation && (
                        <p className="explanation">
                          {result.results[index].explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!result && (
              <button
                className="btn-primary submit-quiz-btn"
                onClick={handleSubmit}
                disabled={submitting || Object.keys(answers).length === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Submit Quiz
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default QuizPage;
