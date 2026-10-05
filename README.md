# ORÉVA — Atelier orafo

[![Checks](https://github.com/fede11fm/federico-python-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/fede11fm/federico-python-portfolio/actions/workflows/ci.yml)

Sito dimostrativo per un'azienda orafa immaginaria, con catalogo, ricerca, preferiti, carrello dimostrativo e gioiello 3D interattivo.
Backend **Python 3.13 / FastAPI**, template **Jinja2**, dati validati con **Pydantic** e frontend **JavaScript / Three.js**.
Marchio e prodotti sono inventati; la demo non gestisce ordini o pagamenti.

## Avvio con Docker

Con Docker e Compose installati, dalla cartella del progetto:

```sh
docker compose up --build
```

Apri [localhost:8000](http://localhost:8000/). Premi **Ctrl+C** per fermare il sito.
GitHub ospita il codice; Docker esegue l'applicazione.

## Sviluppo e test

```sh
uv sync --frozen --python 3.13
uv run uvicorn app.main:app --reload
uv run pytest
```

## File e API

- `app/data/catalog.json`: contenuti del catalogo.
- `app/main.py`, `models.py`, `repository.py`: route, schema e caricamento dei dati.
- `app/templates/` e `app/static/`: pagine, stile, immagini e scena 3D.
- `Dockerfile` e `compose.yaml`: ambiente di esecuzione.

API: `GET /api/catalog`, `GET /api/jewels/{slug}` e `GET /health`.
Documentazione interattiva: [localhost:8000/docs](http://localhost:8000/docs).
GitHub Actions verifica Python e costruisce il container.

Le immagini sono originali, generate per il progetto. Le licenze delle librerie e dei font sono incluse in `app/static/vendor/` e `app/static/fonts/`.
