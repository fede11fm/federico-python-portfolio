"""Modelli condivisi tra catalogo HTML e risposte JSON."""

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Product(StrictModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=1)
    category: Literal["Anelli", "Bracciali", "Collane", "Orecchini", "Cerimonia", "Uomo"]
    collection: str = Field(min_length=1)
    material: str = Field(min_length=1)
    description: str = Field(min_length=1)
    price_eur: int = Field(gt=0, strict=True)
    image: str = Field(pattern=r"^/static/images/[a-z0-9-]+\.webp$")
    image_alt: str = Field(min_length=1)


class Catalog(StrictModel):
    name: str = Field(min_length=1)
    subtitle: str = Field(min_length=1)
    city: str = Field(min_length=1)
    description: str = Field(min_length=1)
    demo: Literal[True]
    products: tuple[Product, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_product_slugs(self) -> Self:
        slugs = [product.slug for product in self.products]
        if len(slugs) != len(set(slugs)):
            raise ValueError("Ogni gioiello deve avere uno slug univoco")
        return self


class HealthStatus(StrictModel):
    status: Literal["ok"] = "ok"
    version: str
