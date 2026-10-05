[CmdletBinding()]
param(
    [string]$Distribution = 'Ubuntu',
    [ValidateRange(1, 65535)]
    [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
    throw 'WSL non disponibile. Usa Docker Desktop e il comando docker compose up --build indicato nel README.'
}

$projectDirectory = Split-Path -Parent $PSScriptRoot
$linuxDirectory = & wsl.exe -d $Distribution -- wslpath -u $projectDirectory
if ($LASTEXITCODE -ne 0 -or -not $linuxDirectory) {
    throw "Impossibile raggiungere la cartella del progetto nella distribuzione $Distribution."
}
$linuxDirectory = ($linuxDirectory | Select-Object -Last 1).Trim()

& wsl.exe -d $Distribution -- docker info --format '{{.ServerVersion}}'
if ($LASTEXITCODE -ne 0) {
    throw "Docker Engine non risponde in $Distribution. Controlla il servizio Docker oppure usa Docker Desktop come spiegato nel README."
}

& wsl.exe -d $Distribution -- docker compose version
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose non disponibile in $Distribution. Consulta i requisiti nel README."
}

$addressOutput = & wsl.exe -d $Distribution -- hostname -I
if ($LASTEXITCODE -eq 0) {
    $wslIpv4 = ($addressOutput -split '\s+' | Where-Object { $_ -match '^\d{1,3}(\.\d{1,3}){3}$' } | Select-Object -First 1)
    if ($wslIpv4) {
        Write-Host "Quando compare Uvicorn running, apri http://$($wslIpv4):$Port/"
    }
}
Write-Host 'Lascia questa finestra aperta. Premi Ctrl+C per fermare il sito.'

& wsl.exe -d $Distribution --cd $linuxDirectory -- env BIND_ADDRESS=0.0.0.0 "PORT=$Port" docker compose up --build --remove-orphans
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose ha terminato con errore $LASTEXITCODE. Controlla i messaggi sopra."
}