import json
import os
from typing import Any, Type

from pydantic import BaseModel, create_model

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