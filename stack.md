# Learning Companion – Free / No-Cost Stack

## Frontend
- **Framework**: React (latest stable 18.x) or Vue.js 3.x
- **Routing**: React Router v6+ or Vue Router 4.x
- **UI Styling**: Tailwind CSS v3.x or Bootstrap 5.x
- **Animations**: 
  - LottieFiles + react-lottie-player
  - GSAP Free (GreenSock)
- **Notes**: All libraries are compatible with latest React 18.x. Lottie works with React 17+ and above.

## Backend
- **Framework**: Python 3.11+ with FastAPI
- **Database**: 
  - SQLite (local / small scale)
  - PostgreSQL (free tier: ElephantSQL or Supabase)
- **Caching / Queues**: Redis (Redis Labs free tier)
- **Authentication**: 
  - Supabase Auth free tier (supports Google/GitHub login)
  - Optional: Firebase Authentication free tier
- **Hosting**:
  - Render Free Tier (FastAPI backend)
  - Vercel / Netlify Free Tier (frontend)

## PDF / Content Processing
- **PDF extraction**: PyMuPDF / fitz (Python)
- **OCR for scanned PDFs**: Tesseract OCR
- **Scraping**: BeautifulSoup + requests (Python)
- **Notes**: Ensure robots.txt compliance; avoid copyrighted content.

## AI Integration
- **Language Model**: Gemini 3.1 (your AI)
- **Use Cases**:
  - Summarize PDFs → reviewer pages
  - Generate flashcards from topic/PDF text
  - Generate quiz questions
- **Notes**: All AI generation runs server-side; results stored in DB for frontend use.

## Gamification / Progress Tracking
- **Logic**: Implement XP, levels, badges in DB
- **Frontend Animations**: Lottie + CSS transitions

## Frontend/Backend Compatibility Notes
- Python 3.11+ is compatible with FastAPI, PyMuPDF, Tesseract, and all scraping libraries.
- React 18 + Tailwind CSS 3.x + Lottie integration is compatible; ensure react-lottie-player v2.x for latest React support.
- PostgreSQL and SQLite are interchangeable for development; production can switch to free PostgreSQL.

## Deployment & DevOps
- **Frontend**: Vercel / Netlify
- **Backend**: Render / Railway free tier
- **Database**: Supabase / ElephantSQL
- **CI/CD**: GitHub Actions or GitLab CI (free tier)
- **Notes**: Ensure Python packages in requirements.txt or pipenv/Poetry lock for compatibility across environments.
