"""Repository di sola lettura: il catalogo viene validato all'avvio."""

from pathlib import Path

from app.models import Catalog


class CatalogRepository:
    def __init__(self, path: Path) -> None:
        self._path = path

    def load(self) -> Catalog:
        return Catalog.model_validate_json(self._path.read_text(encoding="utf-8-sig"))
