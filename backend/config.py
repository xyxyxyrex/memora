import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# AI Provider (Groq)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./learning_companion.db")

# Redis (optional)
REDIS_URL = os.getenv("REDIS_URL", "")

# App
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
