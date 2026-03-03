from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, Topic, Memory, ReviewerHistory
from schemas import TopicCreate, TopicResponse, ReviewerGenerateRequest
from routers.auth import get_current_user
from services.pdf_service import extract_text_from_bytes, extract_images_from_bytes
from services.ai_service import summarize_text, generate_full_reviewer
import os
import io
import json

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=TopicResponse)
async def create_topic(
    topic: TopicCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new topic."""
    db_topic = Topic(
        user_id=current_user.id,
        title=topic.title,
        description=topic.description,
    )
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)
    return db_topic


@router.post("/upload", response_model=TopicResponse)
async def upload_pdf(
    title: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a PDF and create a topic with extracted text."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Read and extract text
    contents = await file.read()
    pdf_text = extract_text_from_bytes(contents, file.filename)

    # Save file to disk
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    # Generate summary via AI
    summary = ""
    try:
        summary = await summarize_text(pdf_text)
    except Exception:
        summary = "[Summary generation failed — you can retry later]"

    # Create topic (commit first to obtain the auto-generated topic ID)
    db_topic = Topic(
        user_id=current_user.id,
        title=title,
        description=description,
        pdf_filename=file.filename,
        pdf_text=pdf_text,
        summary=summary,
    )
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)

    # Extract images now that we have the topic ID for namespacing the filenames
    try:
        img_records = extract_images_from_bytes(contents, db_topic.id, UPLOAD_DIR)
        db_topic.pdf_images = json.dumps(img_records)
        db.commit()
        db.refresh(db_topic)
        print(f"[PDF] Extracted {len(img_records)} image(s) from '{file.filename}'")
    except Exception as e:
        print(f"[PDF] Image extraction failed (non-fatal): {e}")

    # Award XP for uploading
    current_user.xp += 10
    current_user.level = (current_user.xp // 100) + 1
    db.commit()

    return db_topic


@router.get("/", response_model=list[TopicResponse])
async def list_topics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all topics for the current user."""
    return db.query(Topic).filter(Topic.user_id == current_user.id).order_by(Topic.created_at.desc()).all()


@router.get("/{topic_id}", response_model=TopicResponse)
async def get_topic(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific topic."""
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.user_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.get("/{topic_id}/summary")
async def get_summary(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the AI-generated summary for a topic."""
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.user_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    if not topic.summary and topic.pdf_text:
        try:
            topic.summary = await summarize_text(topic.pdf_text)
            db.commit()
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to generate summary")

    return {"topic_id": topic.id, "title": topic.title, "summary": topic.summary}


@router.get("/{topic_id}/pdf-images/{filename}")
async def serve_pdf_image(
    topic_id: int,
    filename: str,
):
    """Serve an image extracted from a topic's PDF.
    No auth required — filenames are namespaced by topic_id to prevent guessing.
    """
    # Basic path-traversal guard: filename must start with the topic_id prefix
    safe = (
        filename.startswith(f"{topic_id}_")
        and ".." not in filename
        and "/" not in filename
        and "\\" not in filename
    )
    if not safe:
        raise HTTPException(status_code=403, detail="Forbidden")

    images_dir = os.path.join(UPLOAD_DIR, "images")
    file_path = os.path.join(images_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")

    ext = filename.rsplit(".", 1)[-1].lower()
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "gif": "image/gif", "webp": "image/webp"}.get(ext, "image/png")
    return FileResponse(path=file_path, media_type=mime)


@router.get("/{topic_id}/pdf")
async def serve_pdf(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Serve the original uploaded PDF file for inline viewing (used by citation links)."""
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.user_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if not topic.pdf_filename:
        raise HTTPException(status_code=404, detail="No PDF uploaded for this topic")

    file_path = os.path.join(UPLOAD_DIR, topic.pdf_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=\"{topic.pdf_filename}\"",
            # Allow browser to open in a PDF viewer tab
            "X-Content-Type-Options": "nosniff",
        }
    )


# ── Reviewer Endpoints ────────────────────────────────

from services.scraper_service import scrape_academic_articles

@router.post("/{topic_id}/generate-reviewer")
async def generate_reviewer_endpoint(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a full comprehensive reviewer for a topic using AI."""
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.user_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # If reviewer content already exists, save it to history before overwriting
    if topic.reviewer_content:
        history_entry = ReviewerHistory(
            topic_id=topic.id,
            content=topic.reviewer_content
        )
        db.add(history_entry)
        db.commit()

    source_text = topic.pdf_text or ""
    
    # Pre-fetch 5 academic articles to act as core references
    references = []
    try:
        references = scrape_academic_articles(topic.title, max_results=5)
    except Exception as e:
        print(f"Failed to fetch references for AI generation: {e}")

    # Pre-fetch media to embed in the AI output
    media_assets = []
    try:
        from routers.media import get_youtube_videos, get_images
        yt_vids = await get_youtube_videos(topic.title, max_results=2)
        web_images = await get_images(topic.title, max_results=3)

        for vid in yt_vids:
            media_assets.append({"type": "youtube", "url": vid['url'], "embed_url": vid.get('embed_url', ''), "title": vid.get('title', 'Video')})
        for img in web_images:
            media_assets.append({"type": "image", "url": img['url'], "title": img.get('title', 'Diagram')})
    except Exception as e:
        print(f"Failed to fetch media assets: {e}")

    # Inject PDF-extracted images (highest priority — placed using preceding-text hints)
    if topic.pdf_images:
        try:
            pdf_img_records = json.loads(topic.pdf_images)
            for rec in pdf_img_records:
                media_assets.append({
                    "type": "pdf_image",
                    "url": f"/api/topics/{topic.id}/pdf-images/{rec['filename']}",
                    "title": f"Figure from page {rec['page']}",
                    "context_text": rec.get("context_text", ""),
                })
            print(f"[Reviewer] Injecting {len(pdf_img_records)} PDF image(s) for topic {topic.id}")
        except Exception as e:
            print(f"Failed to load PDF images for reviewer generation: {e}")

    try:
        reviewer_content = await generate_full_reviewer(
            topic_title=topic.title,
            source_text=source_text,
            references=references,
            media_assets=media_assets
        )
        topic.reviewer_content = reviewer_content
        # Award XP for generating reviewer
        current_user.xp += 15
        current_user.level = (current_user.xp // 100) + 1
        db.commit()
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Gemini API rate limit reached. Please wait and try again.")
        raise HTTPException(status_code=500, detail=f"Failed to generate reviewer: {error_msg}")

    return {
        "topic_id": topic.id,
        "title": topic.title,
        "reviewer_content": topic.reviewer_content,
    }


@router.get("/{topic_id}/reviewer")
async def get_reviewer(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the full reviewer content for a topic."""
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.user_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    return {
        "topic_id": topic.id,
        "title": topic.title,
        "reviewer_content": topic.reviewer_content or "",
        "has_pdf": bool(topic.pdf_filename),
        "pdf_filename": topic.pdf_filename or "",
    }


@router.put("/{topic_id}/reviewer")
async def update_reviewer_content(
    topic_id: int,
    content: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the full reviewer content (used for saving formatting/highlights)."""
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.user_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    new_content = content.get("reviewer_content")
    if new_content is not None:
        topic.reviewer_content = new_content
        db.commit()

    return {"message": "Reviewer content updated successfully"}


@router.get("/{topic_id}/history")
async def get_reviewer_history(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get history of generated reviewers for a topic."""
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.user_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    history = db.query(ReviewerHistory).filter(ReviewerHistory.topic_id == topic_id).order_by(ReviewerHistory.created_at.desc()).all()
    
    return [
        {
            "id": h.id,
            "topic_id": h.topic_id,
            "content": h.content,
            "created_at": h.created_at.isoformat()
        }
        for h in history
    ]


@router.get("/{topic_id}/download-pdf")
async def download_reviewer_pdf(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download the reviewer content as a simple text/markdown file."""
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.user_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    if not topic.reviewer_content:
        raise HTTPException(status_code=404, detail="No reviewer content to download. Generate it first.")

    # Include memory items in the download
    memories = db.query(Memory).filter(Memory.topic_id == topic_id).all()
    memory_section = ""
    if memories:
        memory_section = "\n\n---\n\n# 📌 Your Highlighted Notes\n\n"
        for mem in memories:
            memory_section += f"**Highlight:** \"{mem.highlighted_text}\"\n"
            if mem.note:
                memory_section += f"*Note:* {mem.note}\n"
            memory_section += "\n"

    content = f"# {topic.title} — Study Reviewer\n\n{topic.reviewer_content}{memory_section}"

    # Return as downloadable markdown file
    buffer = io.BytesIO(content.encode("utf-8"))
    filename = f"{topic.title.replace(' ', '_')}_Reviewer.md"

    return StreamingResponse(
        buffer,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )


@router.delete("/{topic_id}")
async def delete_topic(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a topic and all its associated content."""
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.user_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    db.delete(topic)
    db.commit()
    return {"message": "Topic deleted successfully"}
