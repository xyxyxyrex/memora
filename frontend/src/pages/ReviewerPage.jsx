import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Layers,
  NotebookPen,
  FileText,
  Files,
  Library,
  Loader2,
  Search,
  Tv2,
  ChevronDown,
  ChevronRight,
  Play,
  Sparkles,
  Clock,
  RefreshCw,
  Brain,
  PenLine,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import api from "../api";
import "./ReviewerPage.css";

function ReviewerPage() {
  const { topicId } = useParams();
  const [topic, setTopic] = useState(null);
  const [reviewerContent, setReviewerContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [articles, setArticles] = useState([]);
  const [scrapingArticles, setScrapingArticles] = useState(false);
  const [memories, setMemories] = useState([]);
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [images, setImages] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaPage, setMediaPage] = useState(1);

  // Modals
  const [videoModalUrl, setVideoModalUrl] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyVersions, setHistoryVersions] = useState([]);

  // Collapsible states
  const [articlesExpanded, setArticlesExpanded] = useState(true);
  const [mediaExpanded, setMediaExpanded] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Highlighting state
  const [selectedText, setSelectedText] = useState("");
  const [selectionPos, setSelectionPos] = useState(null);
  const popupRef = useRef(null);
  const contentRef = useRef(null);
  const containerRef = useRef(null);

  // Progress Tracker state
  const [headings, setHeadings] = useState([]);
  const [headingPositions, setHeadingPositions] = useState({});
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    fetchData();

    const handleClickOutside = (e) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        contentRef.current &&
        !contentRef.current.contains(e.target)
      ) {
        clearSelection();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [topicId]);

  useEffect(() => {
    if (window.MathJax && reviewerContent && contentRef.current) {
      try {
        window.MathJax.typesetClear([contentRef.current]);
        window.MathJax.typesetPromise([contentRef.current]);
      } catch (e) {
        console.error("MathJax Error:", e);
      }
    }
  }, [reviewerContent]);

  const fetchData = async () => {
    try {
      const [reviewerRes, articlesRes, memoriesRes] = await Promise.all([
        api.get(`/topics/${topicId}/reviewer`),
        api.get(`/articles/topic/${topicId}`),
        api.get(`/memories/topic/${topicId}`),
      ]);
      setTopic(reviewerRes.data);
      setReviewerContent(reviewerRes.data.reviewer_content);
      setArticles(articlesRes.data);
      setMemories(memoriesRes.data);
    } catch (err) {
      console.error("Failed to load reviewer:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (topic?.title && !mediaLoading && youtubeVideos.length === 0) {
      fetchMedia(topic.title, 1);
    }
  }, [topic?.title]);

  const fetchMedia = async (title, page = 1) => {
    setMediaLoading(true);
    try {
      // First page gets both videos and images. Subsequent pages just load more videos.
      if (page === 1) {
        const [ytRes, imgRes] = await Promise.all([
          api.get(`/media/youtube?query=${title}`),
          api.get(`/media/images?query=${title}`),
        ]);
        setYoutubeVideos(ytRes.data);
        setImages(imgRes.data);
      } else {
        // Approximate pagination context by adding "part 2", "more", etc (simplistic)
        const ytRes = await api.get(
          `/media/youtube?query=${title} part ${page}`,
        );
        setYoutubeVideos((prev) => [...prev, ...ytRes.data]);
      }
    } catch (err) {
      console.error("Failed to load media:", err);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleLoadMoreVideos = () => {
    if (topic?.title) {
      const nextPage = mediaPage + 1;
      setMediaPage(nextPage);
      fetchMedia(topic.title, nextPage);
    }
  };

  const handleGenerateReviewer = async () => {
    setGenerating(true);
    try {
      const res = await api.post(`/topics/${topicId}/generate-reviewer`);
      setReviewerContent(res.data.reviewer_content);
      // reset tracking
      setHeadings([]);
      setScrollProgress(0);
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleScrapeArticles = async () => {
    setScrapingArticles(true);
    try {
      const res = await api.post("/articles/scrape", {
        topic_id: parseInt(topicId),
        max_results: 5,
      });
      setArticles((prev) => [...prev, ...res.data]);
    } catch (err) {
      console.error("Scraping failed:", err);
    } finally {
      setScrapingArticles(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get(`/topics/${topicId}/history`);
      setHistoryVersions(res.data);
      setHistoryModalOpen(true);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const restoreHistory = async (content) => {
    try {
      await api.put(`/topics/${topicId}/reviewer`, {
        reviewer_content: content,
      });
      setReviewerContent(content);
      setHistoryModalOpen(false);
    } catch (err) {
      console.error("Failed to restore history", err);
    }
  };

  // --- Progress Tracker Logic ---
  const generateSlugId = (text) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  // Heading extraction and position calculation are handled after parseMarkdown renders the DOM (see effect below)

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollProgress(progress || 0);
  };

  const scrollToHeading = (id) => {
    const el = document.getElementById(id);
    const container = containerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const scrollTarget =
        elRect.top - containerRect.top + container.scrollTop - 20;
      const scrollableHeight = container.scrollHeight - container.clientHeight;
      if (scrollableHeight > 0) {
        setScrollProgress(
          Math.min(100, Math.max(0, (scrollTarget / scrollableHeight) * 100)),
        );
      }
      container.scrollTo({ top: scrollTarget, behavior: "smooth" });
    }
  };

  // --- Highlighting Logic ---
  const handleMouseUp = (e) => {
    // Prevent triggering when clicking inside the popup
    if (popupRef.current && popupRef.current.contains(e.target)) return;

    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (
      text &&
      text.length > 2 &&
      contentRef.current &&
      contentRef.current.contains(selection.anchorNode)
    ) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Calculate absolute position
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      setSelectionPos({
        top: rect.top + scrollTop - 40, // position above the text
        left: rect.left + rect.width / 2,
      });
      setSelectedText(text);
    } else {
      clearSelection();
    }
  };

  const clearSelection = () => {
    setSelectionPos(null);
    setSelectedText("");
  };

  const applyFormatting = async (type, color = "") => {
    if (!selectedText) return;

    let memoryColor = "yellow";

    // Use exactly contentEditable's built in execCommand so it perfectly handles toggling and crossing element boundaries natively
    if (contentRef.current) {
      contentRef.current.contentEditable = "true";

      if (type === "color") {
        // Browser support for hiliteColor is mixed but usually map to background-color
        document.execCommand("styleWithCSS", false, true);

        let cssColor = "#ffd166"; // yellow
        if (color === "green") cssColor = "#06d6a0";
        if (color === "blue") cssColor = "#118ab2";
        if (color === "pink") cssColor = "#ef476f";

        document.execCommand("hiliteColor", false, cssColor);
        memoryColor = color;
      } else {
        document.execCommand(type, false, null); // type is 'bold', 'italic', 'underline', 'strikeThrough'
      }

      contentRef.current.contentEditable = "false";
    }

    const updatedContent = contentRef.current.innerHTML;
    setReviewerContent(updatedContent);

    // Save visual formatting to backend
    try {
      await api.put(`/topics/${topicId}/reviewer`, {
        reviewer_content: updatedContent,
      });
    } catch (err) {
      console.error("Failed to save formatting:", err);
    }

    // Create a memory only for color highlights
    if (type === "color") {
      // Optimistic update — show in memory bank immediately
      const tempId = `temp-${Date.now()}`;
      const tempMemory = {
        id: tempId,
        topic_id: parseInt(topicId),
        highlighted_text: selectedText,
        color: memoryColor,
        note: "",
        _pending: true,
      };
      setMemories((prev) => [tempMemory, ...prev]);

      try {
        const res = await api.post("/memories/", {
          topic_id: parseInt(topicId),
          highlighted_text: selectedText,
          color: memoryColor,
          note: "",
        });
        // Replace temp with real server response
        setMemories((prev) =>
          prev.map((m) => (m.id === tempId ? res.data : m)),
        );
      } catch (err) {
        console.error("Failed to save memory:", err);
        // Roll back optimistic update
        setMemories((prev) => prev.filter((m) => m.id !== tempId));
      }
    }
    clearSelection();
  };

  const handleDeleteMemory = async (id) => {
    try {
      const memoryToDelete = memories.find((m) => m.id === id);
      await api.delete(`/memories/${id}`);
      setMemories(memories.filter((m) => m.id !== id));

      // Remove highlight from DOM
      if (memoryToDelete && contentRef.current) {
        const textToFind = memoryToDelete.highlighted_text.trim();
        const elements = contentRef.current.querySelectorAll("*");
        let modified = false;
        elements.forEach((el) => {
          // Match elements that contain the background color explicitly or implicitly and match text
          if (
            el.style &&
            el.style.backgroundColor &&
            el.textContent.trim() === textToFind
          ) {
            el.style.backgroundColor = "";
            modified = true;
          }
        });
        if (modified) {
          const updatedContent = contentRef.current.innerHTML;
          setReviewerContent(updatedContent);
          api
            .put(`/topics/${topicId}/reviewer`, {
              reviewer_content: updatedContent,
            })
            .catch((err) => console.error(err));
        }
      }
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  const handleUpdateNote = async (id, newNote) => {
    try {
      await api.put(`/memories/${id}`, { note: newNote });
      setMemories(
        memories.map((m) => (m.id === id ? { ...m, note: newNote } : m)),
      );
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  };

  // Converts pipe-table syntax (with either \n or <br/> line endings) to <table> HTML
  const convertPipeTables = (str) => {
    // Step 1: normalise <br/> to \n so the regex works on both saved HTML and raw markdown
    let s = str.replace(/<br\s*\/?>/gi, "\n");

    // Step 2: extract table blocks into placeholders
    const tablePlaceholders = [];
    s = s.replace(/((?:\|[^\n]+\|\n?){2,})/g, (tableBlock) => {
      const lines = tableBlock
        .trim()
        .split("\n")
        .filter((l) => l.trim().startsWith("|"));
      if (lines.length < 2) return tableBlock;
      const sepLine = lines[1];
      if (!/^\|[\s\-:|]+\|/.test(sepLine)) return tableBlock;
      const parseRow = (line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
      const headers = parseRow(lines[0]);
      const bodyRows = lines.slice(2).map(parseRow);
      const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${bodyRows
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
      const idx = tablePlaceholders.length;
      tablePlaceholders.push(
        `<div class="md-table-wrap"><table class="md-table">${thead}${tbody}</table></div>`,
      );
      return `@@TBLFIX${idx}@@`;
    });

    // Step 3: restore remaining \n (non-table) back to <br/>
    s = s.replace(/\n/g, "<br/>");

    // Step 4: restore table blocks
    tablePlaceholders.forEach((block, i) => {
      s = s.replace(`@@TBLFIX${i}@@`, block);
    });

    return s;
  };

  // Convert [p. N] and [p. N–M] citation tokens to non-clickable page badge spans
  const convertCitations = (str) =>
    str.replace(
      /\[p\.\s*(\d+(?:[\u2013\-]\d+)?)\]/g,
      (_, pages) => `<span class="pdf-citation">p.\u00a0${pages}</span>`,
    );

  // Simple markdown parser memoized to prevent recreation and React selection destruction
  const parseMarkdown = React.useMemo(() => {
    if (!reviewerContent) return "";

    // Skip markdown parsing entirely if content is already deeply saved HTML DOM —
    // but still run the table converter so old saved content gets proper tables
    if (
      (reviewerContent.trim().startsWith("<") ||
        reviewerContent.includes("<p>")) &&
      (reviewerContent.includes("<h2") ||
        reviewerContent.includes("<span") ||
        reviewerContent.includes("<li"))
    ) {
      return convertCitations(convertPipeTables(reviewerContent));
    }

    // Extract fenced code blocks before line processing so \n→<br/> doesn't corrupt them
    const codePlaceholders = [];
    let src = reviewerContent.replace(
      /```([\w+\-]*)\n?([\s\S]*?)```/g,
      (_, lang, code) => {
        const escaped = code
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .trimEnd();
        const langClass = lang ? ` class="language-${lang}"` : "";
        const idx = codePlaceholders.length;
        codePlaceholders.push(`<pre><code${langClass}>${escaped}</code></pre>`);
        return `@@CODE${idx}@@`;
      },
    );

    const generateSlugId = (text) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    let html = src
      .split("\n")
      .map((line) => {
        if (line.startsWith("### ")) {
          const text = line.replace("### ", "");
          return `<h3 id="${generateSlugId(text)}">${text}</h3>`;
        }
        if (line.startsWith("## ")) {
          const text = line.replace("## ", "");
          return `<h2 id="${generateSlugId(text)}">${text}</h2>`;
        }
        if (line.startsWith("# ")) return `<h1>${line.replace("# ", "")}</h1>`;
        if (line.startsWith("- ")) return `<li>${line.replace("- ", "")}</li>`;
        return line;
      })
      .join("\n")
      // Match Images ![alt](url)
      .replace(
        /!\[([^\]]*)\]\((.*?)\)/g,
        '<div class="embedded-img" style="margin: 16px 0;"><img src="$2" alt="$1" style="max-width: 100%; border-radius: 8px;"/><br/><span class="img-caption" style="font-size: 0.8rem; color: gray;">$1</span></div>',
      )
      // Match Youtube links [text](https://www.youtube.com/watch?v=XYZ)
      .replace(
        /\[([^\]]*)\]\((https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^&\)]+)|https?:\/\/youtu\.be\/([^&\)]+)(?:[^)]*))\)/g,
        (match, p1, p2, p3, p4) => {
          const vidId = p3 || p4;
          return `<div class="embedded-video" style="margin: 20px 0; border-radius: 8px; overflow: hidden; position: relative; padding-bottom: 56.25%; height: 0;"><iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/${vidId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        },
      )
      // Match other links
      .replace(
        /\[([^\]]*)\]\((.*?)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--primary);">$1</a>',
      )
      // Inline code (after block extraction so backticks don't conflict)
      .replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>')
      // Formatting
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br/>");

    // Restore code blocks
    codePlaceholders.forEach((block, i) => {
      html = html.replace(`@@CODE${i}@@`, block);
    });

    return convertCitations(convertPipeTables(`<p>${html}</p>`));
  }, [reviewerContent]);

  // Apply syntax highlighting after content renders
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }, [parseMarkdown]);

  // Build heading list and marker positions from the actual rendered DOM
  useEffect(() => {
    if (!parseMarkdown || !contentRef.current) {
      setHeadings([]);
      setHeadingPositions({});
      return;
    }

    const calcPositions = () => {
      const container = containerRef.current;
      if (!container || !contentRef.current) return;

      const elements = contentRef.current.querySelectorAll("h2, h3");
      const extractedHeadings = [];
      const positions = {};
      const scrollableHeight = container.scrollHeight - container.clientHeight;
      const viewportOffset = container.clientHeight * 0.3;

      // Helper: get total offsetTop of el relative to container
      const getOffsetFromContainer = (el) => {
        let offset = 0;
        let cur = el;
        while (cur && cur !== container) {
          offset += cur.offsetTop;
          cur = cur.offsetParent;
        }
        return offset;
      };

      elements.forEach((el) => {
        const id = el.id || generateSlugId(el.textContent.trim());
        if (!el.id) el.id = id;
        extractedHeadings.push({
          id,
          text: el.textContent.trim(),
          level: el.tagName === "H3" ? 3 : 2,
        });

        if (scrollableHeight > 0) {
          const offsetTop = getOffsetFromContainer(el);
          const adjusted = Math.max(0, offsetTop - viewportOffset);
          const pct = (adjusted / scrollableHeight) * 100;
          positions[id] = Math.min(96, Math.max(2, pct));
        }
      });

      setHeadings(extractedHeadings);
      setHeadingPositions(positions);
    };

    // Wait for browser to paint the new HTML (hljs may also reflow layout)
    const timer = setTimeout(calcPositions, 500);
    return () => clearTimeout(timer);
  }, [parseMarkdown]);

  const parsedHtmlObj = React.useMemo(
    () => ({ __html: parseMarkdown }),
    [parseMarkdown],
  );

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Loading reviewer...</p>
      </div>
    );
  }

  return (
    <div className="reviewer-page">
      <div className="reviewer-header-bar">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <h1 className="topic-title">{topic?.title}</h1>
        </div>
        <div className="header-actions">
          <a
            href={`/api/topics/${topicId}/download-pdf`}
            download
            className="btn-outline"
          >
            <Download size={14} /> Download PDF
          </a>
          <Link to={`/topics/${topicId}/flashcards`} className="btn-secondary">
            <Layers size={14} /> Flashcards
          </Link>
          <Link to={`/topics/${topicId}/quiz`} className="btn-secondary">
            <NotebookPen size={14} /> Quiz
          </Link>
        </div>
      </div>

      <div className="reviewer-layout">
        {/* Left Column: Resources */}
        <div
          className={`layout-col resources-col${leftOpen ? "" : " collapsed"}`}
        >
          <div className="card resource-card">
            <h3>
              <FileText size={16} /> Source Material
            </h3>
            {topic?.has_pdf ? (
              <div className="pdf-info">
                <span className="icon">
                  <Files size={16} />
                </span>
                <span className="filename">{topic.pdf_filename}</span>
                <p className="file-desc">
                  This PDF was used to generate the reviewer.
                </p>
              </div>
            ) : (
              <p className="no-content">
                No PDF uploaded. Content was generated from the topic title.
              </p>
            )}
          </div>

          <div className="card research-card">
            <div
              className="card-header-flex"
              onClick={() => setArticlesExpanded(!articlesExpanded)}
              style={{ cursor: "pointer" }}
            >
              <h3 style={{ marginBottom: 0 }}>
                <Library size={16} /> Research Articles{" "}
                {articlesExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </h3>
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleScrapeArticles();
                }}
                disabled={scrapingArticles}
                title="Find more articles"
              >
                {scrapingArticles ? (
                  <Loader2 size={14} className="spin" />
                ) : (
                  <Search size={14} />
                )}
              </button>
            </div>

            {articlesExpanded && (
              <div className="articles-flex" style={{ marginTop: "16px" }}>
                {articles.length > 0 ? (
                  articles.map((article) => (
                    <div key={article.id} className="mini-article">
                      <h4 className="mini-title">{article.title}</h4>
                      <span className="mini-source">{article.source}</span>
                      <div className="article-links">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-text"
                        >
                          Read Abstract
                        </a>
                        {article.pdf_url && (
                          <a
                            href={article.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-pdf"
                          >
                            <FileText size={12} /> PDF
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-content-small">
                    Click the search button to find related academic papers.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="card media-card">
            <div
              className="card-header-flex"
              onClick={() => setMediaExpanded(!mediaExpanded)}
              style={{ cursor: "pointer" }}
            >
              <h3 style={{ marginBottom: 0 }}>
                <Tv2 size={16} /> Videos{" "}
                {mediaExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </h3>
            </div>
            {mediaExpanded && (
              <div style={{ marginTop: "16px" }}>
                {mediaLoading ? (
                  <p className="loading-text">
                    <span className="spinner-small"></span> Fetching media...
                  </p>
                ) : (
                  <div className="media-flex">
                    {youtubeVideos.length > 0 &&
                      youtubeVideos.map((vid) => (
                        <div
                          key={vid.id}
                          className="video-container"
                          onClick={() => setVideoModalUrl(vid.embed_url)}
                        >
                          <div className="video-thumb-overlay">
                            <span>
                              <Play size={14} /> Play Video
                            </span>
                          </div>
                          <img
                            src={`https://img.youtube.com/vi/${vid.id}/0.jpg`}
                            alt="Thumbnail"
                            className="yt-thumbnail"
                          />
                        </div>
                      ))}
                    {youtubeVideos.length > 0 && (
                      <button
                        className="btn-secondary load-more-btn"
                        onClick={handleLoadMoreVideos}
                        disabled={mediaLoading}
                      >
                        {mediaLoading ? "Loading..." : "Load More Videos"}
                      </button>
                    )}
                    {images.length > 0 &&
                      images.map((img, i) => (
                        <div key={i} className="img-container">
                          <a
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img src={img.url} alt={img.title} loading="lazy" />
                          </a>
                          <span className="img-caption">{img.title}</span>
                        </div>
                      ))}
                    {youtubeVideos.length === 0 && images.length === 0 && (
                      <p className="no-content-small">
                        No relevant videos found.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Reviewer Content */}
        <div
          className="layout-col content-col"
          style={{ position: "relative" }}
        >
          {/* Left panel toggle */}
          <button
            className="panel-toggle panel-toggle-left"
            onClick={() => setLeftOpen((o) => !o)}
            title={leftOpen ? "Collapse resources" : "Expand resources"}
          >
            {leftOpen ? (
              <PanelLeftClose size={14} />
            ) : (
              <PanelLeftOpen size={14} />
            )}
          </button>

          {/* Right panel toggle */}
          <button
            className="panel-toggle panel-toggle-right"
            onClick={() => setRightOpen((o) => !o)}
            title={rightOpen ? "Collapse memory bank" : "Expand memory bank"}
          >
            {rightOpen ? (
              <PanelRightClose size={14} />
            ) : (
              <PanelRightOpen size={14} />
            )}
          </button>
          {/* Progress Tracker */}
          <div className="reviewer-card-outer">
            <div className="reviewer-card-wrap">
              <div
                className="card reviewer-content-card"
                ref={containerRef}
                onScroll={handleScroll}
              >
                {!reviewerContent ? (
                  <div className="empty-reviewer">
                    <h2>Ready to Study?</h2>
                    <p>
                      Generate a comprehensive, AI-powered study reviewer for
                      this topic.
                    </p>
                    <button
                      className="btn-primary generate-btn"
                      onClick={handleGenerateReviewer}
                      disabled={generating}
                    >
                      {generating ? (
                        <>
                          <span className="spinner-small"></span> Generating
                          Reviewer (approx 30s)...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Generate Full Reviewer
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <div className="reviewer-actions-top">
                      <button
                        className="btn-outline history-btn-small"
                        onClick={loadHistory}
                        title="View Past Versions"
                      >
                        <Clock size={14} /> History
                      </button>
                      <button
                        className="btn-outline regenerate-top-btn"
                        onClick={handleGenerateReviewer}
                        disabled={generating}
                      >
                        {generating ? (
                          "Regenerating..."
                        ) : (
                          <>
                            <RefreshCw size={14} /> Regenerate Reviewer
                          </>
                        )}
                      </button>
                    </div>
                    <div
                      className="markdown-content"
                      ref={contentRef}
                      onMouseUp={handleMouseUp}
                      dangerouslySetInnerHTML={parsedHtmlObj}
                    />
                  </div>
                )}
              </div>
            </div>
            {headings.length > 0 && reviewerContent && (
              <div className="progress-tracker">
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ height: `${scrollProgress}%` }}
                  ></div>
                  {headings.map((h) => (
                    <div
                      key={h.id}
                      className={`progress-marker level-${h.level} ${scrollProgress >= (headingPositions[h.id] || 0) ? "active" : ""}`}
                      style={{ top: `${headingPositions[h.id] || 0}%` }}
                      onClick={() => scrollToHeading(h.id)}
                      data-title={h.text}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Memory Panel */}
        <div
          className={`layout-col memory-col${rightOpen ? "" : " collapsed"}`}
        >
          <div className="card memory-card">
            <div className="memory-header">
              <h3>
                <Brain size={16} /> Memory Bank
              </h3>
              <span className="badge">{memories.length}</span>
            </div>
            <p className="memory-desc">
              Highlight text in the reviewer to save it here. These notes will
              bias your AI generated flashcards and quizzes!
            </p>

            <div className="memories-list">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className={`memory-item color-${memory.color}${memory._pending ? " memory-pending" : ""}`}
                >
                  {memory._pending && (
                    <span className="memory-saving-label">Saving…</span>
                  )}
                  <div className="memory-text">"{memory.highlighted_text}"</div>
                  <textarea
                    className="memory-note"
                    placeholder="Add a note..."
                    defaultValue={memory.note}
                    disabled={!!memory._pending}
                    onBlur={(e) => {
                      if (e.target.value !== memory.note) {
                        handleUpdateNote(memory.id, e.target.value);
                      }
                    }}
                  />
                  <button
                    className="delete-memory"
                    disabled={!!memory._pending}
                    onClick={() => handleDeleteMemory(memory.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
              {memories.length === 0 && (
                <div className="empty-memories">
                  <div className="empty-icon">
                    <PenLine size={40} />
                  </div>
                  <p>Select any text to highlight it</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Highlighting Popup Toolbar */}
      {selectionPos && (
        <div
          ref={popupRef}
          className="highlight-popup"
          style={{ top: selectionPos.top, left: selectionPos.left }}
        >
          <button
            className="format-btn"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormatting("bold");
            }}
            title="Bold"
          >
            B
          </button>
          <button
            className="format-btn italic"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormatting("italic");
            }}
            title="Italic"
          >
            I
          </button>
          <button
            className="format-btn underline"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormatting("underline");
            }}
            title="Underline"
          >
            U
          </button>
          <button
            className="format-btn strikethrough"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormatting("strikeThrough");
            }}
            title="Strikethrough"
          >
            S
          </button>
          <div className="toolbar-divider"></div>
          <button
            className="color-btn yellow"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormatting("color", "yellow");
            }}
          ></button>
          <button
            className="color-btn green"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormatting("color", "green");
            }}
          ></button>
          <button
            className="color-btn blue"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormatting("color", "blue");
            }}
          ></button>
          <button
            className="color-btn pink"
            onMouseDown={(e) => {
              e.preventDefault();
              applyFormatting("color", "pink");
            }}
          ></button>
        </div>
      )}

      {/* Video Modal */}
      {videoModalUrl && (
        <div
          className="video-modal-overlay"
          onClick={() => setVideoModalUrl(null)}
        >
          <div
            className="video-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal-btn"
              onClick={() => setVideoModalUrl(null)}
            >
              ×
            </button>
            <iframe
              src={videoModalUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div
          className="history-modal-overlay"
          onClick={() => setHistoryModalOpen(false)}
        >
          <div
            className="history-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-header">
              <h2>Reviewer History</h2>
              <button
                className="close-modal-btn"
                onClick={() => setHistoryModalOpen(false)}
              >
                ×
              </button>
            </div>
            {historyVersions.length === 0 ? (
              <p>
                No past versions saved yet. Regenerate the reviewer to save a
                version!
              </p>
            ) : (
              <div className="history-list">
                {historyVersions.map((v) => (
                  <div key={v.id} className="history-item">
                    <div className="history-info">
                      <strong>Version {v.id}</strong>
                      <span>{new Date(v.created_at).toLocaleString()}</span>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => restoreHistory(v.content)}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewerPage;
