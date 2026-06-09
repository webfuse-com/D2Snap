import json
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent / "eval_shared"))

from util import parse_option, echo


_RESULTS_ROOT = Path(__file__).parent / "results"

SUMMARY_FILENAME = "_summary.json"


def _mean(value: float, divisor: float) -> float:
    return value / divisor if divisor else 0.0


def summarize(date: str) -> dict:
    results_file = _RESULTS_ROOT / date / "D2Snap.json"

    if not results_file.exists():
        raise ReferenceError(f"Results do not exist '{date}/D2Snap.json'")

    data = json.loads(results_file.read_text())
    entries = data["results"]
    config_keys = data["configs"]

    total = len(entries)
    error_cases = sum(1 for r in entries if r.get("error"))
    non_error = total - error_cases

    summary = {
        "configs": {},
    }

    for identifier in config_keys:
        totals = {
            "totalOriginalSize": 0,
            "totalSnapshotSize": 0,
            "totalSizeRatio": 0.0,
            "errorCases": 0,
            "successCases": 0,
        }

        for r in entries:
            if r.get("error"):
                continue

            cfg = r.get("configs", {}).get(identifier)
            if not cfg or cfg.get("error"):
                totals["errorCases"] += 1
                continue

            totals["totalOriginalSize"] += r["originalSize"]
            totals["totalSnapshotSize"] += cfg["snapshotSize"]
            totals["totalSizeRatio"] += cfg["sizeRatio"]
            totals["successCases"] += 1

        n = totals["successCases"]

        summary["configs"][identifier] = {
            "meanOriginalSize": _mean(totals["totalOriginalSize"], n),
            "meanSnapshotSize": _mean(totals["totalSnapshotSize"], n),
            "meanSizeRatio": _mean(totals["totalSizeRatio"], n),
            "errorCases": totals["errorCases"],
        }

    points = [
        (float(identifier.split(".")[-1]) / 10, v["meanSizeRatio"])
        for identifier, v in summary["configs"].items()
        if v["meanSizeRatio"] > 0
    ]
 
    if len(points) >= 2:
        n = len(points)
        sum_x  = sum(x for x, _ in points)
        sum_y  = sum(y for _, y in points)
        sum_xx = sum(x * x for x, _ in points)
        sum_xy = sum(x * y for x, y in points)
 
        slope     = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x ** 2)
        intercept = (sum_y - slope * sum_x) / n
 
        summary["linearRegression"] = {
            "slope": slope,
            "intercept": intercept,
            "formula": f"sizeRatio = {slope:.4f} * r + {intercept:.4f}",
        }

    out_path = _RESULTS_ROOT / date / SUMMARY_FILENAME

    out_path.write_text(json.dumps(summary, indent=2))

    echo(f"Summary written to {date}/{SUMMARY_FILENAME}", always=True)

    return summary


if __name__ == "__main__":
    date = parse_option("--date")

    if not date:
        raise ReferenceError("Missing results date (--date <dirname_date>)")

    summarize(date)