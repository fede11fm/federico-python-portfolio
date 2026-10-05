# Preparare la demo al colloquio

## Demo breve

1. Avvia `docker compose up --build --detach --wait` e apri la home.
2. Mostra la pagina generata da Python e la scena 3D, indicando che WebGL è eseguito nel browser.
3. Apri `/docs`, esegui `GET /api/profile` e confronta il risultato con la pagina.
4. Mostra `app/models.py`: tipi, campi obbligatori e validazione del profilo.
5. Esegui `uv run pytest` e spiega il test che verifica che il CV scaricato sia completo e identico all'originale.
6. Mostra Dockerfile, utente non-root e healthcheck, poi la pipeline GitHub.

## Domande da saper affrontare

**Perché FastAPI?** Definisce le route, valida le risposte tramite modelli e genera OpenAPI. Il sito usa Jinja2 per HTML lato server. Le route che leggono file sono funzioni sincrone, eseguite da FastAPI nel threadpool.

**Perché un'application factory?** Consente ai test di costruire un servizio con configurazione e dati isolati. La logica di startup rimane unica.

**Perché Pydantic?** Lo schema è condiviso da dati, API e template. Campi sconosciuti e valori invalidi vengono rifiutati all'avvio. Non si fa affidamento su un dizionario arbitrario.

**Perché niente database?** I dati sono pochi, di sola lettura e versionati nel repository. Un database sarebbe giustificato da editing, account o dati aggiornati dagli utenti.

**Qual è il limite di `/health`?** Conferma che l'applicazione è avviata dopo il caricamento dei dati. Non verifica continuamente la disponibilità di servizi esterni; qui non ce ne sono. Se qualcuno rimuove il PDF dopo il startup, il download restituisce 404.

**Come funziona Docker?** Il primo stadio installa le dipendenze dal lockfile. Il runtime copia solo ambiente Python e applicazione, avvia Uvicorn come utente non-root e riceve i segnali correttamente tramite un comando exec. Compose aggiunge filesystem in sola lettura e restrizioni.

**Cosa dimostrano i test?** Contratti API, rendering dei dati corretti, escape dell'HTML, file scaricato e intestazioni, rifiuto di dati invalidi, path indipendenti dalla working directory e impossibilità di scaricare percorsi arbitrari.

**Come lo distribuiresti?** Host per container, immagine versionata, reverse proxy HTTPS, monitoraggio e gestione della configurazione. GitHub ospita il codice; non avvia da solo un backend Python.

## Presentarlo con trasparenza

Leggi e prova il codice prima di presentarlo. Spiega le parti che comprendi e le decisioni che sapresti modificare. Non attribuire Python alle esperienze lavorative che nel CV usavano altre tecnologie. Questo portfolio è un progetto dimostrativo assistito, distinto da quelle esperienze; la sua utilità al colloquio dipende dalla tua capacità di discuterlo.
