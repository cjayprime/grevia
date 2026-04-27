
# class GraphState(TypedDict, total=False):
#     # Company context
#     company_id: int
#     # company_name: str
#     workspace_id: int
#     # industry: str
#     # region: str
#     # standard: str

#     # Source documents
#     hot_store_ids: list[int]
#     document_chunks: list[dict]

#     # Pipeline stage outputs
#     # research_data: dict
#     # ingested_docs: list[dict]
#     # emissions_data: list[dict]
#     # policy_data: list[dict]

#     # Per-pillar breakdown outputs (list of dicts matching BreakdownOutput)
#     # env_breakdowns: list[dict]
#     # social_breakdowns: list[dict]
#     # gov_breakdowns: list[dict]

#     # Final merged output
#     # materiality_data: dict
#     materiality_assessment_id: int

#     errors: list[str]
#     current_step: str




# ---------------------------------------------------------------------------
# Response parser — validates raw JSON list against BreakdownOutput
# ---------------------------------------------------------------------------

# def _coerce_decimal(v: Any) -> Any:
#     """Allow the LLM to return floats where Decimal is expected."""
#     if isinstance(v, (int, float)):
#         try:
#             return Decimal(str(v))
#         except InvalidOperation:
#             return v
#     return v


# def parse_breakdowns(raw: str) -> list[dict]:
#     """
#     Parse the LLM JSON response into a list of validated BreakdownOutput dicts.
#     Returns whatever validates; skips invalid items and logs them.
#     """
#     # Strip markdown fences if present
#     text = raw.strip()
#     if text.startswith("```"):
#         text = text.split("\n", 1)[-1]
#         text = text.rsplit("```", 1)[0]

#     try:
#         items = json.loads(text)
#     except json.JSONDecodeError:
#         return []

#     if not isinstance(items, list):
#         items = [items]

#     results: list[dict] = []
#     for item in items:
#         if not isinstance(item, dict):
#             continue
#         # Coerce float scores to Decimal
#         for score_field in ("financial_materiality_score", "impact_materiality_score"):
#             if score_field in item:
#                 item[score_field] = _coerce_decimal(item[score_field])
#         try:
#             validated = BreakdownOutput.model_validate(item)
#             results.append(validated.model_dump())
#         except ValidationError:
#             pass

#     return results
