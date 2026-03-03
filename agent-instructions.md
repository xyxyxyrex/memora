# AI Agent Instructions – Learning Companion Project

## Purpose
This document guides the AI agent on how to assist in building, configuring, and maintaining the Learning Companion web application. The AI agent should act as a technical assistant for development, setup, and content generation.

---

## 1. Reference Documents
The AI agent must refer to the following files for context:

- **stack.md** – Defines the full technology stack and compatibility notes.
- **setup.md** – Contains environment variables, API keys, and installation instructions.
- **README.md** – Provides project overview, user flow, and feature descriptions.

---

## 2. Tasks & Responsibilities

### **A. Project Setup**
- Generate environment files (`.env`) with placeholders for:
  - Supabase Auth keys (Google/GitHub login)
  - Gemini 3.1 API keys
  - Database connection strings (SQLite/PostgreSQL)
  - Redis connection (if caching/queue is used)
- Provide step-by-step instructions for:
  - Installing Python packages with version compatibility (use `requirements.txt` or `pipenv`/`Poetry`)
  - Installing Node.js dependencies (React + Tailwind + Lottie + GSAP)
  - Ensuring all libraries are compatible with each other
- Include optional deployment instructions for Vercel (frontend) and Render/Railway (backend)

### **B. AI Content Assistance**
- Summarize uploaded PDFs into multi-page reviewer layouts
- Generate flashcards (question + answer) from PDF text or topics
- Generate quiz questions in multiple formats:
  - Multiple Choice
  - Identification
  - Enumeration / List
  - Modified True/False (Statement A/B both true/false logic)
- Suggest additional academic PDFs based on topic for scraping
- Ensure outputs are stored in database tables defined in `stack.md`

### **C. Frontend Guidance**
- Recommend React/Vue components for:
  - Multi-page topic navigation
  - Flashcard UI
  - Quizzes with dynamic forms
  - Gamification display (XP, badges, levels)
- Suggest Lottie or GSAP animations where appropriate

### **D. Backend Guidance**
- Recommend table structures for:
  - Users
  - Topics
  - Flashcards
  - Quizzes
  - Academic articles
- Suggest endpoints in FastAPI for:
  - PDF upload & processing
  - Flashcard retrieval
  - Quiz retrieval & submission
  - Topic-based article scraping
- Suggest caching or queue usage with Redis if needed for heavy PDF processing

---

## 3. Compatibility Management
- Always check for version conflicts before suggesting library installation
- Recommend pinned versions in `requirements.txt` or `package.json`
- Include notes on known issues between React, Tailwind, Lottie, and GSAP
- Ensure Python 3.11+ libraries are compatible (FastAPI, PyMuPDF, Tesseract, BeautifulSoup)

---

## 4. Output Format
- Always produce outputs as **markdown**, unless explicitly requested otherwise
- Provide **code snippets** with proper syntax highlighting
- Label file names clearly (e.g., `setup.md`, `requirements.txt`, `flashcards.py`)
- Provide step-by-step instructions in numbered lists
- Include warnings for manual steps or potential errors

---

## 5. Workflow Recommendations
1. **Project Initialization**
   - Use AI to generate `setup.md` from `stack.md`
   - Create base `.env` with placeholders
2. **Frontend & Backend Scaffolding**
   - Recommend file/folder structure
   - Suggest React/Vue components and API endpoints
3. **AI Content Integration**
   - Integrate Gemini 3.1 API for summarization, flashcard, and quiz generation
4. **Testing & Verification**
   - Validate database connections and table structures
   - Check front-end rendering of flashcards/quizzes
   - Test PDF scraping with compliance and rate limits
5. **Deployment Assistance**
   - Provide guidance for free-tier hosting (Vercel, Render, Railway)
   - Include environment variable configuration for deployed apps

---

## 6. Constraints
- All solutions must use **free or open-source services** unless explicitly stated
- Scraping must respect copyright and robots.txt
- All suggested dependencies and libraries must be **compatible with the stack in `stack.md`**
- AI should not attempt to generate copyrighted full PDFs, only metadata or open-access links
