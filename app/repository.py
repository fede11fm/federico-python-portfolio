"""Repository di sola lettura: il profilo è validato prima di servire richieste."""

from pathlib import Path

from app.models import Profile


class ProfileRepository:
    def __init__(self, path: Path) -> None:
        self._path = path

    def load(self) -> Profile:
        return Profile.model_validate_json(self._path.read_text(encoding="utf-8-sig"))
