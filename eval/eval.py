import atexit
import json
import math
import os
import re
import time
from datetime import datetime
from multiprocessing import Pool
from pathlib import Path
from typing import Callable, Type

from lxml import html as lxml_html
from pydantic import BaseModel
from dotenv import load_dotenv

from eval_util import parse_option, echo
from llm_adapter import OpenAIAdapter, AnthropicAdapter
from logger import Logger


_HERE = Path(__file__).parent

load_dotenv(_HERE.parent / ".env")

_DATASET_DIR = _HERE.parent / "dataset"
_DEFAULT_MODEL_OPENAI = "gpt-4o"
_DEFAULT_MODEL_ANTHROPIC = "claude-sonnet-4-20250514"
_ADAPTER_CACHE = None


def _load_dataset():
    raw = (_DATASET_DIR / "data.jsonl").read_text()

    return [ json.loads(line) for line in raw.splitlines() if line.strip() ]

def _load_reference():
    raw = json.loads((_DATASET_DIR / "reference.json").read_text())

    return { record["id"]: record for record in raw }


DATASET = _load_dataset()
REFERENCE = _load_reference()


def _make_adapter():
    provider = parse_option("--provider") or "openai"
    model = parse_option("--model")

    if provider == "openai":
        model = model or _DEFAULT_MODEL_OPENAI
        adapter = OpenAIAdapter(model, os.environ["OPENAI_API_KEY"])
    elif provider == "anthropic":
        model = model or _DEFAULT_MODEL_ANTHROPIC
        adapter = AnthropicAdapter(model, os.environ["ANTHROPIC_API_KEY"])
    else:
        raise SyntaxError("Specify a valid model provider")

    return adapter, provider, model

def _adapter():
    global _ADAPTER_CACHE

    if _ADAPTER_CACHE is None:
        _ADAPTER_CACHE = _make_adapter()

    return _ADAPTER_CACHE

def _abbrev(s: str, limit: int = 100) -> str:
    return f"{s[:limit]}…" if len(s) > limit else s

def _read_raw_snapshots(record):
    rid = record["id"]

    def read_gui(d):
        path = _DATASET_DIR / d / f"{rid}.png"

        return {"path": str(path), "data": path.read_bytes()}

    return {
        "originalDOM": lxml_html.fromstring((_DATASET_DIR / "dom" / f"{rid}.html").read_text()),
        "originalGUI": read_gui("gui"),
        "buGUI": read_gui("bu"),
        "buTxt": (_DATASET_DIR / "bu" / f"{rid}.txt").read_text(),
    }

def _process_record(args):
    i, record, snapshot_loader_cb, analyze_results_cb, instructions, output_schema = args

    try:
        api_adapter, _, _ = _adapter()
        raw_snapshots = _read_raw_snapshots(record)

        try:
            snapshot_data = snapshot_loader_cb(raw_snapshots, record["id"])
        except Exception as err:
            print(f"[loader error] {record['id']}: {err!r}")
            snapshot_data = None

        if not snapshot_data:
            return {"id": record["id"], "success": False, "error": True}

        first = snapshot_data[0]
        snapshot_print = first.get("path") or re.sub(r"\s+", " ", first["data"])

        echo(f"({i}) {record['url']}", always=True)
        echo(f"{record['task']}\n{_abbrev(snapshot_print, 500)}")

        llm_response = None
        auto_analysis_ok = False
        rtt = None
        is_error = False

        try:
            ti0 = time.perf_counter()
            res = api_adapter.request(instructions, record["task"], snapshot_data, output_schema)
            rtt = (time.perf_counter() - ti0) * 1000
            llm_response = res["interactiveElements"]

            auto_analysis_ok = analyze_results_cb(
                res["interactiveElements"],
                REFERENCE[record["id"]]["trajectories"],
                raw_snapshots,
            )
        except Exception as err:
            print(repr(err))

            llm_response = str(err) or "Error"
            is_error = True

        snapshot_size = sum(s["size"] for s in snapshot_data)
        token_estimate = sum(
            round(s["size"] / 4) if s["type"] != "image" else round(s["size"] / (32 ** 2))

            for s in snapshot_data
        )

        return {
            "id": record["id"],
            "snapshotSize": snapshot_size,
            "tokenEstimate": token_estimate,
            "response": llm_response,
            "success": auto_analysis_ok,
            "error": is_error,
            "rtt": rtt,
        }
    except Exception as err:
        print(f"[worker fatal] {record.get('id')}: {err!r}")

        return {"id": record.get("id"), "success": False, "error": True}


def run_evaluation(
    identifier: str,
    snapshot_loader_cb: Callable,
    analyze_results_cb: Callable,
    instructions: str,
    output_schema: Type[BaseModel],
) -> None:
    _, provider, model = _adapter()

    echo(f"Evaluating '{identifier}' ({provider}: {model})...", always=True)

    t0 = time.time()
    results: list = []

    def _write_results():
        date_id = "-".join(re.split(r"[^\d]+", datetime.now().isoformat())[:-3])
        out_name = identifier if identifier.lower().endswith(".json") else f"{identifier}.json"

        Logger(str(Path("..") / "results" / date_id), clean_dir=False).write(
            out_name,
            json.dumps({
                "endpoint": f"{provider}: {model}",
                "date": datetime.now().isoformat(),
                "results": results,
            }, indent=2),
        )

    atexit.register(_write_results)

    split = (parse_option("--split") or "0").split(",")
    split_size = int(split[0]) if split[0] and int(split[0]) > 0 else math.inf
    split_offset = int(split[1]) if len(split) > 1 and split[1] else 0
    split_offset_end = min(
        len(DATASET),
        split_offset + (split_size if split_size != math.inf else len(DATASET)),
    )

    echo(f"Split {split_offset} - {split_offset_end}")

    workers = int(parse_option("--workers") or "8")
    indices = range(split_offset, split_offset_end)

    args_iter = [
        (i, DATASET[i], snapshot_loader_cb, analyze_results_cb, instructions, output_schema)
        for i in indices
    ]

    if workers <= 1 or len(args_iter) <= 1:
        for args in args_iter:
            results.append(_process_record(args))
    else:
        Logger("llm", clean_dir=True)
        os.environ["EVAL_WORKER"] = "1"
        echo(f"Running with {workers} workers across {len(args_iter)} records", always=True)
        with Pool(workers) as pool:
            for result in pool.imap(_process_record, args_iter):
                results.append(result)

    echo(f"...'{identifier}' done ({round(time.time() - t0)}s).", always=True)