import json

from .state import GraphState
from .tools import write_emissions_tool, call_claude_tool
from rag.guardrails import output_guardrail, GuardrailError

EMISSIONS_SYSTEM = """\
You are an expert emissions accountant and ESG auditor. Analyze the following documents \
and extract ALL emissions data.

For each emissions source found, produce a structured record with:
- scope (1, 2, or 3)
- category (specific activity category per GHG Protocol)
- tco2e (tonnes CO2 equivalent — estimate if not explicit; null if completely missing)
- confidence: "high" if directly measured/audited, "medium" if estimated from reliable proxies, \
"low" if rough estimate
- status: "ok" if complete, "gap" if missing or incomplete, "outlier" if anomalous
- esrs_reference (e.g. "ESRS E1-6")
- gri_reference (e.g. "GRI 305-1")
- tcfd_reference (e.g. "Metrics & Targets")
- issb_reference (e.g. "IFRS S2 C6")
- narrative: brief factual sentence describing the source

Also flag missing ESRS E1 required data as gap records (tco2e: null).
Respond ONLY with a valid JSON array. No markdown."""


async def emissions_analysis_agent(state: GraphState) -> GraphState:
    ingested = state.get("ingested_docs", [])
    relevant = [
        d for d in ingested
        if d["category"] in ("emissions_report", "financial", "sustainability")
    ] or ingested

    excerpts = "\n\n---\n\n".join(
        f"FILE: {d['filename']}\n{d['extracted_text'][:8000]}" for d in relevant
    )
    raw = call_claude_tool(
        EMISSIONS_SYSTEM,
        f"Company: {state.get('company_name', '')}, Industry: {state.get('industry', '')}\n\nDocuments:\n{excerpts}",
        tier="strong",
    )

    try:
        checked = output_guardrail(raw, expected_type="json_array")
        records: list[dict] = json.loads(checked)
    except (GuardrailError, json.JSONDecodeError):
        records = []

    if records:
        write_emissions_tool(state.get("company_id", 1), records)

    return {**state, "emissions_data": records, "current_step": "emissions_done"}
