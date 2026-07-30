# OASIS — Sistema de Gestão de Reservas e Controle de Acesso

Aplicação web do projeto OASIS (UEPG — Projeto de Software, 2026).
**Incremento 1**: autenticação, reservas com todas as regras de negócio,
encomendas, chaves, mural de avisos, cadastros e painel administrativo.

```
oasis-app/
├── banco/      scripts SQL do PostgreSQL (criação, carga inicial e gatilhos)
├── backend/    API REST em NestJS + TypeScript (porta 3000)
└── frontend/   interface web em React + Vite + Tailwind (porta 5173)
```

---

## 1. O que você precisa instalar (uma única vez)

| Programa       | Versão  | Onde baixar                          |
|----------------|---------|--------------------------------------|
| Node.js        | 22 LTS  | https://nodejs.org                   |
| PostgreSQL     | 16      | https://www.postgresql.org/download  |
| Git (opcional) | —       | https://git-scm.com                  |

Durante a instalação do PostgreSQL, **anote a senha do usuário `postgres`**
— você vai precisar dela nos passos 2 e 3.

Para conferir se está tudo instalado, abra o terminal (PowerShell no
Windows) e rode:

```
node -v        (deve mostrar v22.x)
psql --version (deve mostrar psql 16.x)
```

> Se o `psql` não for reconhecido no Windows, adicione
> `C:\Program Files\PostgreSQL\16\bin` ao PATH do sistema, ou use o
> "SQL Shell (psql)" que vem no menu Iniciar.

---

## 2. Criar o banco de dados

Os quatro scripts em `banco/` criam TUDO: o banco `oasis`, os 15 tipos
enumerados, as 17 tabelas, os índices, a carga inicial de dados e os
10 gatilhos que implementam as regras RN01 a RN14.

Execute na ordem (o psql vai pedir a senha do postgres):

```
psql -U postgres -f banco/01_banco_e_tipos.sql
psql -U postgres -d oasis -f banco/02_tabelas.sql
psql -U postgres -d oasis -f banco/03_indices_e_carga.sql
psql -U postgres -d oasis -f banco/04_gatilhos.sql
```

**Atenção:** o script 01 começa com `DROP DATABASE IF EXISTS oasis` —
ele apaga e recria o banco. É o comportamento desejado para recomeçar do
zero, mas não rode em um banco com dados que você queira manter.

> Se o script 01 reclamar do locale `pt_BR.UTF-8` (comum no Windows),
> abra o arquivo e troque as duas linhas `LC_COLLATE` e `LC_CTYPE`
> para `'Portuguese_Brazil.1252'` — ou simplesmente remova as duas
> linhas e a linha `TEMPLATE = template0`.

Para conferir que deu certo:

```
psql -U postgres -d oasis -c "SELECT COUNT(*) AS tabelas FROM information_schema.tables WHERE table_schema='public';"
```

Deve responder `17`.

---

## 3. Rodar o backend (API)

```
cd backend
copy .env.exemplo .env        (Linux/Mac: cp .env.exemplo .env)
```

Abra o arquivo `.env` que acabou de criar e ajuste a linha do banco com
a SUA senha do postgres:

```
DATABASE_URL=postgres://postgres:SUA_SENHA@localhost:5432/oasis
```

Depois:

```
npm install        (só na primeira vez; demora 1-2 minutos)
npm run start:dev  (sobe a API com recarga automática)
```

Quando aparecer `OASIS API rodando em http://localhost:3000/api`,
o backend está no ar. **Deixe esse terminal aberto.**

Teste rápido (em outro terminal):

```
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"carlos.silva@teste.com\",\"senha\":\"Teste@2026\"}"
```

Deve devolver um JSON com `token`, os dados do Carlos e o perfil MORADOR.

---

## 4. Rodar o frontend (interface web)

Em **outro terminal** (deixe o do backend rodando):

```
cd frontend
npm install    (só na primeira vez)
npm run dev
```

Abra o navegador em **http://localhost:5173** e faça login com qualquer
usuário da carga inicial. A senha de todos, neste incremento, é a definida
em `DEV_SENHA` no `.env` do backend:

| Usuário          | E-mail                    | Senha       | Perfil            |
|------------------|---------------------------|-------------|-------------------|
| Carlos Silva     | carlos.silva@teste.com    | Teste@2026  | MORADOR (A-302)   |
| João Oliveira    | joao.oliveira@teste.com   | Teste@2026  | MORADOR (A-302)   |
| Maria Santos     | maria.santos@teste.com    | Teste@2026  | MORADOR (B-105)   |
| Helena Braga     | helena.braga@teste.com    | Teste@2026  | MORADOR (B-203)   |
| Ana Paula Souza  | ana.souza@teste.com       | Teste@2026  | SINDICO + MORADOR |
| Roberto Lima     | roberto.lima@teste.com    | Teste@2026  | PORTEIRO          |

Cada perfil enxerga um menu diferente:
- **Morador**: Nova reserva, Minhas reservas, Mural.
- **Porteiro**: Encomendas, Chaves, Mural.
- **Síndico**: Painel, Áreas comuns, Pessoas, Publicar aviso, Mural.

---

## 5. Roteiro de demonstração sugerido (5 minutos)

1. Logue como **Carlos** → Nova reserva → Academia → escolha uma data de
   amanhã em diante → reserve 09:00-10:00. Confirmação verde.
2. Sem sair, tente reservar **hoje** → a mensagem vermelha **RN06**
   (antecedência mínima) aparece — direto do gatilho do banco.
3. Logue como **Maria** → tente reservar a Academia no MESMO horário do
   Carlos → **RN01** recusa. Reserve 15:00-16:00 → aceita (duas reservas
   no mesmo dia, faixas diferentes — o problema do BRCONDOS resolvido).
4. Logue como **Roberto (porteiro)** → Encomendas → registre um pacote
   para o Carlos → volte no login do Carlos → o aviso "Nova encomenda na
   portaria" está no Mural com selo NOVO (RN11 + RN13/14).
5. Ainda como Roberto → Alterar status da encomenda → tente confirmar
   escolhendo "Terceiro" sem nome → **RN12** recusa. Preencha e confirme.
6. Chaves → empreste a CH-SALAO-01 ao Carlos → tente emprestar de novo →
   **RN09** recusa e mostra quem está com ela. Registre a devolução.
7. Logue como **Ana (síndica)** → Painel mostra os números → Publicar
   aviso → todos os usuários passam a ver no Mural.

## 6. Como o sistema funciona por dentro

**Fluxo de uma requisição** (ex.: confirmar reserva):

```
Navegador (React)  →  Vite proxy /api  →  NestJS :3000  →  PostgreSQL
     ↑                                        |    INSERT INTO reserva
     |                                        |    dispara gatilhos RN01..RN07
     └── mensagem de sucesso ou o texto ──────┘    (aceita ou RAISE EXCEPTION)
         exato da regra violada (RNxx)
```

Pontos de arquitetura que valem entender (e citar na banca):

1. **Regras de negócio no banco.** Os gatilhos PL/pgSQL validam
   sobreposição, bloqueios, capacidade, janela de funcionamento,
   antecedência e limite semanal. A API não duplica essas regras:
   ela captura a exceção e devolve a mensagem `RNxx: ...` como HTTP 400,
   e o frontend só a exibe. Uma regra, um lugar, impossível burlar
   por fora da aplicação.

2. **Autenticação em dois estágios.** `POST /auth/login` valida as
   credenciais (neste incremento: senha única de desenvolvimento
   `DEV_SENHA`; no incremento 2: token do Firebase) e emite um **JWT
   próprio** com os perfis vigentes. Toda rota seguinte exige esse JWT
   (`JwtAuthGuard`) e as rotas restritas verificam o perfil
   (`PerfilGuard` + decorator `@Perfis('SINDICO')`).

3. **Perfil = usuário do sistema.** Quem reserva, empresta, recebe e
   publica é sempre um `id_perfil` — exatamente como ficou modelado no
   documento. A Ana, por exemplo, tem dois perfis (SINDICO e MORADOR) e
   o menu mostra os dois mundos.

4. **A grade de horários é calculada, não armazenada.** O endpoint de
   disponibilidade lê AREA_HORARIO do dia da semana, fatia em slots de
   `duracao_slot_min` e cruza com reservas ativas e bloqueios. Mudou a
   regra da área no CRUD do síndico, a grade muda na hora.

## 7. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `ECONNREFUSED ... 5432` ao subir a API | PostgreSQL parado ou porta errada | Inicie o serviço do PostgreSQL; confira a porta no `.env` |
| `password authentication failed` | Senha errada no `.env` | Corrija `DATABASE_URL` |
| Login devolve "E-mail ou senha inválidos" | Senha diferente de `DEV_SENHA` | Use exatamente `Teste@2026` (ou o valor do seu `.env`) |
| Tela branca em localhost:5173 | Backend fora do ar | Suba o backend antes; veja o terminal dele |
| Erro de locale no script 01 | Windows sem `pt_BR.UTF-8` | Ver observação no passo 2 |
| Porta 3000 ou 5173 ocupada | Outro processo usando | Mude `PORT` no `.env` e o proxy em `vite.config.ts` |

## 8. Próximos incrementos (roteiro do cronograma)

- **Firebase real** (S25): trocar o modo `DEV_SENHA` pela validação do
  idToken com `firebase-admin`; o resto da API não muda.
- **Prisma** (S24): o schema já está desenhado no documento; basta
  `prisma db pull` no banco pronto para gerar o client tipado.
- **CRUD de horários/utensílios/chaves na interface** (S27),
  **bloqueios pela interface** (S34), **FCM push** (S35),
  **relatórios exportáveis** (S36) e **integração Intelbras** (S34).
