import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from pydantic import BaseModel

from shared import template_instructions, check_against_trajectories

from eval import run_evaluation


_GUI_INSTRUCTIONS = template_instructions({
    "SNAPSHOT_DESCRIPTION": "You are provided with a screenshot, namely the rendered GUI.",
    "SCHEMA_DESCRIPTION": (
        "Target elements by their spatial center pixel coordinates. This means, refer to "
        "them through an x (horizontal) and a y (vertical) pixel coordinate relative to "
        "the origin, which is in the top left corner of the image."
    ),
    "EXAMPLE_SNAPSHOT": """
``` base64
data:image/png;base64,<screenshot>
```
    """,
    "EXAMPLE_RESPONSE": """
``` json
[
    {
        "elementDescription": "Field that contains the mathematical expression to be solved.",
        "x": 100,
        "y": 47
    },
    {
        "elementDescription": "Button that triggers the calculation of the provided mathematical expression.",
        "x": 100,
        "y": 197
    }
]
```
    """,
})


class GUIInteractiveElementTarget(BaseModel):
    x: float
    y: float


def _loader(data, _id):
    return [
        {
            "type": "image",
            "data": data["originalGUI"]["data"],
            "path": data["originalGUI"]["path"],
            "size": len(data["originalGUI"]["data"]),
        }
    ]

def _analyze(res, trajectories, _data=None):
    def check(res_element, reference_element):
        bb = reference_element.get("bounding_box")
        if not bb:
            return False

        tol = 10
        x = bb[0][0] - tol
        y = bb[0][1] - tol
        w = bb[1][0] + tol
        h = bb[1][1] + tol

        return x <= res_element["x"] <= x + w and y <= res_element["y"] <= y + h

    return check_against_trajectories(res, trajectories, check)


if __name__ == "__main__":
    run_evaluation("gui", _loader, _analyze, _GUI_INSTRUCTIONS, GUIInteractiveElementTarget)