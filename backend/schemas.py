from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── User ──────────────────────────────────────────────
class UserBase(BaseModel):
    email: str
    display_name: str = ""
    avatar_url: str = ""

class UserCreate(UserBase):
    supabase_id: str

class UserResponse(UserBase):
    id: int
    supabase_id: str
    xp: int
    level: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Topic ─────────────────────────────────────────────
class TopicBase(BaseModel):
    title: str
    description: str = ""

class TopicCreate(TopicBase):
    pass

class TopicResponse(TopicBase):
    id: int
    user_id: int
    summary: str
    reviewer_content: str = ""
    pdf_filename: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Flashcard ─────────────────────────────────────────
class FlashcardBase(BaseModel):
    question: str
    answer: str
    difficulty: str = "medium"

class FlashcardResponse(FlashcardBase):
    id: int
    topic_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class FlashcardGenerateRequest(BaseModel):
    topic_id: int
    count: int = 10
    source_text: Optional[str] = None


# ── Quiz ──────────────────────────────────────────────
class QuizQuestionBase(BaseModel):
    question_type: str
    question_text: str
    choices: str = ""
    correct_answer: str
    explanation: str = ""
    statement_a: str = ""
    statement_b: str = ""

class QuizQuestionResponse(QuizQuestionBase):
    id: int
    quiz_id: int

    class Config:
        from_attributes = True

class QuizResponse(BaseModel):
    id: int
    topic_id: int
    title: str
    total_questions: int
    created_at: datetime
    questions: list[QuizQuestionResponse] = []

    class Config:
        from_attributes = True

class QuizGenerateRequest(BaseModel):
    topic_id: int
    count: int = 10
    types: list[str] = ["multiple_choice", "identification", "enumeration", "modified_true_false"]


# ── Article ───────────────────────────────────────────
class ArticleBase(BaseModel):
    title: str
    url: str
    pdf_url: str = ""
    source: str = ""
    snippet: str = ""

class ArticleResponse(ArticleBase):
    id: int
    topic_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ArticleScrapeRequest(BaseModel):
    topic_id: int
    query: Optional[str] = None
    max_results: int = 5


# ── Memory ────────────────────────────────────────────
class MemoryCreate(BaseModel):
    topic_id: int
    highlighted_text: str
    note: str = ""
    color: str = "yellow"
    position_start: int = 0
    position_end: int = 0

class MemoryUpdate(BaseModel):
    note: Optional[str] = None
    color: Optional[str] = None

class MemoryResponse(BaseModel):
    id: int
    topic_id: int
    highlighted_text: str
    note: str
    color: str
    position_start: int
    position_end: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Gamification ──────────────────────────────────────
class BadgeResponse(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    earned_at: datetime

    class Config:
        from_attributes = True

class UserProgressResponse(BaseModel):
    xp: int
    level: int
    badges: list[BadgeResponse] = []
    xp_to_next_level: int

class QuizSubmitRequest(BaseModel):
    quiz_id: int
    answers: dict[int, str]  # question_id -> user_answer

class QuizResultResponse(BaseModel):
    quiz_id: int
    total_questions: int
    correct_answers: int
    score_percent: float
    xp_earned: int
    results: list[dict]


# ── Reviewer ──────────────────────────────────────────
class ReviewerGenerateRequest(BaseModel):
    topic_id: int
