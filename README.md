# Documaster MCP Server

Dette prosjektet er en Model Context Protocol (MCP) server som lar AI-assistenter koble til Documaster sitt API for å søke og hente ut informasjon fra arkivsystemer. Serveren følger MCP-standarden og gir tilgang til Documaster-data gjennom et strukturert API.

---

# Oversikt

## Hva er MCP?

Model Context Protocol (MCP) er en åpen standard som lar AI-systemer koble til eksterne verktøy og datakilder på en sikker og kontekstuell måte. Denne implementasjonen bruker MCP for å gi tilgang til Documaster sitt arkivsystem.

## Funksjonalitet

- **Documaster-integrasjon**: Kobler seg direkte til Documaster sitt API med OAuth2-autentisering
- **Søkefunksjonalitet**: Lar AI-assistenter søke i arkiverte dokumenter
- **Strukturert tilgang**: Gir mulighet til å hente mapper og journalpostdata basert på ulike kriterier
- **Sikker autentisering**: Håndterer autentisering og autorisasjon mot Documaster-API-et

---

# Komme i gang

## Forutsetninger

- **Node.js** (>=18.x): [Last ned](https://nodejs.org/)
- **Git**: For versjonskontroll
- **Documaster API-tilgang**: Du trenger Client ID og Client Secret fra Documaster

---

## Steg 1: Klone og installere

```bash
# Klone repository
git clone https://github.com/neo/documaster-mcp-server.git
cd documaster-mcp-server

# Installer avhengigheter
npm install
```

---

## Steg 2: Konfigurer tilgang

Opprett en `.env`-fil basert på `.env.example`:

```bash
cp .env.example .env
```

Rediger `.env`-filen og legg inn dine Documaster-tilgangsnøkler:

```
DEBUG=true
LOG_LEVEL=debug
DOCUMASTER_BASE_URL=https://api.documaster.com
DOCUMASTER_AUTH_URL=https://auth.documaster.com
DOCUMASTER_CLIENT_ID=your_client_id
DOCUMASTER_CLIENT_SECRET=your_client_secret
```

---

## Steg 3: Kjør utviklingsserveren

Start serveren i utviklingsmodus:

```bash
npm run dev
```

Dette starter MCP-serveren med hot-reloading.

---

# Arkitektur

Prosjektet følger en strukturert, lagdelt arkitektur som skiller mellom ulike ansvarsområder og fremmer vedlikeholdbarhet.

## Prosjektstruktur

```
documaster-mcp-server/
├── dist/              # Kompilert JavaScript-kode
├── src/               # TypeScript kildekode
│   ├── controllers/   # Forretningslogikk
│   ├── models/        # Datamodeller
│   ├── services/      # Ekstern API-interaksjon
│   ├── tools/         # MCP-verktøydefinisjoner
│   ├── types/         # Typedefinisjoner
│   ├── utils/         # Delte hjelpefunksjoner
│   └── index.ts       # Innganspunkt
├── tests/             # Testfiler
│   ├── controllers/   # Controller-tester
│   ├── scripts/       # Testscript for API-testing
│   ├── services/      # Service-tester
│   └── tools/         # MCP-verktøy-tester
├── scripts/           # Hjelpescripts
├── tasks/             # Task Master oppgaver
├── .env               # Miljøvariabel-konfigurasjon
└── smithery.yaml      # Smithery-konfigurasjon for MCP
```

## Lag og ansvarsområder

### MCP Verktøy (`src/tools/*.tool.ts`)

- **Formål**: Definere MCP-verktøy med skjema og beskrivelser for AI-assistenter
- **Primære filer**: 
  - `documaster.tool.ts`: Implementerer alle MCP-verktøy for Documaster-integrasjon
  - `documaster.types.ts`: Definerer typene for verktøyenes argumenter

### Controllers (`src/controllers/*.controller.ts`)

- **Formål**: Implementere forretningslogikk, håndtere feil og formatere svar
- **Primær fil**: `documaster.controller.ts`: Implementerer logikk for å kommunisere med Documaster API

### Tjenester (`src/services/*.service.ts`)

- **Formål**: Kommunisere med eksterne API-er eller datakilder
- **Primær fil**: `documaster.oauth2.service.ts`: Håndterer OAuth2-autentisering mot Documaster

### Modeller (`src/models/*.model.ts`)

- **Formål**: Definere datastrukturer for objektene som hentes fra Documaster
- **Primær fil**: `documentmaster.model.ts`: Definerer datamodeller for dokumenter og mapper

### Hjelpebiblioteker (`src/utils/*.util.ts`)

- **Formål**: Tilby delt funksjonalitet på tvers av applikasjonen
- **Nøkkelfiler**:
  - `logger.util.ts`: Strukturert logging
  - `error.util.ts`: Feilhåndtering og standardisering
  - `transport.util.ts`: HTTP-forespørselshåndtering
  - `documaster-config.util.ts`: Konfigurasjon for Documaster-API

---

# Tilgjengelige MCP-verktøy

Serveren eksponerer følgende MCP-verktøy for interaksjon med Documaster:

## Søk og autentisering

- `documaster_test_auth`: Tester autentisering mot Documaster API
- `search_documaster`: Søker etter dokumenter basert på søkeord og filtreringsalternativer

## Mappeverktøy

- `hent_mappe_primaerklasse`: Henter mapper basert på primærklasseringens tittel
- `hent_mappe_sekundaerklasse`: Henter mapper basert på sekundærklasseringens tittel
- `hent_mappe_saksnummer`: Henter mapper basert på saksnummer (mappeIdent)
- `hent_mappe_id`: Henter mapper basert på intern ID

## Registreringsverktøy (journalpost)

- `hent_registrering_primaerklasse`: Henter registreringer basert på primærklassering
- `hent_registrering_sekundaerklasse`: Henter registreringer basert på sekundærklassering
- `hent_registrering_ident`: Henter registreringer basert på journalpostident
- `hent_registrering_saksnummer`: Henter registreringer basert på saksnummer
- `hent_registrering_id`: Henter en registrering basert på intern ID

## Dokumentverktøy

- `hent_dokument_id`: Henter ett dokument basert på dokument-ID
- `hent_dokumentversjon_id`: Henter dokumentversjon basert på versjon-ID
- `hent_dokumentversjon_dokumentId`: Henter dokumentversjoner basert på dokument-ID
- `hent_dokumentversjon_registreringsId`: Henter dokumentversjoner basert på registrerings-ID
- `hent_dokversjon_regIdent`: Henter dokumentversjoner basert på registreringsIdent

---

# Utvikling

## Utviklingsscripts

```bash
# Start server i utviklingsmodus (hot-reload)
npm run dev

# Bygg prosjektet
npm run build

# Start server i produksjonsmodus
npm start

# Kjør tester
npm test

# Generer test-dekning rapport
npm run test:coverage
```

## Testing

```bash
# Kjør alle tester
npm test

# Kjør spesifikke tester
npm test -- tests/path/to/test.ts
```

## Kodekvalitet

```bash
# Lint kode
npm run lint

# Formater kode med Prettier
npm run format

# Sjekk typer
npm run typecheck
```

---

# Konfigurasjon

## Miljøvariabler

Serveren bruker følgende miljøvariabler (defineres i `.env`):

- `DEBUG`: Aktiverer debug-logging når satt til "true"
- `LOG_LEVEL`: Logger-nivå (debug, info, warn, error)
- `DOCUMASTER_BASE_URL`: Base-URL for Documaster API
- `DOCUMASTER_AUTH_URL`: URL for OAuth2-autentisering
- `DOCUMASTER_CLIENT_ID`: Client ID for Documaster API
- `DOCUMASTER_CLIENT_SECRET`: Client Secret for Documaster API

---

# Docker

Prosjektet inkluderer en Dockerfile for containerisering:

```bash
# Bygg Docker-image
docker build -t documaster-mcp-server .

# Kjør Docker container
docker run -p 3000:3000 --env-file .env documaster-mcp-server
```
