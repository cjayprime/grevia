from typing import TypedDict


class GraphState(TypedDict, total=False):
    # Company context
    company_id: int
    company_name: str
    workspace_id: int
    industry: str
    region: str
    standard: str

    # Source documents
    hot_store_ids: list[int]
    document_chunks: list[dict]

    # Pipeline stage outputs
    research_data: dict
    ingested_docs: list[dict]
    emissions_data: list[dict]
    policy_data: list[dict]

    # Per-pillar breakdown outputs (list of dicts matching BreakdownOutput)
    env_breakdowns: list[dict]
    social_breakdowns: list[dict]
    gov_breakdowns: list[dict]

    # Final merged output
    materiality_data: dict
    materiality_assessment_id: int

    errors: list[str]
    current_step: str
