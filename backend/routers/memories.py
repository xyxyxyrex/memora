from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Topic, Memory
from schemas import MemoryCreate, MemoryUpdate, MemoryResponse
from routers.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=MemoryResponse)
async def create_memory(
    memory: MemoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a memory item (highlighted text with optional note)."""
    # Verify topic belongs to user
    topic = db.query(Topic).filter(
        Topic.id == memory.topic_id,
        Topic.user_id == current_user.id
    ).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    db_memory = Memory(
        topic_id=memory.topic_id,
        highlighted_text=memory.highlighted_text,
        note=memory.note,
        color=memory.color,
        position_start=memory.position_start,
        position_end=memory.position_end,
    )
    db.add(db_memory)

    # Award XP for creating memory
    current_user.xp += 2
    current_user.level = (current_user.xp // 100) + 1

    db.commit()
    db.refresh(db_memory)
    return db_memory


@router.get("/topic/{topic_id}", response_model=list[MemoryResponse])
async def get_memories(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all memory items for a topic."""
    topic = db.query(Topic).filter(
        Topic.id == topic_id,
        Topic.user_id == current_user.id
    ).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    return db.query(Memory).filter(Memory.topic_id == topic_id).order_by(Memory.created_at.desc()).all()


@router.put("/{memory_id}", response_model=MemoryResponse)
async def update_memory(
    memory_id: int,
    update: MemoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a memory item's note or color."""
    memory = db.query(Memory).join(Topic).filter(
        Memory.id == memory_id,
        Topic.user_id == current_user.id
    ).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    if update.note is not None:
        memory.note = update.note
    if update.color is not None:
        memory.color = update.color

    db.commit()
    db.refresh(memory)
    return memory


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a memory item."""
    memory = db.query(Memory).join(Topic).filter(
        Memory.id == memory_id,
        Topic.user_id == current_user.id
    ).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    db.delete(memory)
    db.commit()
    return {"message": "Memory deleted successfully"}
