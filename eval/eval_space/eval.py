import json
import math
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from multiprocessing import Pool
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "eval_shared"))

from dotenv import load_dotenv

from util import parse_option, echo


_HERE = Path(__file__).parent

load_dotenv(_HERE.parent.parent / ".env")

_DATASET_DIR = _HERE.parent.parent / "dataset"
_BRIDGE = _HERE.parent / "D2Snap.bridge.mjs"
_STEPS = 10
_UNIFORM_R = [ round(i / _STEPS, 1) for i in range(_STEPS) ]

EVALS = {
    f"D2Snap.{round(r % 1 * 10)}": {"rE": r, "rA": r, "rT": r}
    for r in _UNIFORM_R
}


def _load_dataset():
    raw = (_DATASET_DIR / "data.jsonl").read_text()

    return [ json.loads(line) for line in raw.splitlines() if line.strip() ]


DATASET = _load_dataset()


def _call_bridge(html_str: str, config: dict) -> dict | None:
    payload = json.dumps({
        "html": html_str,
        "config": config,
    })

    proc = subprocess.run(
        ["node", str(_BRIDGE)],
        input=payload,
        capture_output=True,
        text=True,
        timeout=120,
    )

    if proc.returncode != 0:
        sys.stderr.write(f"[D2Snap Bridge rc={proc.returncode}] {proc.stderr.strip()}\n")
        return None
    try:
        out = json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        sys.stderr.write(f"[D2Snap Bridge bad JSON] {e}: {proc.stdout[:200]!r}\n")
        return None

    if not out.get("ok"):
        sys.stderr.write(f"[D2Snap Bridge] {out.get('error', 'unknown')}\n")
        return None

    return out


def _process_record(args):
    i, record = args

    rid = record["id"]

    try:
        original_html = (_DATASET_DIR / "dom" / f"{rid}.html").read_text()
        original_size = len(original_html)

        echo(f"({i}) {record['url']}", always=True)

        configs = {}

        for identifier, config in EVALS.items():
            snap = _call_bridge(original_html, config)
            if snap is None:
                configs[identifier] = {"error": True}
                continue

            snapshot_size = len(snap["html"])

            configs[identifier] = {
                "snapshotSize": snapshot_size,
                "sizeRatio": snapshot_size / original_size,
            }

        points = [
            (float(identifier.split(".")[-1]) / 10, v["sizeRatio"])
            for identifier, v in configs.items()
            if not v.get("error")
        ]

        linear_regression = None

        if len(points) >= 2:
            n = len(points)
            sum_x  = sum(x for x, _ in points)
            sum_y  = sum(y for _, y in points)
            sum_xx = sum(x * x for x, _ in points)
            sum_xy = sum(x * y for x, y in points)

            slope     = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x ** 2)
            intercept = (sum_y - slope * sum_x) / n

            linear_regression = {"slope": slope, "intercept": intercept}

        return {
            "id": rid,
            "originalSize": original_size,
            "configs": configs,
            "linearRegression": linear_regression,
            "error": False,
        }
    except Exception as err:
        print(f"[worker fatal] {rid}: {err!r}")

        return {"id": rid, "error": True}


def _run_evaluation() -> None:
    echo("Evaluating D2Snap size scaling...", always=True)

    t0 = time.time()

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

    args_iter = [(i, DATASET[i]) for i in indices]

    results: list = []

    if workers <= 1 or len(args_iter) <= 1:
        for args in args_iter:
            results.append(_process_record(args))
    else:
        os.environ["EVAL_WORKER"] = "1"
        echo(f"Running with {workers} workers across {len(args_iter)} records", always=True)
        with Pool(workers) as pool:
            for result in pool.imap(_process_record, args_iter):
                results.append(result)

    echo(f"...done ({round(time.time() - t0)}s).", always=True)

    date_id = "-".join(re.split(r"[^\d]+", datetime.now().isoformat())[:-3])
    results_dir = _HERE / "results" / date_id

    results_dir.mkdir(parents=True, exist_ok=True)
    (results_dir / "D2Snap.json").write_text(json.dumps({
        "date": datetime.now().isoformat(),
        "configs": list(EVALS.keys()),
        "results": results,
    }, indent=2))


if __name__ == "__main__":
    _run_evaluation()