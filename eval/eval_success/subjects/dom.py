import sys
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from lxml import html as lxml_html

from shared import INSTRUCTIONS_DOM, DOMInteractiveElementTarget, analyze_result_dom

from eval import run_evaluation, _DATASET_DIR


def _loader(data, _id):
    snapshot = lxml_html.tostring(
        data["originalDOM"],
        encoding="unicode",
    )

    # Remove redundant whitespace
    snapshot = re.sub(r"\s+", " ", snapshot)
    snapshot = re.sub(r">\s+<", "><", snapshot)
    snapshot = re.sub(r"\s+>", ">", snapshot)
    snapshot = re.sub(r"<\s+", "<", snapshot)
    snapshot = re.sub(r"\s+/>", "/>", snapshot)
    snapshot = snapshot.strip()

    original_html = (_DATASET_DIR / "dom" / f"{_id}.html").read_text()

    return [
        {
            "type": "text",
            "data": snapshot,
            "size": len(snapshot),
            "size_ratio": len(snapshot) / len(original_html),
        }
    ]


if __name__ == "__main__":
    run_evaluation(
        "dom",
        _loader,
        analyze_result_dom,
        INSTRUCTIONS_DOM,
        DOMInteractiveElementTarget,
    )