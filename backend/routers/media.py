from fastapi import APIRouter, HTTPException
import requests
import re
from urllib.parse import quote_plus
import json

router = APIRouter()

@router.get("/youtube")
async def get_youtube_videos(query: str, max_results: int = 3):
    """Scrape YouTube videos, filtering out Shorts and brainrot content."""
    # sp=EgIQAw%3D%3D = medium duration filter (4-20 min) — excludes Shorts entirely
    search_query = quote_plus(f"{query} explained in depth")
    search_url = f"https://www.youtube.com/results?search_query={search_query}&sp=EgIQAw%3D%3D"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        response = requests.get(search_url, headers=headers, timeout=10)
        response.raise_for_status()
        html = response.text

        results = []
        seen_ids = set()

        # Parse ytInitialData for structured video data (title + duration)
        yt_match = re.search(r'var ytInitialData = (\{.*?\});</script>', html, re.DOTALL)
        if yt_match:
            try:
                data = json.loads(yt_match.group(1))
                sections = (
                    data.get("contents", {})
                    .get("twoColumnSearchResultsRenderer", {})
                    .get("primaryContents", {})
                    .get("sectionListRenderer", {})
                    .get("contents", [])
                )
                for section in sections:
                    items = section.get("itemSectionRenderer", {}).get("contents", [])
                    for item in items:
                        renderer = item.get("videoRenderer", {})
                        if not renderer:
                            continue
                        vid_id = renderer.get("videoId", "")
                        if not vid_id or len(vid_id) != 11 or vid_id in seen_ids:
                            continue

                        title_runs = renderer.get("title", {}).get("runs", [])
                        title = title_runs[0].get("text", "") if title_runs else ""

                        # Skip if title signals it's a Short or brainrot content
                        title_lower = title.lower()
                        if any(tag in title_lower for tag in ["#shorts", "#short", "#sigma", "#brainrot"]):
                            continue

                        # Skip by duration — Shorts are < 2 minutes
                        duration_text = renderer.get("lengthText", {}).get("simpleText", "")
                        if duration_text:
                            parts = duration_text.split(":")
                            try:
                                if len(parts) == 2:
                                    total_seconds = int(parts[0]) * 60 + int(parts[1])
                                elif len(parts) == 3:
                                    total_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                                else:
                                    total_seconds = 999
                                if total_seconds < 120:
                                    continue
                            except ValueError:
                                pass

                        seen_ids.add(vid_id)
                        results.append({
                            "id": vid_id,
                            "title": title,
                            "url": f"https://www.youtube.com/watch?v={vid_id}",
                            "embed_url": f"https://www.youtube.com/embed/{vid_id}"
                        })
                        if len(results) >= max_results:
                            break
                    if len(results) >= max_results:
                        break
            except (json.JSONDecodeError, KeyError) as e:
                print(f"YouTube JSON parse error: {e}")

        # Fallback: bare regex (no title filtering possible)
        if not results:
            for m in re.finditer(r'"videoId":"([a-zA-Z0-9_-]{11})"', html):
                vid_id = m.group(1)
                if vid_id not in seen_ids:
                    seen_ids.add(vid_id)
                    results.append({
                        "id": vid_id,
                        "title": "",
                        "url": f"https://www.youtube.com/watch?v={vid_id}",
                        "embed_url": f"https://www.youtube.com/embed/{vid_id}"
                    })
                if len(results) >= max_results:
                    break

        return results
    except Exception as e:
        print(f"YouTube scrape error: {e}")
        return []


@router.get("/images")
async def get_images(query: str, max_results: int = 3):
    """Fetch educational images/diagrams from Wikimedia Commons."""
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "prop": "pageimages",
        "generator": "search",
        "gsrsearch": f"{query} diagram OR graph OR illustration",
        "gsrlimit": max_results,
        "pithumbsize": 800
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        images = []
        pages = data.get("query", {}).get("pages", {})
        for page_id, page_info in pages.items():
            thumbnail_url = page_info.get("thumbnail", {}).get("source")
            title = page_info.get("title", "")
            if thumbnail_url:
                images.append({
                    "title": title,
                    "url": thumbnail_url
                })
        
        return images
    except Exception as e:
        print(f"Wikimedia scrape error: {e}")
        return []
