from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Topic, Article
from schemas import ArticleResponse, ArticleScrapeRequest
from routers.auth import get_current_user
from services.scraper_service import scrape_academic_articles

router = APIRouter()


@router.post("/scrape", response_model=list[ArticleResponse])
async def scrape_articles_endpoint(
    request: ArticleScrapeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Scrape academic articles related to a topic."""
    topic = db.query(Topic).filter(
        Topic.id == request.topic_id,
        Topic.user_id == current_user.id
    ).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    query = request.query or topic.title

    try:
        articles_data = scrape_academic_articles(query, request.max_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

    # Save to database
    created_articles = []
    for article in articles_data:
        db_article = Article(
            topic_id=topic.id,
            title=article["title"],
            url=article["url"],
            pdf_url=article.get("pdf_url", ""),
            source=article.get("source", ""),
            snippet=article.get("snippet", ""),
        )
        db.add(db_article)
        created_articles.append(db_article)

    # Award XP
    current_user.xp += 5
    current_user.level = (current_user.xp // 100) + 1
    db.commit()

    for article in created_articles:
        db.refresh(article)

    return created_articles


@router.get("/topic/{topic_id}", response_model=list[ArticleResponse])
async def get_articles(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all articles for a topic."""
    topic = db.query(Topic).filter(
        Topic.id == topic_id,
        Topic.user_id == current_user.id
    ).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    return db.query(Article).filter(Article.topic_id == topic_id).all()
