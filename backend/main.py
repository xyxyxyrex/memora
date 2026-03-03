from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from config import FRONTEND_URL
from routers import auth, topics, flashcards, quizzes, articles, memories, media

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Learning Companion API",
    description="AI-assisted learning platform with flashcards, quizzes, and gamification",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(topics.router, prefix="/api/topics", tags=["Topics"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["Flashcards"])
app.include_router(quizzes.router, prefix="/api/quizzes", tags=["Quizzes"])
app.include_router(articles.router, prefix="/api/articles", tags=["Articles"])
app.include_router(memories.router, prefix="/api/memories", tags=["Memories"])
app.include_router(media.router, prefix="/api/media", tags=["Media"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Learning Companion API is running"}
