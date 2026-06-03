import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from lxml import html as lxml_html

from eval import run_evaluation
from eval_shared import INSTRUCTIONS_DOM, DOMInteractiveElementTarget, analyze_result_dom


MAX_SNAPSHOT_SIZE_TOKENS = 2 ** 16
MAX_SNAPSHOT_SIZE_B = MAX_SNAPSHOT_SIZE_TOKENS * 4


def _loader(data, _id):
    full_html = lxml_html.tostring(data["originalDOM"], encoding="unicode")

    after_head = full_html.split("</head>", 1)[-1]

    snapshot = after_head[:MAX_SNAPSHOT_SIZE_B]

    return [
        {
            "type": "text",
            "data": snapshot,
            "size": len(snapshot)
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