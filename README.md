# Federico Mariottini — Python Portfolio

Portfolio personale orientato al mondo informatico, con backend **Python 3.13 / FastAPI**, template **Jinja2**, profilo validato con **Pydantic**, scena **Three.js** e avvio con **Docker Compose**.

Questo repository è un progetto dimostrativo da esplorare e discutere al colloquio. Le esperienze professionali riportate restano quelle del curriculum: i gestionali al Centro Chirurgico Toscano usavano JavaScript, React, HTML e SQL; il tirocinio a Uno Informatica C++, JavaScript e Angular. Il progetto Python di questo repository è presentato separatamente da quelle esperienze.

## Avvio con Docker

Requisiti: Docker Engine/Desktop e Docker Compose v2.

```sh
docker compose up --build --detach --wait
```

Apri il sito su **http://localhost:8000** e l'API interattiva su **http://localhost:8000/docs**.

```sh
docker compose logs --follow
docker compose down
```

La porta predefinita è esposta solo sull'interfaccia locale. Per cambiarla, copia `.env.example` in `.env` e modifica `PORT`. `BIND_ADDRESS` controlla l’interfaccia di ascolto (predefinita `127.0.0.1`). Il container usa un utente senza privilegi, filesystem in sola lettura, nessuna capability aggiuntiva e un healthcheck HTTP. Non viene pubblicato automaticamente su Internet.

## Sviluppo locale

Requisito: [uv](https://docs.astral.sh/uv/getting-started/installation/). La versione usata nella pipeline è `0.12.7`.

```sh
uv sync --frozen --python 3.13
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

I percorsi dei dati, degli asset e dei template sono risolti dal modulo Python, non dalla directory da cui viene avviato il server.

## Struttura e flusso

```text
app/
  main.py          application factory, lifecycle, middleware, route HTTP
  config.py        configurazione e percorsi
  models.py        modelli Pydantic tipizzati
  repository.py    caricamento e validazione del profilo
  data/profile.json
  templates/       HTML generato con Jinja2
  static/          CSS, scena JS e librerie locali
  assets/          curriculum PDF completo
tests/             contratti HTTP, validazione, download e rendering
Dockerfile         build a due stadi, runtime non-root
compose.yaml       avvio e healthcheck
.github/workflows/ci.yml
```

Al startup, `ProfileRepository` legge il JSON e Pydantic verifica campi e tipi. Una configurazione invalida o un CV mancante impediscono l'avvio: non viene dichiarato sano un servizio incompleto. Lo stesso modello alimenta la pagina HTML e l'API JSON. Il profilo è caricato una volta e non è modificabile via HTTP.

Le richieste hanno un ID univoco, intestazioni di sicurezza e log con metodo, percorso, stato e durata. Il download usa un percorso PDF fisso e non accetta nomi di file forniti dall'utente. Jinja2 effettua l'escape del testo. La CSP limita script e stili all'origine del sito; Swagger UI e Three.js sono inclusi localmente.

La scena WebGL viene eseguita dal browser in JavaScript: il backend e il rendering dei template sono Python. Ruotare il monogramma, mettere in pausa e attivare il wireframe funziona anche da tastiera. L'animazione rispetta la preferenza di movimento ridotto e sospende il lavoro quando è fuori schermo.

## API

| Metodo | Percorso | Risultato |
| --- | --- | --- |
| GET | `/` | Portfolio HTML |
| GET | `/api/profile` | Profilo informatico validato |
| GET | `/cv` | Download del PDF completo originale |
| GET | `/health` | Stato del servizio e versione |
| GET | `/docs` | Swagger UI interattiva |
| GET | `/openapi.json` | Schema OpenAPI generato |

## Verifica

```sh
uv run ruff check app tests
uv run ruff format --check app tests
uv run mypy app
uv run pytest
```

La pipeline GitHub Actions esegue gli stessi controlli, costruisce l'immagine, attende il healthcheck e prova home, API e download nel container. Il PDF scaricato viene confrontato con quello originale incluso nel repository.

## Personalizzazione

- Aggiorna `app/data/profile.json` per esperienze, formazione e contatti. I campi ammessi sono definiti in `app/models.py`.
- Il sito mostra soltanto il profilo informatico. Il PDF in `app/assets/CV-Federico-Mariottini.pdf` è il curriculum completo, senza riscritture.
- Modifica il layout in `app/templates/index.html` e `app/static/style.css`.
- `LOG_LEVEL` permette di configurare la verbosità dei log.
- I dati personali e il CV sono pubblicati con il consenso del proprietario. Non servono credenziali per avviare il progetto.

## Scelte e limiti

Un JSON validato è sufficiente per un portfolio di sola lettura: aggiungere un database o autenticazione non avrebbe un caso d'uso attuale. Se si introducesse un pannello di modifica, servirebbero persistenza, autenticazione, autorizzazione e test dedicati. Non sono inclusi un modulo contatti né un sistema di invio email: il contatto apre il client email del visitatore.

Le versioni delle dipendenze sono bloccate in `uv.lock`; il tag base `python:3.13-slim-bookworm` riceve aggiornamenti upstream. Per distribuire una release immutabile si può fissare anche il digest dell'immagine. `compose.yaml` è destinato alla demo locale; una pubblicazione richiede un host Docker e un proxy HTTPS.

Per prepararsi alla discussione tecnica: [guida al colloquio](docs/COLLOQUIO.md).

## Componenti di terze parti

- Three.js 0.170.0: licenza MIT in `app/static/vendor/LICENSE-three`.
- Swagger UI 5.31.0: licenza Apache 2.0 in `app/static/vendor/LICENSE-swagger-ui`.

Le relative licenze si applicano ai componenti originali, non ai dati personali del curriculum.
