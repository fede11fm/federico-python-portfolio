# ORÉVA — Atelier orafo

[![Python and Docker checks](https://github.com/fede11fm/federico-python-portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/fede11fm/federico-python-portfolio/actions/workflows/ci.yml)

Sito dimostrativo per **ORÉVA**, un'azienda orafa inventata: direzione visiva editoriale, catalogo di gioielli e un anello 3D interattivo. Il backend usa **Python 3.13, FastAPI, Pydantic e Jinja2**. L'applicazione si avvia con **Docker Compose**.

Marchio, prodotti e descrizioni sono contenuti di fantasia. Non sono presenti pagamenti, ordini o invii di richieste a un'azienda reale. Il progetto serve a mostrare un'applicazione Python completa e a discuterne le scelte tecniche al colloquio.

**GitHub ospita il codice del progetto. Docker esegue il sito sul computer su cui avvii il container.** Pubblicare il repository non rende il backend disponibile su Internet.

## Avvio su Windows con Docker Desktop

Installa e apri [Docker Desktop per Windows](https://docs.docker.com/desktop/setup/install/windows-install/), scegliendo i container Linux. Docker Compose è incluso. Con Git installato, apri PowerShell:

```powershell
git clone https://github.com/fede11fm/federico-python-portfolio.git
cd federico-python-portfolio
docker compose up --build
```

Se hai già scaricato il progetto, entra nella sua cartella ed esegui soltanto l'ultimo comando. Attendi `Uvicorn running`, poi apri [il sito locale](http://localhost:8000/) o [le API interattive](http://localhost:8000/docs). La prima build scarica l'immagine Python e le dipendenze; gli avvii successivi riutilizzano la cache.

Lascia il terminale aperto. **Ctrl+C** ferma il sito. Per rimuovere i container, dalla stessa cartella esegui:

```powershell
docker compose down
```

Con Docker Desktop puoi anche lasciare il sito in background:

```powershell
docker compose up --build --detach --wait
docker compose logs --follow
```

In questo caso usa `docker compose down` per fermarlo. Le opzioni sono descritte nella [documentazione di Docker Compose](https://docs.docker.com/reference/cli/docker/compose/up/).

## Avvio su questo PC: Docker dentro Ubuntu/WSL

La configurazione già predisposta per questo progetto usa **Docker Engine in Ubuntu/WSL**, senza Docker Desktop. La cartella Windows `D:\siti web\ME` corrisponde a `/mnt/d/siti web/ME` in Ubuntu. Da PowerShell:

```powershell
wsl -d Ubuntu --cd "/mnt/d/siti web/ME" -- env BIND_ADDRESS=0.0.0.0 docker compose up --build --remove-orphans
```

`--remove-orphans` rimuove il precedente container del portfolio, appartenente allo stesso progetto Compose. `BIND_ADDRESS=0.0.0.0` rende la porta accessibile sulle interfacce di Ubuntu, permettendo a Windows di raggiungere l'indirizzo WSL. La configurazione predefinita del repository resta limitata a `127.0.0.1`.

Lascia il terminale aperto. Dopo l'avvio, apri **un altro PowerShell** e recupera l'indirizzo:

```powershell
wsl -d Ubuntu -- hostname -I
```

Usa il primo indirizzo IPv4 restituito: `http://INDIRIZZO_IP:8000/`. L'indirizzo può cambiare dopo il riavvio di WSL. **Ctrl+C** nel terminale con i log ferma il sito.

È disponibile anche uno script che trova la cartella e mostra l'indirizzo da aprire:

```powershell
cd "D:\siti web\ME"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-docker.ps1
```

Lo script non installa software e non modifica `.env`; richiede Docker Engine e Compose già disponibili in Ubuntu. Esegue Compose in primo piano: i soli servizi systemd non mantengono attiva una distribuzione WSL, come spiegato nella [documentazione Microsoft](https://learn.microsoft.com/en-us/windows/wsl/systemd).

## Aggiornare la copia locale

Dalla cartella del repository:

```sh
git pull --ff-only
docker compose up --build --remove-orphans
```

Con il setup WSL di questo PC usa il comando WSL riportato sopra dopo `git pull`. La build include le modifiche al sito; un semplice refresh del browser non ricostruisce il container.

## Configurazione

La porta standard è `8000`. Per personalizzarla, copia `.env.example` in `.env` e modifica `PORT`. `BIND_ADDRESS` sceglie l'interfaccia di ascolto; `LOG_LEVEL` controlla i log. `.env` resta locale e non viene pubblicato su GitHub.

L'immagine `oreva-atelier:local` usa un utente senza privilegi e un healthcheck HTTP. Compose aggiunge filesystem in sola lettura, una directory temporanea in memoria e restrizioni sulle capability. Non occorrono credenziali o un database per avviare la demo.

## Sviluppo Python

Installa [uv](https://docs.astral.sh/uv/getting-started/installation/), poi:

```sh
uv sync --frozen --python 3.13
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```text
app/
  main.py          application factory, lifecycle, middleware e route
  config.py        configurazione e percorsi
  models.py        schema tipizzato del catalogo
  repository.py    caricamento e validazione dei dati
  data/catalog.json
  templates/       HTML generato con Jinja2
  static/          immagini, CSS, scena 3D e librerie locali
tests/             contratti API, dati invalidi, rendering e sicurezza
scripts/start-docker.ps1
Dockerfile         build a due stadi, runtime non-root
compose.yaml       servizio atelier e porta locale
.github/workflows/ci.yml
```

Il catalogo viene caricato e validato all'avvio. Gli stessi dati alimentano HTML e API JSON; gli identificatori dei gioielli permettono di recuperare una singola scheda. I percorsi sono risolti dal modulo Python e non dalla directory da cui parte il server. Jinja2 esegue l'escape del testo; middleware e log assegnano un ID alle richieste e aggiungono intestazioni di sicurezza.

La scena 3D è eseguita nel browser con Three.js: Python gestisce il backend, i dati e il rendering dei template. Le librerie JavaScript sono distribuite localmente. Il catalogo è consultabile anche senza interagire con la scena.

## API

| Metodo | Percorso | Risultato |
| --- | --- | --- |
| GET | `/` | Sito ORÉVA |
| GET | `/api/catalog` | Catalogo validato completo |
| GET | `/api/jewels/{slug}` | Scheda del gioiello oppure 404 |
| GET | `/health` | Stato del servizio e versione |
| GET | `/docs` | Swagger UI interattiva |
| GET | `/openapi.json` | Schema OpenAPI generato |

Esempio di scheda: `/api/jewels/anello-materia`. Gli altri prodotti della demo sono `orecchini-orbita` e `collana-luce`.

## Verifica

```sh
uv run ruff check app tests
uv run ruff format --check app tests
uv run mypy app
uv run pytest
```

GitHub Actions esegue i controlli Python, costruisce il container, attende il healthcheck e verifica le risposte HTTP. Il catalogo si modifica in `app/data/catalog.json`; i campi consentiti sono definiti in `app/models.py`. Layout e stile si trovano in `app/templates/index.html` e `app/static/style.css`.

Per preparare la presentazione tecnica: [guida al colloquio](docs/COLLOQUIO.md).

## Scelte tecniche

Un JSON versionato è sufficiente per questo catalogo di sola lettura. Un pannello di amministrazione richiederebbe persistenza, autenticazione e autorizzazione. Un e-commerce reale richiederebbe anche prezzi, disponibilità, ordini e pagamenti, che questa demo non implementa.

Le dipendenze Python sono bloccate in `uv.lock`; per una release immutabile si può fissare anche il digest dell'immagine base. La pubblicazione del sito richiede un host capace di eseguire container e una configurazione HTTPS.

## Componenti di terze parti

- Three.js 0.170.0: licenza MIT in `app/static/vendor/LICENSE-three`.
- Swagger UI 5.31.0: licenza Apache 2.0 in `app/static/vendor/LICENSE-swagger-ui`.- Cormorant Garamond e DM Sans: SIL Open Font License, inclusa in `app/static/fonts/LICENSE-*.txt`.

Le tre fotografie del catalogo sono immagini originali generate con AI per questo marchio immaginario. Il visualizzatore usa un modello 3D illustrativo creato in codice; non è una ricostruzione esatta dei gioielli fotografati. I font, le immagini e le librerie vengono serviti dal container, senza dipendenze da CDN durante la visita.
