# OASIS — Sistema de Gestão de Reservas e Controle de Acesso

Aplicação web do projeto OASIS (UEPG — Projeto de Software, 2026).  
**Incremento 1**: Autenticação, reservas com todas as regras de negócio, encomendas, controle de chaves, mural de avisos com agendamento, cadastros de pessoas/áreas e painel administrativo com indicadores consolidados.

```
oasis/
├── banco/        scripts SQL do PostgreSQL (criação, carga inicial e gatilhos)
├── backend/      API REST em NestJS + TypeScript (porta 3000)
├── frontend/     interface web em React + Vite + Tailwind (porta 5173)
├── Documentos/   documentações, referências, guia Docker e relatórios de commits
└── docker-compose.yml  orquestração de contêineres Docker
```

---

## Como Rodar o Projeto

Você pode executar o sistema de duas maneiras: **via Docker (Recomendado)** ou **manualmente no ambiente local**.

---

### Método 1: Execução com Docker (Recomendado)

Com o Docker, **não é necessário** instalar Node.js nem PostgreSQL na sua máquina. O Docker Compose baixa as imagens, compila o código e sobe os três serviços de forma isolada.

#### 1. Pré-requisito:
- Ter o **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** instalado e em execução no computador.

#### 2. Subir os contêineres:
Na raiz do projeto (`Oasis/`), abra o terminal e execute:

```bash
docker compose up -d --build
```

#### 3. Acessar a aplicação:
- **Frontend (Web)**: [http://localhost:5173](http://localhost:5173)
- **Backend (API REST)**: [http://localhost:3000/api](http://localhost:3000/api)
- **Banco de Dados (PostgreSQL)**: `localhost:5433` (Usuário: `postgres`, Senha: `Oasis@2026`, Base: `oasis`)

#### Comandos Úteis do Docker:
```bash
# Ver logs em tempo real:
docker compose logs -f

# Ver status dos contêineres:
docker compose ps

# Parar os serviços (mantendo os dados salvos no volume):
docker compose down

# Parar e resetar o banco de dados para a carga inicial:
docker compose down -v
```

---

### Método 2: Execução Manual (Desenvolvimento Nativo)

Se preferir rodar os serviços diretamente no sistema operacional:

#### 1. Pré-requisitos:
- **Node.js**: Versão 20 LTS ou 22 LTS ([nodejs.org](https://nodejs.org))
- **PostgreSQL**: Versão 16 ([postgresql.org](https://www.postgresql.org/download))

#### 2. Inicializar o Banco de Dados:
No terminal ou no *SQL Shell (psql)*, execute o script completo ou a sequência de scripts em `banco/`:

```bash
psql -U postgres -f banco/oasis_banco_completo.sql
```
*(Ou execute `01_banco_e_tipos.sql`, `02_tabelas.sql`, `03_indices_e_carga.sql` e `04_gatilhos.sql` em ordem).*

#### 3. Iniciar o Backend (API):
```bash
cd backend
npm install
npm run start:dev
```
A API iniciará em `http://localhost:3000/api`.

#### 4. Iniciar o Frontend (Interface Web):
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```
Acesse a interface no navegador em `http://localhost:5173`.

---

## Contas de Acesso para Demonstração

A tela de login conta com botões de **Acesso Rápido de 1 Clique** para os três perfis de demonstração:

| Perfil | E-mail | Senha Padrão | Vínculo / Unidade |
| :--- | :--- | :--- | :--- |
| **Morador (Carlos)** | `carlos.silva@teste.com` | `Teste@2026` | Bloco A - Apto 302 |
| **Síndica (Ana Paula)** | `ana.souza@teste.com` | `Teste@2026` | Síndico + Morador (Bloco A - Apto 61) |
| **Porteiro (Roberto)** | `roberto.lima@teste.com` | `Teste@2026` | Portaria Central |

### Menus Disponíveis por Perfil:
- **Morador**: Nova Reserva (com Calendário), Minhas Reservas, Mural de Avisos.
- **Porteiro**: Gestão de Encomendas, Controle de Chaves, Mural de Avisos.
- **Síndico**: Painel Geral de Indicadores, Áreas Comuns & Regras, Pessoas & Unidades, Publicar/Agendar Avisos, Mural de Avisos.

---

## Roteiro de Demonstração Sugerido

1. **Autenticação com Acesso Rápido**:
   - Acesse `http://localhost:5173` e clique no botão **"Morador"** para preenchimento instantâneo.
2. **Nova Reserva de Espaço Coletivo**:
   - Vá em **"Nova Reserva"** → Selecione a **Academia** ou **Salão de Festas**.
   - Navegue pelo calendário interativo e escolha uma data futura.
   - Observe os slots: `LIVRE` (verde), `OCUPADO` (amarelo) e `INDISPONÍVEL` (vermelho para horários passados).
   - Confirme a reserva e utilize o botão **"Voltar"** para alternar entre áreas.
3. **Mural de Avisos & Notificações**:
   - Veja comunicados fixados e comunicados não lidos com selo pulsante `NOVO`.
   - Ao expandir um comunicado, o sistema registra automaticamente a leitura.
4. **Portaria (Encomendas e Chaves)**:
   - Logue como **Porteiro (Roberto)**.
   - Registre a chegada de um pacote para o Carlos (gera aviso no mural dele).
   - Dê baixa em encomendas e registre empréstimo/devolução de chaves no claviculário.
5. **Administração & Regras (Síndico)**:
   - Logue como **Síndica (Ana)**.
   - Veja os KPIs e gráfico de barras no **Painel Geral**.
   - Em **"Áreas Comuns"**, configure durações em horas/minutos (`h/min`), prazos de cancelamento e antecedência em dias/horas (`d/h`).
   - Em **"Publicar Avisos"**, publique comunicados imediatos ou agende publicações para horários futuros.

---

## Arquitetura e Regras de Negócio

1. **Regras de Negócio no Banco de Dados (PL/pgSQL)**:
   - As regras `RN01` a `RN14` (sobreposição de horários, bloqueios, capacidade máxima, janela de funcionamento, antecedência mínima/máxima e limite semanal) residem em gatilhos no PostgreSQL. A API captura as exceções e retorna mensagens legíveis para a interface.
2. **Design System UI/UX Pro Max**:
   - Tipografia moderna `Plus Jakarta Sans`, ícones vetoriais SVG (sem emojis na interface), layout responsivo para desktop, tablet e celular, feedback de carregamento e acessibilidade visual.
3. **Persistência e Isolamento**:
   - Dados do PostgreSQL e uploads de imagens são persistidos em volumes nomeados (`oasis_pgdata` e `oasis_uploads`).
