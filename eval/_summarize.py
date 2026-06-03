import json
from pathlib import Path

from eval_util import parse_option, echo
from logger import Logger


_RESULTS_ROOT = Path(__file__).parent / "results"

SUMMARY_FILENAME = "_summary.json"


def _mean(value: float, divisor: float) -> float:
    return value / divisor if divisor else 0.0


def summarize(date: str) -> dict:
    results_dir = _RESULTS_ROOT / date

    print(results_dir)

    if not results_dir.exists():
        raise ReferenceError(f"Results do not exist '{date}'")

    summary: dict = {}

    for results_file in sorted(results_dir.iterdir()):
        if results_file.name == SUMMARY_FILENAME or results_file.suffix != ".json":
            continue

        data = json.loads(results_file.read_text())
        entries = data["results"]

        s = {
            "successCases": 0,
            "failureCases": 0,
            "errorCases": 0,
            "totalSnapshotSize": 0,
            "totalEstimatedTokens": 0,
            "totalRTT": 0.0,
        }

        for r in entries:
            s["successCases"] += int(bool(r.get("success")))
            s["failureCases"] += int(not r.get("success"))
            s["errorCases"] += int(bool(r.get("error")))
            s["totalSnapshotSize"] += r.get("snapshotSize") or 0
            s["totalEstimatedTokens"] += r.get("tokenEstimate") or 0
            s["totalRTT"] += r.get("rtt") or 0

        total = s["successCases"] + s["failureCases"]
        non_error = total - s["errorCases"]

        s["successRate"] = _mean(s["successCases"], total)
        s["errorRate"] = _mean(s["errorCases"], total)
        s["meanSnapshotSize"] = _mean(s["totalSnapshotSize"], non_error)
        s["meanEstimatedTokens"] = _mean(s["totalEstimatedTokens"], non_error)
        s["meanRTT"] = _mean(s["totalRTT"], non_error)

        summary[results_file.name] = s

    summary = {
        k: v
        for k, v in sorted(
            summary.items(),
            key=lambda item: item[1]["successRate"],
            reverse=True,
        )
    }

    Logger(str(Path("..") / "results" / date), clean_dir=False).write(
        SUMMARY_FILENAME, json.dumps(summary, indent=2)
    )

    echo(f"Summary written to {date}/{SUMMARY_FILENAME}", always=True)

    return summary


if __name__ == "__main__":
    date = parse_option("--date")

    if not date:
        raise ReferenceError("Missing results date (--date <dirname_date>)")

    summarize(date)