"""Application factory, lifecycle e intestazioni HTTP condivise."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from time import perf_counter
from typing import cast
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.exceptions import HTTPException
from starlette.middleware.base import RequestResponseEndpoint

from app.config import Settings
from app.models import HealthStatus, Profile
from app.repository import ProfileRepository

logger = logging.getLogger("portfolio")
CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self'; "
    "img-src 'self' data:; font-src 'self'; connect-src 'self'; "
    "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
)


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or Settings.from_env()
    templates = Jinja2Templates(directory=config.templates_dir)
    repository = ProfileRepository(config.profile_path)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        logging.basicConfig(level=config.log_level, format="%(levelname)s %(name)s %(message)s")
        application.state.profile = repository.load()
        if not config.cv_path.is_file():
            raise RuntimeError("Il curriculum completo non è disponibile")
        logger.info("event=startup version=%s", config.version)
        yield
        logger.info("event=shutdown")

    application = FastAPI(
        title="Federico Mariottini — Portfolio API",
        description="API di sola lettura del portfolio professionale.",
        version=config.version,
        docs_url=None,
        redoc_url=None,
        lifespan=lifespan,
    )
    application.mount("/static", StaticFiles(directory=config.static_dir), name="static")

    @application.middleware("http")
    async def http_metadata(request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = uuid4().hex
        start = perf_counter()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = CSP
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if request.url.path != "/health":
            logger.info(
                "request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
                request_id,
                request.method,
                request.url.path,
                response.status_code,
                (perf_counter() - start) * 1000,
            )
        return response

    @application.get("/", response_class=HTMLResponse, include_in_schema=False)
    def homepage(request: Request) -> Response:
        profile: Profile = request.app.state.profile
        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={"profile": profile, "year": datetime.now(UTC).year},
        )

    @application.get("/api/profile", response_model=Profile, tags=["profile"])
    def get_profile(request: Request) -> Profile:
        return cast(Profile, request.app.state.profile)

    @application.get("/health", response_model=HealthStatus, tags=["operations"])
    def health() -> HealthStatus:
        return HealthStatus(version=config.version)

    @application.get("/cv", response_class=FileResponse, tags=["profile"])
    def download_cv() -> FileResponse:
        if not config.cv_path.is_file():
            raise HTTPException(status_code=404, detail="Curriculum non disponibile")
        return FileResponse(
            config.cv_path,
            media_type="application/pdf",
            filename="CV-Federico-Mariottini.pdf",
            headers={"Cache-Control": "no-store"},
        )

    @application.get("/docs", response_class=HTMLResponse, include_in_schema=False)
    def api_docs(request: Request) -> Response:
        return templates.TemplateResponse(request=request, name="docs.html")

    return application


app = create_app()
