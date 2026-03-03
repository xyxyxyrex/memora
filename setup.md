# Learning Companion – Setup Guide

## Prerequisites
- **Python 3.11+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** and **npm 9+** — [Download](https://nodejs.org/)
- **Git** — [Download](https://git-scm.com/)

---

## 1. Clone & Navigate

```bash
git clone <your-repo-url> learning-machine
cd learning-machine
```

---

## 2. Environment Variables

Copy `.env.example` to `.env` in the project root and fill in your values:

```bash
cp .env.example .env
```

### API Key Setup

#### Supabase Auth (Google/GitHub Login)
1. Go to [supabase.com](https://supabase.com) → Create a free project
2. Navigate to **Settings → API** → Copy the **Project URL** and **anon public key**
3. Enable Google/GitHub providers under **Authentication → Providers**
   - **Google**: Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add Client ID & Secret in Supabase
   - **GitHub**: Create an OAuth App at [GitHub Developer Settings](https://github.com/settings/developers), add Client ID & Secret in Supabase
4. Set `SUPABASE_URL` and `SUPABASE_KEY` in `.env`

#### Gemini API
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Set `GEMINI_API_KEY` in `.env`

#### Optional: Redis
1. Go to [Redis Labs](https://redis.com/try-free/) → Create a free database
2. Copy the connection URL → Set `REDIS_URL` in `.env`

#### Optional: PostgreSQL (Production)
1. Go to [Supabase](https://supabase.com) or [ElephantSQL](https://www.elephantsql.com/) → Create a free database
2. Copy the connection string → Set `DATABASE_URL` in `.env`

---

## 3. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Initialize Database

```bash
python -c "from database import engine, Base; from models import *; Base.metadata.create_all(bind=engine)"
```

### Run Backend Server

```bash
uvicorn main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

---

## 4. Frontend Setup

```bash
cd frontend
npm install
```

### Configure Supabase Client
Edit `src/supabaseClient.js` with your `SUPABASE_URL` and `SUPABASE_KEY` (or set them in the frontend `.env`):

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

### Run Frontend Dev Server

```bash
npm run dev
```

App available at: `http://localhost:5173`

---

## 5. Deployment (Free Tier)

### Frontend → Vercel
1. Push to GitHub → Import project at [vercel.com](https://vercel.com)
2. Set root directory to `frontend`
3. Add environment variables in Vercel dashboard

### Backend → Render
1. Push to GitHub → Create new Web Service at [render.com](https://render.com)
2. Set root directory to `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in Render dashboard

---

## 6. Version Compatibility Warnings

> ⚠️ **Python Packages**: All versions are pinned in `requirements.txt`. Do not upgrade `PyMuPDF` past 1.25.x without testing — breaking API changes are common.

> ⚠️ **React + Tailwind**: Tailwind CSS v3.x is required. Tailwind v4 has breaking changes with the current config format.

> ⚠️ **react-lottie-player**: Use v2.x for React 18 compatibility. v1.x may cause hydration errors.

> ⚠️ **GSAP**: The free version does not include ScrollTrigger or MorphSVG plugins. Only use core GSAP features.

> ⚠️ **Node.js**: Use Node 18 LTS or 20 LTS. Odd-numbered versions are not recommended for production.