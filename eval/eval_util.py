import re
import sys
from pathlib import Path
from typing import Callable, Optional


_RAW_ARGS = [None, *sys.argv[1:]]

INSTRUCTIONS_TEMPLATE = (Path(__file__).parent / "instructions.template.md").read_text()


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
    instructions = INSTRUCTIONS_TEMPLATE

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