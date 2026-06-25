import re

from pydantic import BaseModel
from lxml import html as lxml_html

from util import template_instructions, check_against_trajectories


class DOMInteractiveElementTarget(BaseModel):
    cssSelector: str


_SENTINEL_PREFIX = "__eval_ref_"
_DATA_UID_STRIP_RE = re.compile(r'\s+data-uid="[^"]*"')

INSTRUCTIONS_DOM = template_instructions({
    "SNAPSHOT_DESCRIPTION": "You are provided with HTML, namely a serialised DOM.",
    "SCHEMA_DESCRIPTION": "Target elements by shortest unique CSS selector, e.g. `#app > button:first-child`.",
    "EXAMPLE_SNAPSHOT": """
``` html
<main>
    <h1>Calculator</h1>
    <input id="expression" class="field" type="text" placeholder="3 * 4">
    <button id="submit" type="button">Solve</button>
    <div id="result">
        <span></span>
    </div>
```
    """,
    "EXAMPLE_RESPONSE": """
``` json
[
    {
        "elementDescription": "Field that contains the mathematical expression to be solved.",
        "cssSelector": "#expression"
    },
    {
        "elementDescription": "Button that triggers the calculation of the provided mathematical expression.",
        "cssSelector": "#submit"
    }
]
```
    """,
})


def tag_reference_elements_by_uid(dom, trajectories):
    counter = 0
    selector_to_sentinels: dict[str, set[str]] = {}

    for trajectory in trajectories:
        for ref_elem in trajectory:
            css = ref_elem.get("css_selector")
            if not css:
                continue
            try:
                matches = dom.cssselect(css)
            except Exception:
                continue
            for el in matches:
                sentinel = f"{_SENTINEL_PREFIX}{counter}"
                counter += 1
                el.set("data-uid", sentinel)

                selector_to_sentinels.setdefault(css, set()).add(sentinel)

    return selector_to_sentinels


def strip_data_uid(html_str: str) -> str:
    return _DATA_UID_STRIP_RE.sub("", html_str)


def _candidates(target):
    parent = target.getparent()
    grand = parent.getparent() if parent is not None else None
    great = grand.getparent() if grand is not None else None

    cands = [ target, parent, grand, great ]

    if parent is not None:
        cands.extend([ c for c in parent if c is not target ])

    cands.extend(list(target))

    return [c for c in cands if c is not None]


def _matches(element, css_selector: str) -> bool:
    try:
        return element in element.getroottree().getroot().cssselect(css_selector)
    except Exception:
        return False


def analyze_result_dom(res, trajectories, data):
    root = data["originalDOM"]

    def check(res_element, reference_element):
        ref_css = reference_element.get("css_selector")
        if not ref_css:
            return False

        try:
            targets = root.cssselect(res_element["cssSelector"])
        except Exception:
            return False
        if not targets:
            return False

        return any(_matches(c, ref_css) for c in _candidates(targets[0]))

    return check_against_trajectories(res, trajectories, check)

def analyze_result_dom_by_uid(res, trajectories, data):
    tagged_dom = data["taggedDownsampledDOM"]
    selector_to_sentinels = data["selectorToSentinels"]

    def check(res_element, reference_element):
        ref_css = reference_element.get("css_selector")
        if not ref_css:
            return False

        expected = selector_to_sentinels.get(ref_css)
        if not expected:
            return False

        try:
            targets = tagged_dom.cssselect(res_element["cssSelector"])
        except Exception:
            return False

        if not targets:
            return False

        for c in _candidates(targets[0]):
            uid = c.get("data-uid")
            if uid and uid in expected:
                return True

        return False

    return check_against_trajectories(res, trajectories, check)