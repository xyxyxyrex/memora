from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    supabase_id = Column(String(255), unique=True, index=True)
    email = Column(String(255), unique=True, index=True)
    display_name = Column(String(255), default="")
    avatar_url = Column(String(500), default="")
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    topics = relationship("Topic", back_populates="user")
    badges = relationship("Badge", back_populates="user")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(500))
    description = Column(Text, default="")
    summary = Column(Text, default="")
    reviewer_content = Column(Text, default="")  # Full AI-generated reviewer
    pdf_filename = Column(String(500), default="")
    pdf_text = Column(Text, default="")
    pdf_images = Column(Text, default="")  # JSON list of extracted image metadata
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="topics")
    flashcards = relationship("Flashcard", back_populates="topic", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="topic", cascade="all, delete-orphan")
    articles = relationship("Article", back_populates="topic", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="topic", cascade="all, delete-orphan")
    history = relationship("ReviewerHistory", back_populates="topic", cascade="all, delete-orphan")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    question = Column(Text)
    answer = Column(Text)
    difficulty = Column(String(20), default="medium")  # easy, medium, hard
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    topic = relationship("Topic", back_populates="flashcards")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    title = Column(String(500))
    total_questions = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    topic = relationship("Topic", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    question_type = Column(String(50))  # multiple_choice, identification, enumeration, modified_true_false
    question_text = Column(Text)
    choices = Column(Text, default="")        # JSON string for multiple choice options
    correct_answer = Column(Text)
    explanation = Column(Text, default="")
    statement_a = Column(Text, default="")    # For modified true/false
    statement_b = Column(Text, default="")    # For modified true/false

    quiz = relationship("Quiz", back_populates="questions")


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    title = Column(String(500))
    url = Column(String(1000))
    pdf_url = Column(String(1000), default="")   # Direct PDF download link
    source = Column(String(255), default="")
    snippet = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    topic = relationship("Topic", back_populates="articles")


class Memory(Base):
    """User-highlighted text snippets with optional notes.
    These feed into flashcard/quiz generation for personalized learning."""
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    highlighted_text = Column(Text)         # The selected/highlighted text
    note = Column(Text, default="")         # User's annotation/note
    color = Column(String(20), default="yellow")  # Highlight color
    position_start = Column(Integer, default=0)    # Character offset in reviewer content
    position_end = Column(Integer, default=0)      # Character offset end
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    topic = relationship("Topic", back_populates="memories")


class ReviewerHistory(Base):
    __tablename__ = "reviewer_history"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    content = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    topic = relationship("Topic")


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(255))
    description = Column(Text, default="")
    icon = Column(String(100), default="🏆")
    earned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="badges")
