import os
from pprint import pprint

import serpapi
from langchain_core.tools import tool


# Web search
@tool
def web_search_tool(query: str) -> list[dict[str, str]]:
    """Searches the web using the Serper API."""
    pprint("\n\n\n===query web_search_tool")
    pprint(query)
    pprint("===============\n\n\n")

    api_key = os.getenv("SERPAPI_API_KEY", "")
    if not api_key:
        raise Exception("No SERPAPI_API_KEY found")

    try:
        client = serpapi.Client(api_key=api_key)
        results = client.search(
            {
                "q": query,
                "engine": "google",
                "hl": "en",
                "gl": "us",
                "google_domain": "google.com",
            }
        )

        return [
            {
                "title": r.get("title", ""),
                "snippet": r.get("snippet", ""),
                "url": r.get("link", ""),
            }
            for r in results.get("organic_results", [])[:5]
        ]
    except Exception:
        return []
