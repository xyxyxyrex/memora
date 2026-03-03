import requests
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
import time


def scrape_academic_articles(query: str, max_results: int = 5) -> list[dict]:
    """
    Scrape publicly accessible academic article metadata with PDF download links.
    Uses Semantic Scholar API (free, no key needed) with openAccessPdf field.
    Falls back to CrossRef + Unpaywall for PDF links.
    """
    articles = []

    # Use Semantic Scholar API (free, open access) with PDF field
    try:
        url = f"https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            "query": query,
            "limit": max_results,
            "fields": "title,url,abstract,venue,year,openAccessPdf,externalIds",
            "openAccessPdf": ""  # Only get papers with open access PDFs when possible
        }
        headers = {"User-Agent": "LearningCompanion/1.0 (Academic Research Tool)"}

        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        for paper in data.get("data", []):
            pdf_url = ""
            open_access = paper.get("openAccessPdf")
            if open_access and isinstance(open_access, dict):
                pdf_url = open_access.get("url", "")

            # Try to construct PDF URL from DOI via Unpaywall if no direct PDF
            if not pdf_url:
                external_ids = paper.get("externalIds", {})
                doi = external_ids.get("DOI", "") if external_ids else ""
                if doi:
                    try:
                        unpaywall_resp = requests.get(
                            f"https://api.unpaywall.org/v2/{doi}",
                            params={"email": "learning@companion.app"},
                            timeout=5
                        )
                        if unpaywall_resp.status_code == 200:
                            oa_data = unpaywall_resp.json()
                            best_oa = oa_data.get("best_oa_location", {})
                            if best_oa:
                                pdf_url = best_oa.get("url_for_pdf", "") or best_oa.get("url", "")
                    except Exception:
                        pass

            articles.append({
                "title": paper.get("title", "Untitled"),
                "url": paper.get("url", ""),
                "pdf_url": pdf_url,
                "source": paper.get("venue", "Semantic Scholar") or "Semantic Scholar",
                "snippet": (paper.get("abstract", "") or "")[:300],
            })

    except requests.RequestException:
        # Fallback: scrape from CrossRef (also free, open API)
        try:
            url = f"https://api.crossref.org/works"
            params = {
                "query": query,
                "rows": max_results,
                "sort": "relevance"
            }
            headers = {"User-Agent": "LearningCompanion/1.0 (mailto:learning@companion.app)"}

            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()

            for item in data.get("message", {}).get("items", []):
                title = item.get("title", ["Untitled"])[0] if item.get("title") else "Untitled"
                doi_url = item.get("URL", "")
                source = item.get("container-title", [""])[0] if item.get("container-title") else ""
                abstract = item.get("abstract", "")
                # Clean HTML tags from abstract
                if abstract:
                    abstract = BeautifulSoup(abstract, "html.parser").get_text()[:300]

                # Try to get PDF from links
                pdf_url = ""
                for link in item.get("link", []):
                    if link.get("content-type") == "application/pdf":
                        pdf_url = link.get("URL", "")
                        break

                articles.append({
                    "title": title,
                    "url": doi_url,
                    "pdf_url": pdf_url,
                    "source": source,
                    "snippet": abstract,
                })

        except requests.RequestException:
            pass

    return articles
