from .state import GraphState
from .tools import (
    read_hot_store_tool,
    update_doc_category_tool,
    update_doc_description_tool,
    call_claude_tool,
)

CLASSIFY_SYSTEM = """\
Classify the document into one of these categories:
financial, policy, emissions_report, legal, sustainability, other.
Respond with ONLY the single category word."""

DESCRIBE_SYSTEM = """\
Produce a detailed description of this document for an ESG analyst. Include:
- Document type and purpose
- Key topics, metrics, and data points covered
- Relevant ESRS/GRI/TCFD references if identifiable
- Time periods and geographic scope mentioned
- Notable findings, risks, or gaps

Write 1-2 paragraphs. Be specific enough that a reader can decide whether to \
consult the full document without opening it."""


async def document_ingestion_agent(state: GraphState) -> GraphState:
    raw_docs = read_hot_store_tool(state.get("hot_store_ids", []))
    ingested: list[dict] = []
    for doc in raw_docs:
        excerpt = doc["extracted_text"][:3000]
        category = (
            call_claude_tool(
                CLASSIFY_SYSTEM,
                f"Filename: {doc['filename']}\n\nContent excerpt:\n{excerpt}",
            )
            .strip()
            .lower()
        )
        update_doc_category_tool(int(doc["id"]), category)

        description = call_claude_tool(
            DESCRIBE_SYSTEM,
            f"Filename: {doc['filename']}\n\n{doc['extracted_text'][:6000]}",
        )
        update_doc_description_tool(int(doc["id"]), description)

        summary = call_claude_tool(
            "Summarise this document in 3-5 sentences for an ESG analyst.",
            f"Filename: {doc['filename']}\n\n{excerpt}",
        )
        ingested.append(
            {
                "id": doc["id"],
                "filename": doc["filename"],
                "file_type": doc["file_type"],
                "category": category,
                "extracted_text": doc["extracted_text"],
                "summary": summary,
                "detailed_description": description,
            }
        )

    return {**state, "ingested_docs": ingested, "current_step": "ingestion_done"}
