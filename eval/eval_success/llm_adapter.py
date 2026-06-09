import base64
import io
import json
import os
import re
from typing import Any, Type

from PIL import Image
from pydantic import BaseModel, create_model

import anthropic
import openai

from logger import Logger


class InteractiveElementTargetBase(BaseModel):
    elementDescription: str


class LLMAdapter:
    _logger = None
    _request_count = 0

    @classmethod
    def _get_logger(cls):
        if cls._logger is None:
            cls._logger = Logger("llm", clean_dir=(os.environ.get("EVAL_WORKER") != "1"))

        return cls._logger

    @staticmethod
    def create_schema(specific_schema: Type[BaseModel]) -> Type[BaseModel]:
        fields = {
            name: (field.annotation, field)

            for name, field in InteractiveElementTargetBase.model_fields.items()
        }

        for name, field in specific_schema.model_fields.items():
            fields[name] = (field.annotation, field)

        Element = create_model("InteractiveElement", **fields)
        Wrapper = create_model(
            "InteractiveElements",
            interactiveElements=(list[Element], ...),
        )

        return Wrapper

    @staticmethod
    def resize_image(data: bytes, w: int, h: int | None = None) -> bytes:
        img = Image.open(io.BytesIO(data))

        if h is None:
            ratio = w / img.width
            h = int(img.height * ratio)

        resized = img.resize((w, h))

        buf = io.BytesIO()

        resized.save(buf, format="PNG")

        return buf.getvalue()

    def create_request(self, instructions, input_task, snapshot_data, schema):
        raise NotImplementedError("create_request() not implemented")

    def create_response(self, req, schema=None):
        raise NotImplementedError("create_response() not implemented")

    def request(self, instructions, input_task, snapshot_data, schema):
        req = self.create_request(instructions, input_task, snapshot_data, schema)
        res = self.create_response(req, schema)

        log_req = {k: v for k, v in req.items() if k != "_schema"}

        LLMAdapter._get_logger().write(
            f"{os.getpid()}.{LLMAdapter._request_count}.txt",
            "\n".join([
                "REQUEST:",
                json.dumps(log_req, indent=2, default=str),
                "-" * 10,
                "RESPONSE:",
                json.dumps(res, indent=2, default=str),
            ]),
        )
        LLMAdapter._request_count += 1

        return res


class OpenAIAdapter(LLMAdapter):
    def __init__(self, model: str, key: str):
        super().__init__()

        self._model = model
        self._client = openai.OpenAI(api_key=key)

    def _create_file(self, file_path: str) -> str:
        with open(file_path, "rb") as f:
            result = self._client.files.create(file=f, purpose="vision")

        return result.id

    def create_request(self, instructions, input_task, snapshot_data, schema):
        user_content: list[dict[str, Any]] = [
            {"type": "input_text", "text": f"TASK: {input_task}"}
        ]

        for snapshot in snapshot_data:
            if snapshot["type"] == "image":
                file_id = self._create_file(snapshot["path"])

                user_content.append({
                    "type": "input_image",
                    "file_id": file_id,
                    "detail": "high",
                })
            else:
                user_content.append({"type": "input_text", "text": snapshot["data"]})

        wrapper_schema = LLMAdapter.create_schema(schema)

        return {
            "model": self._model,
            "input": [
                {"role": "developer", "content": [{"type": "input_text", "text": instructions}]},
                {"role": "user", "content": user_content},
            ],
            "_schema": wrapper_schema,
            "store": False,
        }

    def create_response(self, req, schema=None):
        wrapper_schema = req.pop("_schema")

        res = self._client.responses.parse(
            **req,
            text_format=wrapper_schema,
        )
        if res.output_parsed is None:
            raw = getattr(res, "output_text", None) or repr(res.output)

            raise RuntimeError(f"OpenAI parse failed (refusal/length/schema): {raw[:500]}")

        return res.output_parsed.model_dump()


class AnthropicAdapter(LLMAdapter):
    _IMAGE_RESIZE_WIDTH = 900

    def __init__(self, model: str, key: str):
        super().__init__()
        self._model = model
        self._client = anthropic.Anthropic(api_key=key)

    def create_request(self, instructions, input_task, snapshot_data, schema):
        wrapper_schema = LLMAdapter.create_schema(schema)
        json_schema = json.dumps(wrapper_schema.model_json_schema(), indent=2)

        system = "\n\n".join([
            instructions,
            f"Respond only with a valid JSON which is according to the following schema:\n\n{json_schema}",
        ])

        user_content: list[dict[str, Any]] = [
            {"type": "text", "text": f"TASK: {input_task}"}
        ]

        for snapshot in snapshot_data:
            if snapshot["type"] == "image":
                resized = LLMAdapter.resize_image(snapshot["data"], self._IMAGE_RESIZE_WIDTH)

                user_content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "data": base64.b64encode(resized).decode("ascii"),
                        "media_type": "image/png",
                    },
                })
            else:
                user_content.append({"type": "text", "text": snapshot["data"]})

        return {
            "max_tokens": 2 ** 13,
            "model": self._model,
            "system": system,
            "messages": [{"role": "user", "content": user_content}],
            "_schema": wrapper_schema,
        }

    def create_response(self, req, schema=None):
        wrapper_schema = req.pop("_schema")

        res = self._client.messages.create(**req)

        text = res.content[0].text

        match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
        if not match:
            raise ValueError("No JSON found in Anthropic response")

        parsed = json.loads(match.group(0))

        wrapper_schema.model_validate(parsed)

        return parsed