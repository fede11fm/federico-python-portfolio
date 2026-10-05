"""Application factory, lifecycle e intestazioni HTTP condivise."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from time import perf_counter
from typing import cast
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.exceptions import HTTPException
from starlette.middleware.base import RequestResponseEndpoint

from app.config import Settings
from app.models import Catalog, HealthStatus, Product
from app.repository import CatalogRepository

logger = logging.getLogger("oreva")
CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self'; "
    "img-src 'self' data:; font-src 'self'; connect-src 'self'; "
    "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
)


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or Settings.from_env()
    templates = Jinja2Templates(directory=config.templates_dir)
    repository = CatalogRepository(config.catalog_path)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        logging.basicConfig(level=config.log_level, format="%(levelname)s %(name)s %(message)s")
        application.state.catalog = repository.load()
        logger.info("event=startup version=%s", config.version)
        yield
        logger.info("event=shutdown")

    application = FastAPI(
        title="ORÉVA — Catalogo API",
        description="Catalogo di un atelier orafo immaginario. Progetto dimostrativo.",
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
        catalog: Catalog = request.app.state.catalog
        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={"catalog": catalog, "year": datetime.now(UTC).year},
        )

    @application.get("/api/catalog", response_model=Catalog, tags=["catalog"])
    def get_catalog(request: Request) -> Catalog:
        return cast(Catalog, request.app.state.catalog)

    @application.get(
        "/api/jewels/{slug}",
        response_model=Product,
        tags=["catalog"],
        responses={404: {"description": "Gioiello non trovato"}},
    )
    def get_jewel(slug: str, request: Request) -> Product:
        catalog = cast(Catalog, request.app.state.catalog)
        for product in catalog.products:
            if product.slug == slug:
                return product
        raise HTTPException(status_code=404, detail="Gioiello non trovato")

    @application.get("/health", response_model=HealthStatus, tags=["operations"])
    def health() -> HealthStatus:
        return HealthStatus(version=config.version)

    @application.get("/docs", response_class=HTMLResponse, include_in_schema=False)
    def api_docs(request: Request) -> Response:
        return templates.TemplateResponse(request=request, name="docs.html")

    return application


app = create_app()
