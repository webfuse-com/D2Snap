import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from pydantic import BaseModel

from shared import template_instructions, check_against_trajectories

from eval import run_evaluation


class BUInteractiveElementTarget(BaseModel):
    numericalIdentifier: int


_BASE = {
    "EXAMPLE_RESPONSE": """
``` json
[
    {
        "elementDescription": "Field that contains the mathematical expression to be solved.",
        "numericalIdentifier": 0
    },
    {
        "elementDescription": "Button that triggers the calculation of the provided mathematical expression.",
        "numericalIdentifier": 1
    }
]
```
    """,
}

_INSTRUCTIONS_FULL = template_instructions({
    **_BASE,
    "SNAPSHOT_DESCRIPTION": """
You are provided with two means of input:

1. A screenshot of the browser with bounding boxes and related numeric identifiers.
2. A list of interactive elements with format `[index] type "text"`. `index` is the numeric identifier, `type` is an HTML element type (button, input, etc.), and `text` is the element description.

> Numeric identifiers across means of input are consistent.
    """,
    "SCHEMA_DESCRIPTION": "Target elements by their numeric identifiers as given across both means of input.",
    "EXAMPLE_SNAPSHOT": """
``` base64
data:image/png;base64,<screenshot>
```

``` html
[0] INPUT "Type expression"
[1] BUTTON "Solve"
[2] A ""
```
    """,
})

_INSTRUCTIONS_MIN = template_instructions({
    **_BASE,
    "SNAPSHOT_DESCRIPTION": """
You are provided with a list of interactive elements with format `[index] type "text"`. `index` is the numeric identifier, `type` is an HTML element type (button, input, etc.), and `text` is the element description.
    """,
    "SCHEMA_DESCRIPTION": "Target elements by their numeric identifiers as given with input.",
    "EXAMPLE_SNAPSHOT": """
``` html
[0] INPUT "Type expression"
[1] BUTTON "Solve"
[2] A ""
```
    """,
})


def _analyze_bu(res, trajectories, _data=None):
    def check(res_element, reference_element):
        ref_id = reference_element.get("bu_identifier")
        if ref_id is None:
            return False

        return res_element["numericalIdentifier"] == ref_id

    return check_against_trajectories(res, trajectories, check)


def _loader_full(data, _id):
    return [
        {
            "type": "image",
            "data": data["buGUI"]["data"],
            "path": data["buGUI"]["path"],
            "size": len(data["buGUI"]["data"]),
        },
        {
            "type": "text",
            "data": data["buTxt"],
            "size": len(data["buTxt"]),
        },
    ]


def _loader_min(data, _id):
    return [{"type": "text", "data": data["buTxt"], "size": len(data["buTxt"])}]


if __name__ == "__main__":
    run_evaluation("bu", _loader_full, _analyze_bu, _INSTRUCTIONS_FULL, BUInteractiveElementTarget)
    run_evaluation("bu.min", _loader_min, _analyze_bu, _INSTRUCTIONS_MIN, BUInteractiveElementTarget)