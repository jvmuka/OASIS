# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OASIS — reservation and access-control system for a condominium (UEPG, Projeto de Software 2026). Three layers: PostgreSQL (`banco/`), NestJS API (`backend/`), React/Vite frontend (`frontend/`). All chat, docs, and commit messages in this repo are in Brazilian Portuguese, professional/technical tone, no emojis — follow that convention.

## Commands

### Backend (`backend/`, port 3000, prefix `/api`)
```bash
cp .env.exemplo .env      # set DATABASE_URL
npm install
npm run start:dev         # nest start --watch
npm run build              # nest build
```
No test or lint scripts are configured.

### Frontend (`frontend/`, port 5173)
```bash
npm install
npm run dev                # vite; proxies /api and /uploads to localhost:3000
npm run build               # tsc -b && vite build
```
No test or lint scripts are configured. The backend must be running for the dev proxy to work.

### Database (`banco/`)
Run in order, or use the combined file:
```bash
psql -U postgres -f banco/01_banco_e_tipos.sql
psql -U postgres -d oasis -f banco/02_tabelas.sql
psql -U postgres -d oasis -f banco/03_indices_e_carga.sql
psql -U postgres -d oasis -f banco/04_gatilhos.sql
# or: psql -U postgres -f banco/oasis_banco_completo.sql
```
`oasis_banco_completo.sql` starts with `DROP DATABASE IF EXISTS oasis` — it recreates the DB from scratch. Any change to schema/rules must be made in the individual numbered files under `banco/` **and** re-merged into `oasis_banco_completo.sql`.

### Docker (all three services)
```bash
docker compose up -d --build
docker compose logs -f
docker compose down          # keep volumes
docker compose down -v       # reset DB to initial seed
```
Frontend: http://localhost:5173, Backend: http://localhost:3000/api, DB: `localhost:5433` (postgres/`Oasis@2026`/`oasis`).

### Test login (DEV_SENHA = `Teste@2026`)
`carlos.silva@teste.com` (morador), `roberto.lima@teste.com` (porteiro), `ana.souza@teste.com` (síndica — also morador).

## Architecture

### Business rules live in the database, not the API
Rules RN01–RN14 (booking overlap, area blocks, capacity, opening-hours window, min/max advance notice, weekly limits, cancellation deadlines, key loan/return validation, package pickup, notice board distribution/read tracking) are implemented as PL/pgSQL triggers in `banco/04_gatilhos.sql`. This is deliberate: integrity holds even if data is manipulated outside the API. **When asked to change a business rule, edit the trigger function in `banco/04_gatilhos.sql`, not the NestJS layer.**

The flow: a trigger does `RAISE EXCEPTION 'RNxx: mensagem legível...'` → `backend/src/db/db.service.ts`'s `traduz()` matches the `^RN\d{2}:` prefix and converts it to a `BadRequestException` (HTTP 400) → `frontend/src/api.ts`'s `req()` surfaces `err.message` directly to the UI. Postgres constraint violations (`23505` unique, `23503` FK, `23514` check) are also translated to readable 400s there. Never re-implement one of these checks in TypeScript — add/adjust the trigger and let it propagate.

### Backend module layout is non-standard NestJS
Each feature under `backend/src/<feature>/<feature>.module.ts` bundles the `@Controller` class **and** the `@Module` in one file (no separate `*.controller.ts`/`*.service.ts` per feature — the only shared service is `DbService`). Controllers call `this.db.query(sql, params)` directly with raw parameterized SQL; there is no ORM/query builder. Follow this same one-file-per-feature pattern when adding a module.

Feature modules and their use cases (see `backend/README.md` for full route table):
- `auth` (UC01) — login/JWT
- `cadastros` (UC11) — pessoas, blocos, unidades
- `areas` (UC09) — common areas, schedules, blocks/maintenance
- `reservas` (UC02–UC04) — bookings
- `portaria` (UC06–UC08) — packages, keys
- `avisos` (UC05, UC10) — notice board
- `relatorios` (UC13) — admin dashboard

### Auth model
Dev-mode single shared password (`DEV_SENHA` env var, default `Teste@2026`) checked against any user's email in `pessoa` — see `backend/src/auth/auth.service.ts`. No passwords are stored in the DB. A JWT is issued with `{ sub, nome, perfis: [{id_perfil, tipo}] }`. Route guards (`backend/src/auth/guards.ts`): `JwtAuthGuard` validates the Bearer token; `PerfilGuard` + `@Perfis('SINDICO', ...)` decorator restrict by role; `perfilDoUsuario(user, tipo)` resolves the acting `id_perfil` for a given role inside a handler. Three roles: `MORADOR`, `SINDICO`, `PORTEIRO` (síndico is typically also a morador).

A documented incremento 2 will switch auth to Firebase (`idToken` → `firebase-admin` → lookup by `uid_firebase`); the JWT/guard structure is designed not to change when that happens.

### Frontend
Single HTTP client in `frontend/src/api.ts`: stores the JWT + session in `localStorage`, attaches `Authorization: Bearer`, translates API error bodies (including `RNxx` messages) into thrown `Error`s, and force-logs-out on a 401. Routing in `frontend/src/App.tsx` is role-gated via a `<Protegida perfil="...">` wrapper reading the cached session; pages are organized by role under `src/pages/{morador,porteiro,sindico}/`. Styling: Tailwind + `Plus Jakarta Sans`, SVG icons only (no emojis in the UI), dark mode is a supported first-class feature (`components/BotaoModoEscuro.tsx`).

### Timezone
Everything runs on `America/Sao_Paulo` — set at the Postgres server level (`docker-compose.yml`: `postgres -c timezone=America/Sao_Paulo`) and via `TZ` env on both `banco` and `backend` containers. Keep new date/time logic consistent with this instead of assuming UTC.

## Required workflow: commit reports

Per `Documentos/AGENTS.md`, every commit + push to the remote must be accompanied by a detailed report, both shown in chat and saved to `Documentos/relatorios_commits/commit_<hash>_<YYYY-MM-DD>.md`. The report must cover: branch/author/date, objective, summary of changed/created/deleted files and impacted layers (backend/frontend/banco), technical detail (routes, components, schema/trigger changes), and how the change was validated. See existing files in that folder for the expected format.
