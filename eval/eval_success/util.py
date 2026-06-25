import re
import sys
from pathlib import Path
from typing import Callable, Optional


_RAW_ARGS = [None, *sys.argv[1:]]
_INSTRUCTIONS_TEMPLATE = (Path(__file__).parent / "instructions.template.md").read_text()
_MAX_TRAJECTORY_TO_REFERENCE_SUPERSET_SIZE_FACTOR = 2


def parse_flag(arg: str) -> bool:
    return arg in _RAW_ARGS

def parse_option(arg: str) -> Optional[str]:
    try:
        i = _RAW_ARGS.index(arg)
    except ValueError:
        return None

    return _RAW_ARGS[i + 1] if i + 1 < len(_RAW_ARGS) else None

def echo(message: str, always: bool = False) -> None:
    if not always and not parse_flag("--verbose"):
        return

    print(f"\x1b[2m{message}\x1b[0m")

def template_instructions(templating_dict: dict) -> str:
    instructions = _INSTRUCTIONS_TEMPLATE

    for key, markdown in templating_dict.items():
        instructions = re.sub(
            rf"\{{\{{ *{re.escape(key)} *\}}\}}",
            markdown.strip(),
            instructions,
            flags=re.IGNORECASE,
        )

    return instructions

def check_against_trajectories(
    res: list,
    trajectories: list,
    check_cb: Callable,
) -> bool:
    # Warn if the response set is vast, avoid rewarding coincidental success.
    max_ref = max((len(t) for t in trajectories if t), default=0)
    if max_ref and len(res) > _MAX_TRAJECTORY_TO_REFERENCE_SUPERSET_SIZE_FACTOR * max_ref:
        print(
            "WARNING: Response set size ({}) exceeds {}x the maximum reference set size ({}); success may be coincidental."
            .format(len(res), _MAX_TRAJECTORY_TO_REFERENCE_SUPERSET_SIZE_FACTOR, max_ref)
        )

    for reference_trajectory in trajectories:
        if len(res) < len(reference_trajectory):
            continue

        matches_trajectory = True
        for reference_element in reference_trajectory:
            matches_element = False

            for res_element in res:
                matches_element = check_cb(res_element, reference_element)
                if matches_element:
                    break

            if matches_element:
                continue

            matches_trajectory = False

            break

        if matches_trajectory:
            return True

    return False