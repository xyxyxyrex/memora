import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import {
  Zap,
  Target,
  Library,
  Trophy,
  BookOpen,
  FileText,
  NotebookPen,
  Layers,
  Search,
  LayoutGrid,
  List,
  Trash2,
  X,
  AlertTriangle,
  ArrowUpAZ,
  ArrowDownAZ,
  Clock,
  Clock3,
} from "lucide-react";
import api from "../api";
import XPBar from "../components/XPBar";
import BadgeDisplay from "../components/BadgeDisplay";
import "./DashboardPage.css";

function DashboardPage() {
  const [topics, setTopics] = useState([]);
  const [progress, setProgress] = useState({
    xp: 0,
    level: 1,
    xp_to_next_level: 100,
    badges: [],
  });
  const [loading, setLoading] = useState(true);
  // Controls
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null); // topic object
  const [deleting, setDeleting] = useState(false);
  const pageRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topicsRes, progressRes] = await Promise.all([
          api.get("/topics/"),
          api.get("/auth/progress"),
        ]);
        setTopics(Array.isArray(topicsRes.data) ? topicsRes.data : []);
        setProgress(progressRes.data);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && pageRef.current) {
      const cards = pageRef.current.querySelectorAll(".stats-card");
      const topicEls = pageRef.current.querySelectorAll(
        ".topic-card, .topic-row",
      );
      gsap.set(cards, { opacity: 1, y: 0 });
      gsap.set(topicEls, { opacity: 1, y: 0 });
      gsap.fromTo(
        cards,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power3.out" },
      );
      gsap.fromTo(
        topicEls,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.08,
          delay: 0.3,
          ease: "power3.out",
        },
      );
    }
  }, [loading]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/topics/${deleteTarget.id}`);
      setTopics((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  // Derived list: filter + sort
  const filteredTopics = (Array.isArray(topics) ? topics : [])
    .filter((t) => {
      const q = search.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "az") return a.title.localeCompare(b.title);
      if (sortBy === "za") return b.title.localeCompare(a.title);
      if (sortBy === "oldest") return a.id - b.id;
      return b.id - a.id; // newest
    });

  const SORT_OPTIONS = [
    { value: "newest", label: "Newest first", Icon: Clock },
    { value: "oldest", label: "Oldest first", Icon: Clock3 },
    { value: "az", label: "A → Z", Icon: ArrowUpAZ },
    { value: "za", label: "Z → A", Icon: ArrowDownAZ },
  ];

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page" ref={pageRef}>
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="delete-overlay"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <AlertTriangle size={28} />
            </div>
            <h3>Delete topic?</h3>
            <p>
              <strong>"{deleteTarget.title}"</strong> and all its flashcards,
              quizzes, and reviewer content will be permanently deleted.
            </p>
            <div className="delete-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn-delete-confirm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Welcome back!</h1>
            <p className="dashboard-subtitle">Here's your learning progress</p>
          </div>
          <Link to="/topics/new" className="btn-primary">
            + New Topic
          </Link>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stats-card">
            <div className="stats-icon">
              <Zap size={22} />
            </div>
            <div className="stats-info">
              <span className="stats-value">{progress.xp}</span>
              <span className="stats-label">Total XP</span>
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-icon">
              <Target size={22} />
            </div>
            <div className="stats-info">
              <span className="stats-value">Lv.{progress.level}</span>
              <span className="stats-label">Current Level</span>
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-icon">
              <Library size={22} />
            </div>
            <div className="stats-info">
              <span className="stats-value">{topics.length}</span>
              <span className="stats-label">Topics</span>
            </div>
          </div>
          <div className="stats-card">
            <div className="stats-icon">
              <Trophy size={22} />
            </div>
            <div className="stats-info">
              <span className="stats-value">
                {progress.badges?.length || 0}
              </span>
              <span className="stats-label">Badges</span>
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <XPBar
          xp={progress.xp}
          level={progress.level}
          xpToNext={progress.xp_to_next_level}
        />

        {/* Badges */}
        {progress.badges?.length > 0 && (
          <BadgeDisplay badges={progress.badges} />
        )}

        {/* Topics */}
        <div className="topics-section">
          <div className="topics-section-header">
            <h2 className="section-title">Your Topics</h2>

            {topics.length > 0 && (
              <div className="topics-toolbar">
                {/* Search */}
                <div className="search-wrap">
                  <Search size={14} className="search-icon" />
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Search topics…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      className="search-clear"
                      onClick={() => setSearch("")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Sort */}
                <div className="sort-wrap">
                  <select
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* View toggle */}
                <div className="view-toggle">
                  <button
                    className={`view-btn${viewMode === "grid" ? " active" : ""}`}
                    onClick={() => setViewMode("grid")}
                    title="Grid view"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    className={`view-btn${viewMode === "list" ? " active" : ""}`}
                    onClick={() => setViewMode("list")}
                    title="List view"
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {topics.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-icon">
                <BookOpen size={40} />
              </div>
              <h3>No topics yet</h3>
              <p>Create your first topic or upload a PDF to get started!</p>
              <Link to="/topics/new" className="btn-primary">
                Create Topic
              </Link>
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-icon">
                <Search size={32} />
              </div>
              <h3>No results</h3>
              <p>No topics match "{search}"</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="topics-grid">
              {filteredTopics.map((topic) => (
                <div key={topic.id} className="topic-card card">
                  <div className="topic-card-header">
                    <h3 className="topic-title">{topic.title}</h3>
                    <div className="topic-header-right">
                      {topic.pdf_filename && (
                        <span className="pdf-badge">
                          <FileText size={12} /> PDF
                        </span>
                      )}
                      <button
                        className="btn-topic-delete"
                        title="Delete topic"
                        onClick={() => setDeleteTarget(topic)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="topic-desc">
                    {topic.description || "No description"}
                  </p>
                  <div className="topic-actions">
                    <Link
                      to={`/topics/${topic.id}/review`}
                      className="action-link review"
                      title="Review"
                    >
                      <BookOpen size={15} />
                      <span className="action-label">Review</span>
                    </Link>
                    <Link
                      to={`/topics/${topic.id}/flashcards`}
                      className="action-link flashcard"
                      title="Flashcards"
                    >
                      <Layers size={15} />
                      <span className="action-label">Flashcards</span>
                    </Link>
                    <Link
                      to={`/topics/${topic.id}/quiz`}
                      className="action-link quiz"
                      title="Quiz"
                    >
                      <NotebookPen size={15} />
                      <span className="action-label">Quiz</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="topics-list">
              {filteredTopics.map((topic) => (
                <div key={topic.id} className="topic-row card">
                  <div className="topic-row-main">
                    <div className="topic-row-title-wrap">
                      <span className="topic-title">{topic.title}</span>
                      {topic.pdf_filename && (
                        <span className="pdf-badge">
                          <FileText size={11} /> PDF
                        </span>
                      )}
                    </div>
                    <p className="topic-row-desc">
                      {topic.description || "No description"}
                    </p>
                  </div>
                  <div className="topic-row-actions">
                    <Link
                      to={`/topics/${topic.id}/review`}
                      className="action-link review"
                      title="Review"
                    >
                      <BookOpen size={14} />
                      <span className="action-label">Review</span>
                    </Link>
                    <Link
                      to={`/topics/${topic.id}/flashcards`}
                      className="action-link flashcard"
                      title="Flashcards"
                    >
                      <Layers size={14} />
                      <span className="action-label">Flashcards</span>
                    </Link>
                    <Link
                      to={`/topics/${topic.id}/quiz`}
                      className="action-link quiz"
                      title="Quiz"
                    >
                      <NotebookPen size={14} />
                      <span className="action-label">Quiz</span>
                    </Link>
                    <button
                      className="action-link action-delete"
                      title="Delete"
                      onClick={() => setDeleteTarget(topic)}
                    >
                      <Trash2 size={14} />
                      <span className="action-label">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
