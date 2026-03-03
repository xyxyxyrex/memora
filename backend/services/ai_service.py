from openai import AsyncOpenAI
import json
import traceback
from config import GROQ_API_KEY

# Configure Groq via OpenAI SDK
client = AsyncOpenAI(
  base_url="https://api.groq.com/openai/v1",
  api_key=GROQ_API_KEY, 
)
MODEL_NAME = "llama-3.3-70b-versatile"


async def summarize_text(text: str, max_pages: int = 5) -> str:
    """Summarize text into multi-page reviewer content."""
    prompt = f"""Summarize the following text into a clear, well-organized reviewer with up to {max_pages} sections.
Each section should have a heading and key points in bullet format.
Make it study-friendly and concise.

Text:
{text[:15000]}

Return the summary in markdown format with clear headings and bullet points."""

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful study assistant."},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[AI ERROR] summarize_text failed: {e}")
        traceback.print_exc()
        raise


async def generate_full_reviewer(topic_title: str, source_text: str = "", supplementary_text: str = "", references: list = None, media_assets: list = None) -> str:
    """Generate a comprehensive, full-length study reviewer.
    Returns well-structured markdown content (2000-4000 words)."""

    has_pdf = bool(source_text and source_text.strip())

    source_section = ""
    if has_pdf:
        # Pass full extracted text (page-marked) as the exclusive source
        source_section = f"""

══════════════════════════════════════════════
PRIMARY SOURCE — PDF DOCUMENT (AUTHORITATIVE)
══════════════════════════════════════════════
The following text was extracted directly from the student's uploaded PDF document.
It is the SOLE authoritative source for this reviewer.

MANDATORY RULES when this block is present:
1. Every factual claim MUST originate from this PDF text. Do NOT add facts from outside knowledge.
2. Whenever you state something derived from the PDF, append an inline page citation immediately after the sentence using EXACTLY this format: [p. N]  (e.g. "Polymorphism allows... [p. 4]").
3. Use the "--- Page N ---" markers below to identify which page each passage came from.
4. If a concept spans multiple pages cite the range: [p. 3–5].
5. In the References section list the PDF as: "{topic_title} — Uploaded Course Material (PDF)".

PDF TEXT:
{source_text[:55000]}
════════════════════════════════════════════"""
    if supplementary_text:
        source_section += f"\n\nSupplementary material (secondary — use only to clarify, NOT to introduce new facts):\n{supplementary_text[:8000]}"

    references_section = ""
    if references:
        ref_text = "\n".join([f"- {r['title']} ({r.get('source', '')}). Abstract: {r.get('snippet', '')}" for r in references])
        cite_note = "Cite these only to SUPPORT what the PDF already says." if has_pdf else "Use these as primary sources and cite them in APA format."
        references_section = f"""

ADDITIONAL ACADEMIC SOURCES ({cite_note}):
{ref_text}

{"Do NOT let these override or contradict the PDF content above." if has_pdf else "Include a References section at the end in APA format."}"""

    media_section = ""
    if media_assets:
        media_text = ""
        pdf_image_lines = ""
        for m in media_assets:
            if m['type'] == 'youtube':
                embed_url = m.get('embed_url') or m['url']
                media_text += f"- YouTube Video Embed Link: {embed_url} (Title: {m['title']})\n"
            elif m['type'] == 'image':
                media_text += f"- Image URL: {m['url']} (Title: {m['title']})\n"
            elif m['type'] == 'pdf_image':
                # Images extracted directly from the uploaded PDF.
                # Each carries a context_text: the text immediately preceding the image
                # on its source page—use this to determine WHERE to embed it in the reviewer.
                hint = ""
                if m.get('context_text'):
                    snippet = m['context_text'][:250].replace('\n', ' ').strip()
                    hint = f'\n     PLACEMENT: embed this image immediately after the sentence/paragraph that discusses: "{snippet}"'
                pdf_image_lines += (
                    f"- PDF Figure URL: {m['url']} (Source: {m['title']}){hint}\n"
                )

        if pdf_image_lines:
            media_text = (
                "── PDF FIGURES (from the uploaded document — embed these with highest priority) ──\n"
                + pdf_image_lines
                + ("─────────────────────────────────────────────────────────────────────\n" if media_text else "")
                + media_text
            )

        media_section = f"""

CRITICAL INSTRUCTION: You have been provided with the following media assets related to the topic.
You MUST embed them beautifully throughout your explanation exactly where they make the most sense. Do NOT just list them at the end. Use them visually!

Media to Embed:
{media_text}
To embed ANY image (PDF figure or web image), use markdown: `![Descriptive caption](IMAGE_URL_HERE)`
For PDF figures: the PLACEMENT hint tells you exactly which paragraph of the reviewer they should follow. Honour it precisely.
To embed a YouTube video, use the HTML iframe strictly: `<iframe width="100%" height="315" src="INSERT_YOUTUBE_EMBED_LINK_HERE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` (replace INSERT_YOUTUBE_EMBED_LINK_HERE with the actual Embed Link from the assets).
BEFORE embedding any media, you must explicitly introduce it in the context of your explanation, for example: 'The diagram below illustrates...' or 'This video effectively explains...'
"""

    prompt = f"""You are an expert academic tutor. Create a comprehensive, full-length STUDY REVIEWER about: {topic_title}

The reviewer should be a complete study guide that a student can use to master this topic.
{source_section}{references_section}{media_section}

Structure the reviewer with these sections (use markdown formatting):

# {topic_title} — Study Reviewer

## 1. Overview & Introduction
Provide a clear introduction and overview of the topic. Explain why it matters and what the student will learn.

## 2. Key Concepts & Definitions
List and explain all important terms, definitions, and core concepts. Use bold for terms.

## 3. Detailed Explanation
Go deep into the topic with thorough explanations, organized into logical subsections.
Use subheadings (###) for each major subtopic.
Include examples where helpful.

## 4. Important Relationships & Connections
Explain how different concepts relate to each other. Include cause-and-effect relationships.

## 5. Key Formulas / Rules / Principles
If applicable, list important formulas, rules, or principles. Use clear formatting.

## 6. Common Misconceptions
Address frequent misunderstandings about this topic.

## 7. Practice Application
Provide 2-3 worked examples or scenarios that demonstrate the concepts.

## 8. Summary & Quick Review
Bullet-point summary of the most important takeaways.

## 9. References
{"List the PDF as the primary source first, then any academic references used." if has_pdf else "(If academic sources were provided, list them here in APA format)."}

Requirements:
- Write 4000-7000 words total — do NOT truncate or summarise prematurely. Cover ALL content.
- Use proper markdown with headers, bold, italic, bullet points, and numbered lists
- Make it educational, clear, and engaging
- Include real-world examples and analogies where helpful
- Make it suitable for highlighting and note-taking
{"- CRITICAL: Every factual claim MUST be followed immediately by a [p. N] citation (e.g. [p. 4]) referencing the PDF page it came from." if has_pdf else "- If source material or academic sources are provided, base the content on them and cite them in the text."}
{"- EXHAUSTIVENESS: You MUST cover every topic, subtopic, definition, process, rule, formula, diagram description, and example present in the PDF. Do not skip, merge, or gloss over any section. If the PDF covers 10 subtopics, the reviewer must address all 10 in full detail." if has_pdf else ""}
- If media assets are provided, actively EMBED them into the body text where relevant."""

    try:
        print(f"[AI] Generating full reviewer for topic: {topic_title}")
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=8192,
        )
        content = response.choices[0].message.content
        print(f"[AI] Generated reviewer: {len(content)} chars")
        return content
    except Exception as e:
        print(f"[AI ERROR] generate_full_reviewer failed: {e}")
        traceback.print_exc()
        raise


async def generate_flashcards(text: str, topic_title: str, count: int = 10, memory_items: list = None) -> list[dict]:
    """Generate flashcards from text or topic. Memory items bias toward user-highlighted content."""
    source = text[:10000] if text else f"the topic: {topic_title}"

    memory_section = ""
    if memory_items:
        highlights = "\n".join([f"- \"{m['highlighted_text']}\" (Note: {m.get('note', '')})" for m in memory_items[:20]])
        memory_section = f"""

IMPORTANT: The student has highlighted these as important concepts. Generate at least half of the flashcards
based on these highlighted items:
{highlights}"""

    prompt = f"""Generate exactly {count} flashcards about {topic_title}.
Each flashcard should have a question and a concise answer.
Vary the difficulty (easy, medium, hard).

{"Source material: " + source if text else "Use your knowledge about this topic."}{memory_section}

Return ONLY a valid JSON array with this exact format, no markdown code fences, no extra text:
[
  {{"question": "What is...?", "answer": "It is...", "difficulty": "easy"}},
  {{"question": "How does...?", "answer": "By...", "difficulty": "medium"}}
]"""

    try:
        print(f"[AI] Generating {count} flashcards for topic: {topic_title}")
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a strict JSON returning agent."},
                {"role": "user", "content": prompt}
            ]
        )
        response_text = response.choices[0].message.content.strip()
        print(f"[AI] Raw response length: {len(response_text)} chars")

        # Clean markdown code fences if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first line (```json) and last line (```)
            response_text = "\n".join(lines[1:])
            if response_text.rstrip().endswith("```"):
                response_text = response_text.rstrip()[:-3].rstrip()

        result = json.loads(response_text)
        print(f"[AI] Successfully parsed {len(result)} flashcards")
        return result
    except json.JSONDecodeError as e:
        print(f"[AI ERROR] JSON parse failed: {e}")
        print(f"[AI ERROR] Raw text was: {response_text[:500]}")
        traceback.print_exc()
        raise ValueError(f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        print(f"[AI ERROR] generate_flashcards failed: {e}")
        traceback.print_exc()
        raise


async def generate_quiz_questions(
    text: str,
    topic_title: str,
    count: int = 10,
    types: list[str] = None,
    memory_items: list = None
) -> list[dict]:
    """Generate quiz questions in multiple formats. Memory items bias toward user-highlighted content."""
    if types is None:
        types = ["multiple_choice", "identification", "enumeration", "modified_true_false"]

    source = text[:10000] if text else f"the topic: {topic_title}"
    types_str = ", ".join(types)

    memory_section = ""
    if memory_items:
        highlights = "\n".join([f"- \"{m['highlighted_text']}\" (Note: {m.get('note', '')})" for m in memory_items[:20]])
        memory_section = f"""

IMPORTANT: The student has highlighted these as important concepts. Generate at least half of the questions
based on these highlighted items:
{highlights}"""

    prompt = f"""Generate exactly {count} quiz questions about {topic_title}.
Use a mix of these question types: {types_str}

{"Source material: " + source if text else "Use your knowledge about this topic."}{memory_section}

For each question, follow these strict rules per type:

1. multiple_choice
   - question_text: the question
   - choices: JSON string of exactly 4 options e.g. '{{"A":"opt1","B":"opt2","C":"opt3","D":"opt4"}}'
   - correct_answer: just the letter e.g. "A"
   - statement_a, statement_b: empty string ""

2. identification
   - Use ONLY when the answer is a single term, name, word, or short phrase (ONE thing).
   - question_text: the question (e.g. "What is the unit of force?")
   - choices: empty string ""
   - correct_answer: one single term or short phrase (e.g. "Newton")
   - statement_a, statement_b: empty string ""
   - DO NOT use identification if the answer requires listing more than one item.

3. enumeration
   - Use when the answer is a LIST of multiple items, areas, steps, examples, or elements.
   - EVERY enumeration question_text MUST contain a definite count. Use exactly one of:
       a) Specific number  → "List 3 branches of Physics", "Name 2 examples of X", "Give 4 steps of Y"
       b) Exhaustive (all) → "List all layers of the OSI model", "Name all stages of mitosis"
          Use (b) ONLY when asking for the complete, well-known set is the natural intent.
   - NEVER use vague phrasing with no definite count:
       ✗ "What are the main types of..."  ✗ "List the main..."  ✗ "Name some examples of..."
   - question_text: must contain a specific number OR the word "all"
     (e.g. "List 3 main areas of application of Physics in everyday life")
   - choices: empty string ""
   - correct_answer: ALL valid items separated by commas
     (e.g. "Technology, Medicine, Transportation, Energy Production")
   - statement_a, statement_b: empty string ""
   - For "List N of M" questions, correct_answer must list ALL M valid items so the grader
     can accept any valid combination of N.

4. modified_true_false — ALWAYS use this exact structure, no exceptions:
   - question_text: ALWAYS set this to exactly "Select from the choices below:" — nothing else
   - statement_a: a meaningful self-contained statement about the topic (may be true or false)
   - statement_b: another meaningful self-contained statement about the topic (may be true or false)
   - choices: ALWAYS this exact JSON string:
     '{{"A":"Only Statement A is correct","B":"Only Statement B is correct","C":"Both statements are correct","D":"Both statements are incorrect"}}'
   - correct_answer: "A", "B", "C", or "D" based on the truth of your two statements
   - explanation: explain why each statement is true or false

Provide for every question: question_type, question_text, choices, correct_answer, explanation, statement_a, statement_b

CRITICAL — modified_true_false correct_answer distribution:
  You MUST vary correct_answer across A, B, C, D. Do NOT default to C.
  Deliberately make some statements false so answers of A, B, and D also appear.
  Aim for a roughly even spread: about 25%% each of A, B, C, D across all modified_true_false questions.

Return ONLY a valid JSON array, no markdown code fences, no extra text.
Example (multiple_choice):
  {{"question_type": "multiple_choice", "question_text": "What is...?", "choices": "{{\\"A\\":\\"opt1\\",\\"B\\":\\"opt2\\",\\"C\\":\\"opt3\\",\\"D\\":\\"opt4\\"}}", "correct_answer": "A", "explanation": "Because...", "statement_a": "", "statement_b": ""}}
Example (modified_true_false where only B is correct):
  {{"question_type": "modified_true_false", "question_text": "Select from the choices below:", "choices": "{{\\"A\\":\\"Only Statement A is correct\\",\\"B\\":\\"Only Statement B is correct\\",\\"C\\":\\"Both statements are correct\\",\\"D\\":\\"Both statements are incorrect\\"}}", "correct_answer": "B", "explanation": "Statement A is false because... Statement B is true because...", "statement_a": "An INCORRECT statement about X", "statement_b": "A correct statement about Y"}}"""

    try:
        print(f"[AI] Generating {count} quiz questions for topic: {topic_title}")

        # ── Batch generation to avoid token-limit truncation ──────────────────
        # Each question is ~350 tokens of JSON output; 8192-token output cap on
        # llama-3.3-70b-versatile means ~23 questions per call safely.
        BATCH_SIZE = 20
        all_questions: list[dict] = []

        batches = []
        remaining = count
        while remaining > 0:
            batches.append(min(BATCH_SIZE, remaining))
            remaining -= BATCH_SIZE

        for batch_idx, batch_count in enumerate(batches):
            # Build exclusion list so subsequent batches don't repeat earlier questions
            exclusion_note = ""
            if all_questions:
                already = "\n".join(
                    f"- {q.get('question_text', '')} | {q.get('statement_a', '')} | {q.get('statement_b', '')}"
                    for q in all_questions
                )
                exclusion_note = (
                    f"\n\nDO NOT repeat any of these already-generated questions:\n{already}\n"
                    "Generate completely new questions on different aspects of the topic."
                )

            header = (
                f"Generate exactly {batch_count} quiz questions"
                + (f" (batch {batch_idx + 1} of {len(batches)}; vary types evenly)" if len(batches) > 1 else "")
            )
            batch_prompt = prompt.replace(
                f"Generate exactly {count} quiz questions",
                header,
            ) + exclusion_note
            response = await client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a strict JSON returning agent."},
                    {"role": "user", "content": batch_prompt},
                ],
                max_tokens=8192,
            )
            response_text = response.choices[0].message.content.strip()
            print(f"[AI] Batch {batch_idx + 1}: raw length {len(response_text)} chars")

            # Strip markdown fences
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:])
                if response_text.rstrip().endswith("```"):
                    response_text = response_text.rstrip()[:-3].rstrip()

            # ── JSON repair: if truncated, close the last complete object ──
            try:
                batch_result = json.loads(response_text)
            except json.JSONDecodeError:
                # Find the last complete question object (ends with "}")
                last_brace = response_text.rfind("}")
                if last_brace != -1:
                    repaired = response_text[: last_brace + 1].rstrip().rstrip(",") + "\n]"
                    try:
                        batch_result = json.loads(repaired)
                        print(f"[AI] Batch {batch_idx + 1}: repaired truncated JSON, got {len(batch_result)} questions")
                    except json.JSONDecodeError as e2:
                        raise ValueError(f"AI returned invalid JSON (even after repair): {e2}")
                else:
                    raise ValueError("AI response contained no valid JSON objects")

            all_questions.extend(batch_result)

        print(f"[AI] Total questions generated: {len(all_questions)}")
        return all_questions
    except json.JSONDecodeError as e:
        print(f"[AI ERROR] JSON parse failed: {e}")
        print(f"[AI ERROR] Raw text was: {response_text[:500]}")
        traceback.print_exc()
        raise ValueError(f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        print(f"[AI ERROR] generate_quiz_questions failed: {e}")
        traceback.print_exc()
        raise


async def grade_open_answers(questions: list[dict]) -> list[dict]:
    """Grade open-ended quiz answers (identification / enumeration) with typo and close detection.

    questions: list of {question_text, correct_answer, user_answer, question_type}
    returns:   list of {verdict: 'correct' | 'typo' | 'close' | 'incorrect'} in same order.
    """
    if not questions:
        return []

    items_json = json.dumps(
        [
            {
                "i": i,
                "question": q["question_text"],
                "correct": q["correct_answer"],
                "user": q["user_answer"],
            }
            for i, q in enumerate(questions)
        ],
        ensure_ascii=False,
    )

    prompt = f"""You are a strict quiz grader. Grade each student answer and return one verdict per item.

Verdict rules:
- "correct"   : semantically correct; minor capitalisation / punctuation / article differences are fine.
- "typo"      : clearly the right answer but has 1-3 character typos, letter swaps, or a missing/extra letter
                 (e.g. "Encapeulation" for "Encapsulation", "polymorphsm" for "polymorphism").
                 Verdict "typo" still counts as a correct answer.
- "close"     : partially correct — right idea but missing a key word, or uses a near-synonym that is not exact
                 (e.g. "input checking" for "Input Validation", lists 3 out of 4 required items).
- "incorrect" : wrong, blank, or unrelated.

For enumeration questions:
- Order does not matter; accept minor typos in individual items.
- If the question asks for N items from a larger valid set (e.g. "List 5 numbers from 1-10",
  "Name any 3 examples of X"), treat ANY valid combination of N correct items as "correct",
  not just the specific items stored in the expected answer. Use the question text and topic
  knowledge to judge whether the student's items belong to the valid set.

Items:
{items_json}

Return ONLY a JSON array indexed to match the input, no markdown, no extra text:
[{{"i": 0, "verdict": "correct"}}, {{"i": 1, "verdict": "typo"}}, ...]"""

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a strict JSON returning agent."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=512,
        )
        response_text = response.choices[0].message.content.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:])
            if response_text.rstrip().endswith("```"):
                response_text = response_text.rstrip()[:-3].rstrip()
        graded = json.loads(response_text)
        graded_sorted = sorted(graded, key=lambda x: x["i"])
        return [{"verdict": g["verdict"]} for g in graded_sorted]
    except Exception as e:
        print(f"[AI ERROR] grade_open_answers failed, falling back to string match: {e}")
        traceback.print_exc()
        return [
            {"verdict": "correct" if q["user_answer"].strip().lower() == q["correct_answer"].strip().lower() else "incorrect"}
            for q in questions
        ]
