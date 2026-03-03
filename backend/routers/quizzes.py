import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Topic, Quiz, QuizQuestion, Memory, Badge
from schemas import (
    QuizResponse, QuizGenerateRequest, QuizSubmitRequest, QuizResultResponse
)
from routers.auth import get_current_user
from services.ai_service import generate_quiz_questions, grade_open_answers

router = APIRouter()


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz_endpoint(
    request: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a quiz for a topic using AI."""
    topic = db.query(Topic).filter(
        Topic.id == request.topic_id,
        Topic.user_id == current_user.id
    ).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Fetch memories to bias generation
    memories = db.query(Memory).filter(Memory.topic_id == topic.id).all()
    memory_items = [{"highlighted_text": m.highlighted_text, "note": m.note} for m in memories]

    # Generate quiz questions
    try:
        questions_data = await generate_quiz_questions(
            text=topic.pdf_text,
            topic_title=topic.title,
            count=request.count,
            types=request.types,
            memory_items=memory_items
        )
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Gemini API rate limit reached. Please wait a minute and try again.")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {error_msg}")

    # Create quiz
    db_quiz = Quiz(
        topic_id=topic.id,
        title=f"Quiz: {topic.title}",
        total_questions=len(questions_data),
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)

    # Create questions
    for q in questions_data:
        db_question = QuizQuestion(
            quiz_id=db_quiz.id,
            question_type=q.get("question_type", "multiple_choice"),
            question_text=q.get("question_text", ""),
            choices=q.get("choices", ""),
            correct_answer=q.get("correct_answer", ""),
            explanation=q.get("explanation", ""),
            statement_a=q.get("statement_a", ""),
            statement_b=q.get("statement_b", ""),
        )
        db.add(db_question)

    # Award XP
    current_user.xp += 15
    current_user.level = (current_user.xp // 100) + 1
    db.commit()
    db.refresh(db_quiz)

    return db_quiz


@router.get("/topic/{topic_id}", response_model=list[QuizResponse])
async def get_quizzes(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all quizzes for a topic."""
    topic = db.query(Topic).filter(
        Topic.id == topic_id,
        Topic.user_id == current_user.id
    ).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    return db.query(Quiz).filter(Quiz.topic_id == topic_id).all()


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific quiz with all questions."""
    quiz = db.query(Quiz).join(Topic).filter(
        Quiz.id == quiz_id,
        Topic.user_id == current_user.id
    ).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.post("/submit", response_model=QuizResultResponse)
async def submit_quiz(
    submission: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit quiz answers and get results with XP rewards."""
    quiz = db.query(Quiz).join(Topic).filter(
        Quiz.id == submission.quiz_id,
        Topic.user_id == current_user.id
    ).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    correct = 0
    results = []

    # ── Separate auto-graded (letter choice) from open-ended (AI graded) ──
    open_questions = [
        (q, submission.answers.get(q.id, ""))
        for q in quiz.questions
        if q.question_type not in ("multiple_choice", "modified_true_false")
    ]

    # Grade all open-ended answers in one AI batch call
    open_verdicts: dict[int, str] = {}
    if open_questions:
        try:
            ai_input = [
                {
                    "question_text": q.question_text,
                    "correct_answer": q.correct_answer,
                    "user_answer": ua,
                    "question_type": q.question_type,
                }
                for q, ua in open_questions
            ]
            verdicts = await grade_open_answers(ai_input)
            for idx, (q, _) in enumerate(open_questions):
                open_verdicts[q.id] = verdicts[idx]["verdict"]
        except Exception as e:
            print(f"[Quiz] AI grading failed, falling back to string match: {e}")
            for q, ua in open_questions:
                open_verdicts[q.id] = (
                    "correct"
                    if ua.strip().lower() == q.correct_answer.strip().lower()
                    else "incorrect"
                )

    for question in quiz.questions:
        user_answer = submission.answers.get(question.id, "")

        if question.question_type in ("multiple_choice", "modified_true_false"):
            is_correct = user_answer.strip().lower() == question.correct_answer.strip().lower()
            verdict = "correct" if is_correct else "incorrect"
        else:
            verdict = open_verdicts.get(question.id, "incorrect")
            is_correct = verdict in ("correct", "typo")

        if is_correct:
            correct += 1

        results.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "user_answer": user_answer,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "verdict": verdict,
            "explanation": question.explanation,
        })

    total = len(quiz.questions)
    score = (correct / total * 100) if total > 0 else 0
    xp_earned = correct * 5  # 5 XP per correct answer

    # Award XP
    current_user.xp += xp_earned
    current_user.level = (current_user.xp // 100) + 1

    # Check for badge: Perfect Score
    if score == 100 and total >= 5:
        existing = db.query(Badge).filter(
            Badge.user_id == current_user.id,
            Badge.name == "Perfect Score"
        ).first()
        if not existing:
            badge = Badge(
                user_id=current_user.id,
                name="Perfect Score",
                description="Scored 100% on a quiz with 5+ questions!",
                icon="🌟",
            )
            db.add(badge)

    db.commit()

    return QuizResultResponse(
        quiz_id=quiz.id,
        total_questions=total,
        correct_answers=correct,
        score_percent=score,
        xp_earned=xp_earned,
        results=results,
    )
