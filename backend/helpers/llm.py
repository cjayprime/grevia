import json
import os
from typing import Any, Type

import anthropic
from openai import OpenAI


from pydantic import BaseModel


LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")

MODEL_MAP = {
    "anthropic": {
        "default": "claude-sonnet-4-5-20250514",
        "strong": "claude-opus-4-5-20250514",
    },
    "openai": {
        "default": "gpt-4.1",
        "strong": "gpt-5.4",
    },
}


def _anthropic_chat(
    model: str,
    system: str,
    messages: list[dict],
    max_tokens: int,
    response_schema: Type[BaseModel] | None,
) -> str | Any:

    client = anthropic.Anthropic()

    if response_schema is not None:
        schema = response_schema.model_json_schema()
        tool_name = "structured_output"
        message = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
            tools=[
                {
                    "name": tool_name,
                    "description": "Return the structured response.",
                    "input_schema": schema,
                }
            ],
            tool_choice={"type": "tool", "name": tool_name},
        )
        for block in message.content:
            if block.type == "tool_use" and block.name == tool_name:
                return response_schema.model_validate(block.input)
        raw = json.dumps(message.content[0].input)
        return response_schema.model_validate_json(raw)

    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    return message.content[0].text


def _openai_chat(
    model: str,
    system: str,
    messages: list[dict],
    max_tokens: int,
    response_schema: Type[BaseModel] | None,
) -> str | Any:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    oai_messages = [{"role": "system", "content": system}] + messages

    if response_schema is not None:
        response = client.responses.parse(
            model=model,
            input=oai_messages,
            text_format=response_schema,
        )
        return response.output_parsed

    response = client.chat.completions.create(
        model=model,
        messages=oai_messages,
        max_completion_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""


def chat(
    *,
    system: str,
    messages: list[dict],
    model: str | None = None,
    tier: str = "default",
    max_tokens: int = 16000,
    response_schema: Type[BaseModel] | None = None,
) -> str | Any:
    provider = LLM_PROVIDER
    resolved_model = model or MODEL_MAP.get(provider, MODEL_MAP["openai"])[tier]

    if provider == "openai":
        return _openai_chat(
            resolved_model, system, messages, max_tokens, response_schema
        )
    return _anthropic_chat(
        resolved_model, system, messages, max_tokens, response_schema
    )
