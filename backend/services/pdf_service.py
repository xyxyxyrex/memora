import fitz  # PyMuPDF
import os


def extract_images_from_bytes(file_bytes: bytes, topic_id: int, upload_dir: str) -> list:
    """
    Extract images from a PDF and save them to upload_dir/images/.

    Returns a list of dicts:
        {
          "page": int,          # 1-based page number
          "idx": int,           # 0-based image index on that page
          "filename": str,      # e.g. "42_p3_0.png"
          "width": int,
          "height": int,
          "context_text": str,  # text on the same page appearing ABOVE the image
        }

    Context matching strategy:
      - For each image, get its bounding-box top edge (y0) using page.get_image_rects().
      - Collect all text blocks (type=0) whose bottom edge (y1) sits at or above that y0.
      - Sort them top-to-bottom and take the last ~500 characters — this is the paragraph
        immediately preceding the figure, giving the AI a precise placement hint.

    Images smaller than 80×80 px are skipped (icons / decoration).
    """
    images_dir = os.path.join(upload_dir, "images")
    os.makedirs(images_dir, exist_ok=True)

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    records = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        img_list = page.get_images(full=True)
        if not img_list:
            continue

        # Get text blocks with bounding boxes for context matching.
        # get_text("blocks") → (x0, y0, x1, y1, text, block_no, block_type)
        # block_type 0 = text, 1 = image
        raw_blocks = page.get_text("blocks")
        text_blocks = [
            (b[0], b[1], b[2], b[3], b[4].strip())
            for b in raw_blocks
            if len(b) >= 7 and b[6] == 0 and b[4].strip()
        ]

        seen_xrefs = set()
        page_img_idx = 0

        for img_info in img_list:
            xref = img_info[0]
            if xref in seen_xrefs:
                continue
            seen_xrefs.add(xref)

            iw, ih = img_info[2], img_info[3]
            # Skip tiny decorative images
            if iw < 80 or ih < 80:
                continue

            try:
                raw = doc.extract_image(xref)
            except Exception:
                continue

            ext = raw.get("ext", "png")
            # Normalise JBIG2 / obscure formats to png so browsers can render them
            if ext not in ("png", "jpg", "jpeg", "gif", "webp"):
                ext = "png"

            fname = f"{topic_id}_p{page_num + 1}_{page_img_idx}.{ext}"
            fpath = os.path.join(images_dir, fname)
            with open(fpath, "wb") as f:
                f.write(raw["image"])

            # ── Context matching ──────────────────────────────────────────
            context = ""
            try:
                rects = page.get_image_rects(xref)
                if rects:
                    img_top = rects[0].y0  # top edge of the image on the page
                    # Only text blocks whose BOTTOM edge is at or above the image top,
                    # i.e. they visually appear before (above) the figure.
                    above = sorted(
                        [(b[1], b[4]) for b in text_blocks if b[3] <= img_top + 8],
                        key=lambda x: x[0],  # sort by y0 (top-to-bottom)
                    )
                    if above:
                        combined = " ".join(t for _, t in above)
                        # Take the last 500 chars — the closest preceding paragraph(s)
                        context = combined[-500:].strip()
            except Exception:
                pass

            records.append({
                "page": page_num + 1,
                "idx": page_img_idx,
                "filename": fname,
                "width": iw,
                "height": ih,
                "context_text": context,
            })
            page_img_idx += 1

    doc.close()
    return records


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text content from a PDF file using PyMuPDF."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")

    doc = fitz.open(file_path)
    text_parts = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if text.strip():
            text_parts.append(f"--- Page {page_num + 1} ---\n{text}")

    doc.close()

    full_text = "\n\n".join(text_parts)

    if not full_text.strip():
        return "[No extractable text found — the PDF may contain scanned images. OCR processing would be needed.]"

    return full_text


def extract_text_from_bytes(file_bytes: bytes, filename: str = "upload.pdf") -> str:
    """Extract text from PDF bytes (for direct upload handling)."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text_parts = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if text.strip():
            text_parts.append(f"--- Page {page_num + 1} ---\n{text}")

    doc.close()

    full_text = "\n\n".join(text_parts)

    if not full_text.strip():
        return "[No extractable text found — the PDF may contain scanned images.]"

    return full_text
