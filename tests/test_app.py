"""Test dei contratti HTTP, della validazione e delle invarianti del curriculum."""

from collections.abc import Iterator
from dataclasses import replace
from pathlib import Path
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app
from app.models import Profile


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(create_app()) as test_client:
        yield test_client


def test_homepage_is_generated_from_profile(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    for text in ["Centro Chirurgico Toscano", "Uno Informatica", "Python 3.13", "FastAPI"]:
        assert text in response.text
    for text in ["Kiron", "Verisure", "IVASS", "OAM", "Studio commerciale"]:
        assert text not in response.text
    assert "/static/scene.js" in response.text
    assert "/cv" in response.text
    assert "Percorso triennale non concluso" in response.text


def test_profile_contract_matches_html(client: TestClient) -> None:
    response = client.get("/api/profile")
    assert response.status_code == 200
    profile = Profile.model_validate(response.json())
    html = client.get("/").text
    assert profile.name in html
    assert profile.email in html
    assert len(profile.experiences) == 2
    assert profile.experiences[0].technologies == ("JavaScript", "React", "HTML", "SQL")
    assert profile.experiences[1].technologies == ("C++", "JavaScript", "Angular")


def test_download_is_the_complete_original_pdf(client: TestClient) -> None:
    response = client.get("/cv")
    assert response.status_code == 200
    assert response.content == Settings().cv_path.read_bytes()
    assert response.content.startswith(b"%PDF-")
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers["content-disposition"]
    assert "CV-Federico-Mariottini.pdf" in response.headers["content-disposition"]
    assert response.headers["cache-control"] == "no-store"


def test_missing_cv_returns_clear_404_after_startup(tmp_path: Path) -> None:
    cv = tmp_path / "cv.pdf"
    cv.write_bytes(Settings().cv_path.read_bytes())
    with TestClient(create_app(replace(Settings(), cv_path=cv))) as client:
        cv.unlink()
        response = client.get("/cv")
        assert response.status_code == 404
        assert response.json() == {"detail": "Curriculum non disponibile"}


def test_health_and_openapi_are_usable(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok", "version": "1.0.0"}
    schema = client.get("/openapi.json").json()
    assert set(schema["paths"]) == {"/health", "/api/profile", "/cv"}
    assert (
        schema["paths"]["/api/profile"]["get"]["responses"]["200"]["content"]["application/json"][
            "schema"
        ]["$ref"]
        == "#/components/schemas/Profile"
    )
    docs = client.get("/docs")
    assert docs.status_code == 200
    assert "/static/vendor/swagger-ui-bundle.js" in docs.text
    assert "cdn.jsdelivr" not in docs.text


@pytest.mark.parametrize("path", ["/", "/api/profile", "/cv", "/health", "/missing"])
def test_headers_and_unique_request_ids(client: TestClient, path: str) -> None:
    response = client.get(path)
    UUID(hex=response.headers["x-request-id"])
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "object-src 'none'" in response.headers["content-security-policy"]
    assert "unsafe-inline" not in response.headers["content-security-policy"]
    assert client.get(path).headers["x-request-id"] != response.headers["x-request-id"]


def test_static_assets_and_no_arbitrary_file_downloads(client: TestClient) -> None:
    for asset in ["style.css", "scene.js", "vendor/three.module.js", "vendor/swagger-ui.css"]:
        assert client.get(f"/static/{asset}").status_code == 200
    assert client.get("/cv/../../pyproject.toml").status_code == 404
    assert client.get("/static/%2e%2e/data/profile.json").status_code == 404
    assert client.get("/.env").status_code == 404


def test_startup_rejects_invalid_profile(tmp_path: Path) -> None:
    data = tmp_path / "profile.json"
    data.write_text('{"name":"Federico","unexpected":true}', encoding="utf-8")
    with (
        pytest.raises(ValidationError),
        TestClient(create_app(replace(Settings(), profile_path=data))),
    ):
        pass


def test_template_escapes_profile_content(tmp_path: Path) -> None:
    profile = Profile.model_validate_json(Settings().profile_path.read_text(encoding="utf-8-sig"))
    data = profile.model_dump()
    data["experiences"][0]["company"] = '<script>alert("x")</script>'
    location = tmp_path / "profile.json"
    location.write_text(Profile.model_validate(data).model_dump_json(), encoding="utf-8")
    with TestClient(create_app(replace(Settings(), profile_path=location))) as client:
        response = client.get("/")
        assert "<script>alert" not in response.text
        assert "&lt;script&gt;" in response.text


def test_paths_work_outside_project_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.chdir(tmp_path)
    with TestClient(create_app()) as client:
        assert client.get("/").status_code == 200
        assert client.get("/cv").status_code == 200
