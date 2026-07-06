import json
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent / "eval_shared"))

from util import parse_option, echo


_RESULTS_ROOT = Path(__file__).parent / "results"
SUMMARY_FILENAME = "_summary.json"


def _mean(value: float, divisor: float) -> float:
    return value / divisor if divisor else 0.0


def _pearson(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    cov = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
    vx = sum((a - mx) ** 2 for a in xs)
    vy = sum((b - my) ** 2 for b in ys)

    return cov / math.sqrt(vx * vy) if vx > 0 and vy > 0 else 0.0


def _regression_stats(points):
    n = len(points)
    if n < 2:
        return None

    xs = [x for x, _ in points]
    ys = [y for _, y in points]
    sum_x, sum_y = sum(xs), sum(ys)
    sum_xx = sum(x * x for x in xs)
    sum_xy = sum(x * y for x, y in points)

    denom = n * sum_xx - sum_x ** 2

    if denom == 0:
        return None

    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n

    mean_y = sum_y / n
    ss_tot = sum((y - mean_y) ** 2 for y in ys)
    ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in points)

    r_squared = 1 - ss_res / ss_tot if ss_tot else 0.0
    rho = _pearson(xs, ys)

    return {
        "slope": slope,
        "intercept": intercept,
        "rho": rho,
        "rSquared": r_squared,
    }


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

    def _config_x(identifier):
        # "D2Snap.0.5" -> 0.5 ; "D2Snap.1.0" -> 1.0
        # Take everything after the first dot so the trailing fraction is preserved.
        return float(identifier.split(".", 1)[1])

    points = [
        (_config_x(identifier), v["meanSizeRatio"])
        for identifier, v in summary["configs"].items()
        if v["meanSizeRatio"] > 0
    ]

    stats = _regression_stats(points)

    if stats is not None:
        summary["linearRegression"] = stats

    out_path = _RESULTS_ROOT / date / SUMMARY_FILENAME
    out_path.write_text(json.dumps(summary, indent=2))

    echo(f"Summary written to {date}/{SUMMARY_FILENAME}", always=True)

    return summary


if __name__ == "__main__":
    date = parse_option("--date")

    if not date:
        raise ReferenceError("Missing results date (--date <dirname_date>)")

    summarize(date)