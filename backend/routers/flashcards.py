from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Topic, Flashcard, Memory
from schemas import FlashcardResponse, FlashcardGenerateRequest
from routers.auth import get_current_user
from services.ai_service import generate_flashcards

router = APIRouter()


@router.post("/generate", response_model=list[FlashcardResponse])
async def generate_flashcards_endpoint(
    request: FlashcardGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate flashcards for a topic using AI."""
    topic = db.query(Topic).filter(
        Topic.id == request.topic_id,
        Topic.user_id == current_user.id
    ).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Use provided text, topic's PDF text, or topic title
    source_text = request.source_text or topic.pdf_text    # Fetch memories to bias generation
    memories = db.query(Memory).filter(Memory.topic_id == topic.id).all()
    memory_items = [{"highlighted_text": m.highlighted_text, "note": m.note} for m in memories]

    # Generate flashcards
    try:
        flashcards_data = await generate_flashcards(
            text=topic.pdf_text,
            topic_title=topic.title,
            count=request.count,
            memory_items=memory_items
        )
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(status_code=429, detail="AI rate limit reached. Please wait a minute and try again.")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {error_msg}")

    # Save to database
    created_cards = []
    for card in flashcards_data:
        db_card = Flashcard(
            topic_id=topic.id,
            question=card["question"],
            answer=card["answer"],
            difficulty=card.get("difficulty", "medium"),
        )
        db.add(db_card)
        created_cards.append(db_card)

    # Award XP
    current_user.xp += 15
    current_user.level = (current_user.xp // 100) + 1
    db.commit()

    for card in created_cards:
        db.refresh(card)

    return created_cards


@router.get("/topic/{topic_id}", response_model=list[FlashcardResponse])
async def get_flashcards(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all flashcards for a topic."""
    topic = db.query(Topic).filter(
        Topic.id == topic_id,
        Topic.user_id == current_user.id
    ).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    return db.query(Flashcard).filter(Flashcard.topic_id == topic_id).all()


@router.delete("/{flashcard_id}")
async def delete_flashcard(
    flashcard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific flashcard."""
    card = db.query(Flashcard).join(Topic).filter(
        Flashcard.id == flashcard_id,
        Topic.user_id == current_user.id
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    db.delete(card)
    db.commit()
    return {"message": "Flashcard deleted"}
