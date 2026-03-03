# Deploying Memora.AI

**Architecture:**

- **Frontend** (React/Vite) → [Vercel](https://vercel.com) (free)
- **Backend** (FastAPI) → [Render](https://render.com) (free tier)
- **Database** → PostgreSQL on [Supabase](https://supabase.com) (already using it for auth)
- **Auth** → Supabase (already set up)

---

## Step 1 — Prepare the Database

SQLite works locally but **won't persist on Render's free tier** (filesystem resets on every deploy). Use Supabase's built-in Postgres instead.

1. Go to your [Supabase project](https://supabase.com/dashboard)
2. Navigate to **Settings → Database**
3. Under **Connection string**, copy the **URI** (it starts with `postgresql://`)
4. You'll use this as `DATABASE_URL` in the next step

> If you want to keep SQLite during testing, you can skip this and set `DATABASE_URL` to `sqlite:///./learning_companion.db` — just know data will reset on every Render deploy.

---

## Step 2 — Push to GitHub

```bash
cd c:\Users\Admin\Desktop\learning-machine

git init
git add .
git commit -m "Initial commit"
```

Then:

1. Go to [github.com/new](https://github.com/new)
2. Name it `learning-machine` (or anything you like)
3. **Do NOT** check "Add README", "Add .gitignore", or "Add license"
4. Click **Create repository**
5. Copy the two lines GitHub shows under _"push an existing repository"_:

```bash
git remote add origin https://github.com/YOUR_USERNAME/learning-machine.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Deploy the Backend on Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name:** `memora-backend`
   - **Root Directory:** `backend`
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. Under **Environment Variables**, add all of these:

| Key            | Value                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| `SUPABASE_URL` | Your Supabase project URL                                               |
| `SUPABASE_KEY` | Your Supabase **service role** key (not anon)                           |
| `GROQ_API_KEY` | Your Groq API key                                                       |
| `DATABASE_URL` | PostgreSQL URI from Step 1                                              |
| `SECRET_KEY`   | Any random string (e.g. `openssl rand -hex 32`)                         |
| `FRONTEND_URL` | Your Vercel URL (add after Step 4, e.g. `https://memora-ai.vercel.app`) |

5. Click **Create Web Service** — Render will build and deploy
6. Copy the URL it gives you (e.g. `https://memora-backend.onrender.com`) — you need it next

---

## Step 4 — Configure the Frontend for Production

Open `frontend/vercel.json` and replace the placeholder with your actual Render URL:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://memora-backend.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Commit and push:

```bash
git add frontend/vercel.json
git commit -m "Add Vercel config with backend URL"
git push
```

---

## Step 5 — Deploy the Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repo
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. Under **Environment Variables**, add:

| Key                 | Value                      |
| ------------------- | -------------------------- |
| `VITE_SUPABASE_URL` | Your Supabase project URL  |
| `VITE_SUPABASE_KEY` | Your Supabase **anon** key |

5. Click **Deploy**
6. Copy your Vercel URL (e.g. `https://memora-ai.vercel.app`)

---

## Step 6 — Update CORS and Supabase Auth

### Backend CORS

Go back to Render → your service → **Environment** and update:

```
FRONTEND_URL = https://YOUR-APP.vercel.app
```

Then trigger a manual redeploy.

### Supabase OAuth redirect

1. Go to Supabase dashboard → **Authentication → URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://YOUR-APP.vercel.app/dashboard
   ```

---

## Step 7 — Run Database Migrations

Once the backend is live, run the migration once via Render's shell:

1. Render dashboard → your service → **Shell**
2. Run:
   ```bash
   python migrate.py
   ```

---

## Subsequent Deploys

Every time you `git push` to `main`:

- **Vercel** automatically rebuilds the frontend
- **Render** automatically rebuilds the backend

---

## Free Tier Limits to Know

| Service         | Limit                                                                             |
| --------------- | --------------------------------------------------------------------------------- |
| Render (free)   | Spins down after 15 min inactivity — first request after sleep takes ~30s to wake |
| Vercel (free)   | 100GB bandwidth/month, plenty for personal use                                    |
| Supabase (free) | 500MB database, 1GB file storage                                                  |
| Groq (free)     | Rate-limited but generous for personal use                                        |

> **Tip:** To avoid Render cold starts, you can use [UptimeRobot](https://uptimerobot.com) (free) to ping your backend URL every 14 minutes.
