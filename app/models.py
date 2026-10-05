"""Modelli condivisi tra template HTML e risposte JSON."""

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Experience(StrictModel):
    company: str = Field(min_length=1)
    role: str = Field(min_length=1)
    period: str = Field(min_length=1)
    description: str = Field(min_length=1)
    technologies: tuple[str, ...] = Field(min_length=1)


class SkillGroup(StrictModel):
    title: str
    symbol: str
    technologies: tuple[str, ...] = Field(min_length=1)


class Education(StrictModel):
    title: str
    institution: str
    period: str | None = None
    note: str | None = None


class Profile(StrictModel):
    name: str = Field(min_length=1)
    role: str
    city: str
    email: str = Field(pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    phone: str = Field(pattern=r"^\+[0-9]+$")
    phone_display: str
    summary: str
    experiences: tuple[Experience, ...] = Field(min_length=1)
    skills: tuple[SkillGroup, ...] = Field(min_length=1)
    education: tuple[Education, ...] = Field(min_length=1)


class HealthStatus(StrictModel):
    status: str = "ok"
    version: str
