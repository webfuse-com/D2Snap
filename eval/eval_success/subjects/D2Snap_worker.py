import json
import subprocess
import sys
from functools import partial
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from lxml import html as lxml_html

from shared import (
    INSTRUCTIONS_DOM,
    DOMInteractiveElementTarget,
    analyze_result_dom_by_uid,
    tag_reference_elements_by_uid,
    strip_data_uid,
)
from logger import Logger

from eval import run_evaluation, REFERENCE, _DATASET_DIR


_BRIDGE = Path(__file__).parent.parent.parent / "D2Snap.bridge.mjs"
_LOGGER = Logger("D2Snap-serialization", clean_dir=False)


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


def _loader(config: dict, identifier: str, data, rid):
    trajectories = REFERENCE[rid]["trajectories"]

    original_html = (_DATASET_DIR / "dom" / f"{rid}.html").read_text()

    selector_to_sentinels = tag_reference_elements_by_uid(data["originalDOM"], trajectories)
    tagged_html = lxml_html.tostring(data["originalDOM"], encoding="unicode")

    snap = _call_bridge(tagged_html, config)
    if snap is None:
        return None

    tagged_downsampled_html = snap["html"]
    llm_html = strip_data_uid(tagged_downsampled_html)

    data["taggedDownsampledDOM"] = lxml_html.fromstring(tagged_downsampled_html)
    data["selectorToSentinels"] = selector_to_sentinels

    _LOGGER.write(f"{rid}.{identifier}", llm_html)

    return [
        {
            "type": "text",
            "data": llm_html,
            "size": len(llm_html),
            "size_ratio": len(llm_html) / len(original_html),
        }
    ]


def run_worker_evaluation(identifier: str, config: dict) -> None:
    run_evaluation(
        identifier,
        partial(_loader, config, identifier),
        analyze_result_dom_by_uid,
        INSTRUCTIONS_DOM,
        DOMInteractiveElementTarget,
    )


if __name__ == "__main__":
    identifier = sys.argv[1]
    config = json.loads(sys.argv[2])
    run_worker_evaluation(identifier, config)