"""Contratti HTTP, validazione del catalogo e integrità della dimostrazione."""

from collections.abc import Iterator
from dataclasses import replace
from pathlib import Path
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app
from app.models import Catalog, Product


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(create_app()) as test_client:
        yield test_client


@pytest.fixture
def catalog() -> Catalog:
    return Catalog.model_validate_json(Settings().catalog_path.read_text(encoding="utf-8-sig"))


def test_homepage_is_generated_from_catalog(client: TestClient, catalog: Catalog) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert catalog.name in response.text
    for product in catalog.products:
        assert product.name in response.text
        assert product.category in response.text
        assert product.image in response.text
    assert "/static/oreva.js" in response.text
    assert "dimostrativo" in response.text.lower()
    for personal_detail in ["Mariottini", "federicomariottini7", "347 074 4294", "/cv"]:
        assert personal_detail not in response.text


def test_catalog_contract_and_demo_identity(client: TestClient, catalog: Catalog) -> None:
    response = client.get("/api/catalog")
    assert response.status_code == 200
    assert Catalog.model_validate(response.json()) == catalog
    assert catalog.name == "ORÉVA"
    assert catalog.city == "Arezzo, Toscana"
    assert catalog.demo is True
    assert len(catalog.products) == 3
    assert {product.category for product in catalog.products} == {"Anelli", "Orecchini", "Collane"}


def test_single_jewel_matches_catalog(client: TestClient, catalog: Catalog) -> None:
    for product in catalog.products:
        response = client.get(f"/api/jewels/{product.slug}")
        assert response.status_code == 200
        assert Product.model_validate(response.json()) == product


def test_unknown_jewel_returns_404(client: TestClient) -> None:
    response = client.get("/api/jewels/gioiello-inesistente")
    assert response.status_code == 404
    assert response.json() == {"detail": "Gioiello non trovato"}


@pytest.mark.parametrize("path", ["/cv", "/api/profile", "/assets/CV-Federico-Mariottini.pdf"])
def test_personal_portfolio_routes_are_removed(client: TestClient, path: str) -> None:
    assert client.get(path).status_code == 404


def test_health_openapi_and_local_docs(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok", "version": "2.0.0"}
    schema = client.get("/openapi.json").json()
    assert set(schema["paths"]) == {"/health", "/api/catalog", "/api/jewels/{slug}"}
    assert (
        schema["paths"]["/api/catalog"]["get"]["responses"]["200"]["content"]["application/json"][
            "schema"
        ]["$ref"]
        == "#/components/schemas/Catalog"
    )
    docs = client.get("/docs")
    assert docs.status_code == 200
    assert "ORÉVA" in docs.text
    assert "/static/vendor/swagger-ui-bundle.js" in docs.text
    assert "cdn.jsdelivr" not in docs.text


@pytest.mark.parametrize(
    "path", ["/", "/api/catalog", "/api/jewels/anello-materia", "/health", "/missing"]
)
def test_headers_and_unique_request_ids(client: TestClient, path: str) -> None:
    response = client.get(path)
    UUID(hex=response.headers["x-request-id"])
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "object-src 'none'" in response.headers["content-security-policy"]
    assert "unsafe-inline" not in response.headers["content-security-policy"]
    assert client.get(path).headers["x-request-id"] != response.headers["x-request-id"]


def test_static_assets_and_no_arbitrary_file_access(client: TestClient) -> None:
    for asset in [
        "style.css",
        "oreva.js",
        "scene.js",
        "vendor/three.module.js",
        "vendor/swagger-ui.css",
    ]:
        assert client.get(f"/static/{asset}").status_code == 200
    assert client.get("/static/%2e%2e/data/catalog.json").status_code == 404
    assert client.get("/.env").status_code == 404


def test_startup_rejects_invalid_catalog(tmp_path: Path) -> None:
    data = tmp_path / "catalog.json"
    data.write_text('{"name":"ORÉVA","unexpected":true}', encoding="utf-8")
    with (
        pytest.raises(ValidationError),
        TestClient(create_app(replace(Settings(), catalog_path=data))),
    ):
        pass


def test_catalog_rejects_ambiguous_slugs(catalog: Catalog) -> None:
    data = catalog.model_dump()
    data["products"][1]["slug"] = data["products"][0]["slug"]
    with pytest.raises(ValidationError, match="slug univoco"):
        Catalog.model_validate(data)


@pytest.mark.parametrize("price", [0, -1, 12.5])
def test_product_price_must_be_a_positive_whole_euro(catalog: Catalog, price: float) -> None:
    data = catalog.products[0].model_dump()
    data["price_eur"] = price
    with pytest.raises(ValidationError):
        Product.model_validate(data)


def test_product_images_cannot_reference_external_hosts(catalog: Catalog) -> None:
    data = catalog.products[0].model_dump()
    data["image"] = "https://example.com/image.webp"
    with pytest.raises(ValidationError):
        Product.model_validate(data)


def test_template_escapes_catalog_content(tmp_path: Path, catalog: Catalog) -> None:
    data = catalog.model_dump()
    data["products"][0]["name"] = '<script>alert("x")</script>'
    location = tmp_path / "catalog.json"
    location.write_text(Catalog.model_validate(data).model_dump_json(), encoding="utf-8")
    with TestClient(create_app(replace(Settings(), catalog_path=location))) as client:
        response = client.get("/")
        assert "<script>alert" not in response.text
        assert "&lt;script&gt;" in response.text


def test_paths_work_outside_project_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.chdir(tmp_path)
    with TestClient(create_app()) as client:
        assert client.get("/").status_code == 200
        assert client.get("/api/catalog").status_code == 200
