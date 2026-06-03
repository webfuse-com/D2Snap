import shutil
from pathlib import Path


class Logger:
    _LOGS_DIR = Path(__file__).parent / "logs"

    def __init__(self, directory: str, clean_dir: bool = True):
        self._path = self._LOGS_DIR / directory

        if clean_dir and self._path.exists():
            shutil.rmtree(self._path, ignore_errors=True)

        self._path.mkdir(parents=True, exist_ok=True)

    def write(self, filename: str, data: str) -> None:
        (self._path / filename).write_text(data)