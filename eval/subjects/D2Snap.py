import json
import math
import sys
from multiprocessing import Process
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from eval_util import parse_option


EVALS = {
    "D2Snap.1": {"rE": 0.1, "rA": 0.1, "rT": 0.1},
    "D2Snap.4": {"rE": 0.4, "rA": 0.4, "rT": 0.4},
    "D2Snap.7": {"rE": 0.7, "rA": 0.7, "rT": 0.7},
    "D2Snap.3-9-6": {"rE": 0.3, "rA": 0.9, "rT": 0.6},
    "D2Snap.6-3-9": {"rE": 0.6, "rA": 0.3, "rT": 0.9},
    "D2Snap.9-6-3": {"rE": 0.9, "rA": 0.6, "rT": 0.3},
    "D2Snap.lin": {"rE": 1.0, "rA": 1.0, "rT": 0},
    "D2Snap.ada.4096": {"maxTokens": 4096},
    "D2Snap.ada.8192": {"maxTokens": 8192},
    "D2Snap.ada.32768": {"maxTokens": 32768},
}


def _config_to_json(config: dict) -> dict:
    return { k: ("Infinity" if v == math.inf else v) for k, v in config.items() }

def _run_single(identifier: str, config: dict) -> None:
    from subjects.D2Snap_worker import run_worker_evaluation

    run_worker_evaluation(identifier, _config_to_json(config))

def _run_in_process(identifier: str, config: dict) -> None:
    if "--workers" in sys.argv:
        idx = sys.argv.index("--workers")

        sys.argv[idx + 1] = "1"
    else:
        sys.argv.extend(["--workers", "1"])

    _run_single(identifier, config)


if __name__ == "__main__":
    single = parse_option("--config")
    if single:
        if single not in EVALS:
            raise ReferenceError("Undefined configuration")

        _run_single(single, EVALS[single])
    else:
        procs = []

        for identifier, config in EVALS.items():
            p = Process(target=_run_in_process, args=(identifier, config))
            p.start()
            procs.append(p)

        for p in procs:
            p.join()