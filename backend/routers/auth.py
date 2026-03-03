from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserResponse, UserProgressResponse, BadgeResponse
import httpx
from config import SUPABASE_URL, SUPABASE_KEY

router = APIRouter()


async def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Verify Supabase JWT and return the current user."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = authorization.replace("Bearer ", "")

    # Verify token with Supabase
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_KEY,
                }
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            supabase_user = resp.json()
    except httpx.RequestError:
        raise HTTPException(status_code=401, detail="Authentication service unavailable")

    # Find or create user in local DB
    user = db.query(User).filter(User.supabase_id == supabase_user["id"]).first()
    if not user:
        user = User(
            supabase_id=supabase_user["id"],
            email=supabase_user.get("email", ""),
            display_name=supabase_user.get("user_metadata", {}).get("full_name", ""),
            avatar_url=supabase_user.get("user_metadata", {}).get("avatar_url", ""),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user."""
    return current_user


@router.get("/progress", response_model=UserProgressResponse)
async def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's gamification progress."""
    xp_per_level = 100
    xp_to_next = xp_per_level - (current_user.xp % xp_per_level)

    badges = [
        BadgeResponse(
            id=b.id,
            name=b.name,
            description=b.description,
            icon=b.icon,
            earned_at=b.earned_at
        )
        for b in current_user.badges
    ]

    return UserProgressResponse(
        xp=current_user.xp,
        level=current_user.level,
        badges=badges,
        xp_to_next_level=xp_to_next,
    )
