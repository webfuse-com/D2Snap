import sys
from typing import Optional


_RAW_ARGS = [None, *sys.argv[1:]]


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