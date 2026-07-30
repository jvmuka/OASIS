# Backend — API REST (NestJS + TypeScript)

API do OASIS na porta **3000**, prefixo `/api`.

## Rodar
```bash
cp .env.exemplo .env      # ajuste DATABASE_URL com sua senha do postgres
npm install
npm run start:dev
```

## Organização (por caso de uso)
| Módulo | Casos de uso | Rotas principais |
|--------|-------------|------------------|
| `auth` | UC01 | `POST /auth/login` — emite JWT com os perfis vigentes |
| `cadastros` | UC11 | `GET/POST /cadastros/pessoas`, `/blocos`, `/unidades` |
| `areas` | UC09 | `GET/POST/PUT /areas`, `POST /areas/:id/horarios` |
| `reservas` | UC02, UC03, UC04 | `GET /reservas/disponibilidade`, `POST /reservas`, `PATCH /reservas/:id/cancelar` |
| `portaria` | UC06, UC07, UC08 | `/portaria/encomendas`, `/portaria/chaves` |
| `avisos` | UC05, UC10 | `GET /avisos/meus`, `POST /avisos`, `PATCH /avisos/:id/lido` |
| `relatorios` | UC13 | `GET /relatorios/painel` |

## Como as regras de negócio funcionam
A API **não** duplica as regras: ela envia o comando ao banco e, se um
gatilho dispara `RNxx`, o `db.service.ts` converte a exceção em HTTP 400 com
a mensagem legível. Uma única fonte de verdade (o banco), impossível burlar
por fora.

## Autenticação
- **Incremento 1 (atual):** senha única de desenvolvimento (`DEV_SENHA` no
  `.env`). Nenhuma senha é gravada no banco.
- **Incremento 2:** o frontend autentica no Firebase, envia o `idToken`, o
  backend valida com `firebase-admin` e localiza a pessoa pelo `uid_firebase`.
  O JWT emitido e as guardas de rota não mudam.
