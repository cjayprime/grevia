

from rag import retrieve, input_guardrail, output_guardrail, llm_judge, GuardrailError
from helpers import chat, download_file, extract_text

ASSISTANT_SYSTEM = """\
You are Grevia Assistant, an expert ESG analyst embedded inside the Grevia sustainability platform.

You have access to the user's company data: emission records, materiality assessments, policy items, \
and uploaded documents retrieved via RAG.

Guidelines:
- Be concise and precise. Quantify where possible (tCO₂e, %, scores).
- Reference ESRS, GRI, TCFD, or ISSB where relevant.
- If data is missing, say so clearly and suggest how to close the gap.
- Never hallucinate figures — only cite data present in the retrieved context.
- Format responses in plain prose. Do not use markdown headers.
- Keep answers under 200 words unless asked for a detailed breakdown."""


async def assistant_agent(
    question: str,
    company_id: int,
    history: list[dict],
    frameworks: list[str] | None = None,
    hot_store_ids: list[int] | None = None,
    session=None,
) -> str:
    # ── Input guardrail ───────────────────────────────────────────────────────
    try:
        question = input_guardrail(question)
    except GuardrailError as exc:
        return f"Your question could not be processed: {exc}"

    context_chunks = await retrieve(
        query=question,
        company_id=company_id,
        top_k=8,
    )
    context_text = "\n\n---\n\n".join(
        f"[{c['source']}]\n{c['text']}" for c in context_chunks
    )

    doc_text = ""
    if hot_store_ids and session:
        from models.hot_store import HotStore

        snippets: list[str] = []
        for did in hot_store_ids:
            doc = session.get(HotStore, did)
            if not doc or doc.deleted:
                continue
            if doc.detailed_description:
                snippets.append(
                    f"[{doc.original_filename}]\n{doc.detailed_description}"
                )
            else:
                data = download_file(doc.file_path)
                text = extract_text(data, doc.file_type)
                if text:
                    snippets.append(f"[{doc.original_filename}]\n{text[:4000]}")
        if snippets:
            doc_text = "\n\n---\n\n".join(snippets)

    fw_line = f"Active frameworks: {', '.join(frameworks)}" if frameworks else ""

    system = ASSISTANT_SYSTEM
    if fw_line:
        system += f"\n\n{fw_line}"

    content_parts = [f"Retrieved context:\n{context_text}"]
    if doc_text:
        content_parts.append(f"Pinned documents:\n{doc_text}")
    content_parts.append(f"Question: {question}")

    messages = [
        *history,
        {"role": "user", "content": "\n\n".join(content_parts)},
    ]

    raw_answer = chat(system=system, messages=messages, tier="default")

    # ── Output guardrail ──────────────────────────────────────────────────────
    try:
        answer = output_guardrail(raw_answer, expected_type="text")
    except GuardrailError:
        answer = "The assistant was unable to generate a valid response. Please rephrase your question."

    # ── LLM-as-judge (non-blocking quality check, logged only) ────────────────
    judge_context = context_text[:3000] + (f"\n\n{doc_text[:1000]}" if doc_text else "")
    try:
        verdict = llm_judge(question, answer, judge_context)
        if verdict.score <= 2 or verdict.hallucination_detected:
            answer += (
                "\n\n⚠️ Note: The quality checker flagged potential issues with this response "
                f"(score {verdict.score}/5). {verdict.rationale}"
            )
    except Exception:
        pass

    return answer
