# Presentare ORÉVA al colloquio

ORÉVA è un marchio orafo inventato. Il progetto dimostra un backend Python che serve un sito aziendale e un catalogo coerente tra template HTML e API. Il frontend 3D è JavaScript/WebGL: spiegare questa divisione aiuta a mostrare cosa fa davvero Python.

## Demo in cinque minuti

1. Avvia `docker compose up --build` e apri la home. Con Docker Engine in WSL usa il comando specifico nel README e lascia il terminale aperto.
2. Mostra il catalogo e l'anello interattivo. Spiega che il server genera l'HTML da dati validati, mentre il browser disegna la scena.
3. Apri `/docs`, esegui `GET /api/catalog` e `GET /api/jewels/anello-materia`. Prova uno slug inesistente per mostrare la risposta 404.
4. Apri `app/models.py` e `app/repository.py`: illustra campi, validazione e caricamento dei dati all'avvio.
5. Esegui `uv run pytest`, poi mostra Dockerfile e una pipeline GitHub conclusa con successo. Scegli un test e spiega quale errore concreto impedisce.

## Domande tecniche

**Perché FastAPI e Jinja2?** FastAPI gestisce route, contratti di risposta e schema OpenAPI. Jinja2 produce l'HTML lato server dagli stessi dati usati dall'API, evitando una seconda fonte per il catalogo.

**Perché un'application factory?** I test possono creare applicazioni con configurazioni e file isolati. La logica di avvio resta unica, condivisa dalla demo e dai test.

**Cosa valida Pydantic?** I dati devono rispettare lo schema prima che il servizio sia avviato. Le risposte API hanno modelli espliciti. Mostra un vincolo reale nel codice e il relativo test, evitando di attribuire allo schema controlli che non contiene.

**Perché usare un file JSON?** Il catalogo è piccolo, di sola lettura e versionato con il codice. Un database sarebbe utile con editing frequente, utenti o dati condivisi da più istanze; qui aggiungerebbe un servizio senza risolvere una necessità attuale.

**Cosa succede se manca un prodotto?** La route della singola scheda restituisce 404. Un catalogo invalido all'avvio impedisce invece la partenza dell'applicazione, così il container non dichiara sano un servizio con dati incompleti.

**Cosa misura `/health`?** Conferma che l'applicazione è in esecuzione dopo il caricamento dei dati. Il catalogo vive in memoria e non dipende da un database o da API esterne. Non è una misura delle prestazioni né un sistema completo di monitoraggio.

**Come funziona Docker?** Il primo stadio installa dipendenze dal lockfile. Il runtime copia ambiente Python e applicazione nella stessa posizione, avvia Uvicorn come utente non-root e include un healthcheck. Compose espone la porta 8000 e aggiunge restrizioni del container.

**Come si collegano GitHub e Docker?** GitHub conserva codice e cronologia, mentre Actions controlla il progetto. Docker costruisce un'immagine ed esegue il server. Il sito diventa pubblico solo quando il container viene avviato su un host raggiungibile da Internet.

**Come lo estenderesti?** Per una gestione del catalogo: database, pannello autenticato, migrazioni e test dei permessi. Per un negozio: disponibilità, ordini, pagamenti e gestione degli errori. Prima definirei i requisiti; la demo attuale non riceve transazioni o richieste reali.

## Presentarlo con trasparenza

Prima del colloquio, avvia il progetto, leggi il codice e prova una piccola modifica al catalogo. Presentalo come un progetto dimostrativo sviluppato con assistenza e chiarisci le parti che sapresti spiegare o cambiare. Non attribuirti esperienze commerciali con ORÉVA: l'azienda è inventata. Il valore della demo è la tua capacità di comprendere il codice e discuterne i compromessi.