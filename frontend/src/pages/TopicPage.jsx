import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pencil,
  FileText,
  CheckCircle2,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import api from "../api";
import "./TopicPage.css";

function TopicPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("text"); // text or pdf
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a topic title");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "pdf" && file) {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("file", file);
        await api.post("/topics/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/topics/", { title, description });
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create topic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="topic-page">
      <div className="topic-container animate-fade-in-up">
        <h1 className="topic-page-title">Create New Topic</h1>
        <p className="topic-page-subtitle">
          Enter a topic or upload a PDF to get started
        </p>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === "text" ? "active" : ""}`}
            onClick={() => setMode("text")}
          >
            <Pencil size={14} /> Text Topic
          </button>
          <button
            className={`mode-btn ${mode === "pdf" ? "active" : ""}`}
            onClick={() => setMode("pdf")}
          >
            <FileText size={14} /> Upload PDF
          </button>
        </div>

        <form onSubmit={handleSubmit} className="topic-form">
          <div className="form-group">
            <label className="form-label">Topic Title *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Introduction to Machine Learning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              id="topic-title-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="input-field textarea"
              placeholder="Brief description of what you want to learn..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              id="topic-description-input"
            />
          </div>

          {mode === "pdf" && (
            <div className="form-group">
              <label className="form-label">Upload PDF</label>
              <div
                className={`upload-area ${file ? "has-file" : ""}`}
                onClick={() => document.getElementById("pdf-upload").click()}
              >
                {file ? (
                  <>
                    <span className="upload-icon">
                      <CheckCircle2 size={24} />
                    </span>
                    <span className="upload-text">{file.name}</span>
                    <span className="upload-size">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="upload-icon">
                      <FolderOpen size={24} />
                    </span>
                    <span className="upload-text">
                      Click to select a PDF file
                    </span>
                    <span className="upload-hint">or drag and drop here</span>
                  </>
                )}
              </div>
              <input
                type="file"
                id="pdf-upload"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>
          )}

          {error && (
            <div className="error-message">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary submit-btn"
            disabled={loading}
            id="create-topic-btn"
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                {mode === "pdf" ? "Processing PDF..." : "Creating Topic..."}
              </>
            ) : (
              `Create Topic ${mode === "pdf" ? "& Process PDF" : ""}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default TopicPage;
