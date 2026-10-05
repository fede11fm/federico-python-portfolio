"""Configurazione esplicita, indipendente dalla working directory."""

import os
from dataclasses import dataclass
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent


@dataclass(frozen=True)
class Settings:
    profile_path: Path = APP_DIR / "data" / "profile.json"
    cv_path: Path = APP_DIR / "assets" / "CV-Federico-Mariottini.pdf"
    static_dir: Path = APP_DIR / "static"
    templates_dir: Path = APP_DIR / "templates"
    version: str = "1.0.0"
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "Settings":
        level = os.getenv("LOG_LEVEL", "INFO").upper()
        if level not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            raise ValueError("LOG_LEVEL non valido")
        return cls(log_level=level)
