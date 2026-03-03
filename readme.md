# Learning Companion – AI-Assisted Learning Web App

## Project Overview
Learning Companion is a web application designed to help users study efficiently using PDFs, flashcards, quizzes, and gamified progress tracking. Users can:

- Login via Google or GitHub
- Enter a topic or upload a PDF
- Generate flashcards, quizzes, and reviewer pages from uploaded content
- Download academic PDFs related to a topic
- Track progress through XP, levels, and badges

AI integration (Gemini 3.1) is used to generate summaries, questions, and flashcards automatically.

---

## Features

1. **User Authentication**
   - Google and GitHub login
   - Free-tier Supabase Auth or Firebase Auth

2. **Topic Input / PDF Upload**
   - Extract text from PDFs using PyMuPDF or Tesseract OCR
   - Optionally scrape publicly available PDFs related to topic

3. **Learning Modules**
   - Reviewer: AI-generated summary pages
   - Flashcards: Interactive Q&A cards
   - Quizzes: Multiple choice, identification, enumeration, modified true/false

4. **Gamification**
   - Track XP, levels, and badges
   - Animated rewards using Lottie and CSS transitions

5. **Download Academic Articles**
   - Scrape legally accessible PDFs using Python requests + BeautifulSoup
   - Display links for users to download

---

## Tech Stack (No-Cost)

**Frontend:**
- React 18.x or Vue 3.x
- Tailwind CSS 3.x or Bootstrap 5.x
- React Router / Vue Router
- LottieFiles + react-lottie-player
- GSAP Free

**Backend:**
- Python 3.11+ with FastAPI
- SQLite (local) or PostgreSQL (ElephantSQL / Supabase free tier)
- Redis (free tier) for caching/queues

**AI Integration:**
- Gemini 3.1 – summarize PDFs, generate flashcards, quizzes

**Deployment:**
- Frontend: Vercel / Netlify (Free Tier)
- Backend: Render / Railway (Free Tier)
- Database: Supabase / ElephantSQL (Free Tier)