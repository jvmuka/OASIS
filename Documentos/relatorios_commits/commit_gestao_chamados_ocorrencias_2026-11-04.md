# Relatório de Modificações: Gestão de Chamados e Ocorrências

**Data:** 04/11/2026  
**Branch:** `feat/abrir-chamados`  
**Autor:** Antigravity AI  

---

## 1. Objetivo da Implementação
Disponibilizar uma nova funcionalidade completa para o sistema OASIS Condomínio permitindo que os moradores registrem chamados e ocorrências (limpeza, coisas quebradas/avarias, manutenção, convivência/barulho, outros) de forma estritamente particular para sua unidade residencial, permitindo à administração (síndica/administrador) responder, orientar e acompanhar todo o ciclo de vida (`EM_ANALISE` -> `EM_ANDAMENTO` -> `REALIZADA` -> `ARQUIVADA`), com persistência total em PostgreSQL e sincronização em tempo real (SSE + BroadcastChannel).

---

## 2. Componentes Criados e Modificados

### A. Banco de Dados (PostgreSQL)
- **Migração:** `banco/migracoes/20261104_tabela_chamados.sql`
- **Sincronização:** Atualizados `banco/01_banco_e_tipos.sql`, `banco/02_tabelas.sql`, `banco/oasis_banco_completo.sql` e automigração em `backend/src/db/db.service.ts`.
- **Novos ENUMs:**
  - `categoria_chamado_enum` (`'LIMPEZA'`, `'AVARIA_QUEBRADO'`, `'MANUTENCAO'`, `'CONVIVENCIA_BARULHO'`, `'OUTROS'`)
  - `status_chamado_enum` (`'EM_ANALISE'`, `'EM_ANDAMENTO'`, `'REALIZADA'`, `'ARQUIVADA'`)
- **Tabelas Criadas:**
  - `chamado`: Registra a ocorrência, unidade (`id_unidade`), autor, categoria, título, descrição, local específico, status, anexo de foto e timestamps.
  - `chamado_mensagem`: Histórico de mensagens/respostas da thread particular entre a unidade e a administração.
  - Índices criados por unidade, status, categoria e cronologia de abertura.

### B. Backend (NestJS)
- **Módulo:** `backend/src/chamados/chamados.module.ts`
  - `POST /api/chamados`: Morador abre novo chamado para sua unidade ativa.
  - `POST /api/chamados/upload-foto`: Upload de imagem com validação de formato e tamanho.
  - `GET /api/chamados/meus`: Listagem particular dos chamados da unidade do morador.
  - `GET /api/chamados`: Listagem geral com filtros para Síndica/Administrador.
  - `GET /api/chamados/estatisticas`: Contadores de triagem em tempo real para o dashboard.
  - `GET /api/chamados/:id`: Detalhes do chamado e histórico da conversa com validação de acesso.
  - `POST /api/chamados/:id/mensagens`: Envio de mensagens e réplicas na thread.
  - `PATCH /api/chamados/:id/status`: Transição de status e envio opcional de resposta oficial.
- **Sincronização:** Adicionado tópico `'CHAMADOS'` em `backend/src/sync/sync.service.ts`.
- **Registro:** Módulo importado e configurado em `backend/src/app.module.ts`.

### C. Frontend (React + TypeScript + Tailwind)
- **Tela do Morador:** `frontend/src/pages/morador/Chamados.tsx`
  - Abas rápidas (Em Aberto, Concluídos, Arquivados, Todos).
  - Modal "+ Abrir Novo Chamado" com seletor de categorias temáticas, upload de foto com preview e descrição.
  - Gaveta lateral de histórico particular de mensagens com a administração.
  - Aviso explícito de privacidade por unidade.
- **Tela do Síndico:** `frontend/src/pages/sindico/Chamados.tsx`
  - 4 cards de indicadores de triagem com contadores em tempo real.
  - Filtros combinados (Status, Categoria e Busca textual).
  - Gaveta de atendimento com botões de 1 clique para alteração de status e campo de resposta oficial particular.
- **Navegação & Rotas:**
  - Adicionado item "Abrir Chamado" no menu do Morador em `frontend/src/components/Layout.tsx`.
  - Adicionado item "Gestão de Chamados" no menu da Administração em `frontend/src/components/Layout.tsx`.
  - Rotas protegidas `/morador/chamados` e `/sindico/chamados` registradas em `frontend/src/App.tsx`.
  - Suporte ao ícone `wrench` no componente universal `Icone`.
  - Tópico `'CHAMADOS'` registrado no hook `useSync.ts`.
- **Help de Contexto (`?`):**
  - Mapeadas as orientações passo a passo para o Morador e para o Síndico em `frontend/src/config/ajudaContextoConfig.ts`.

---

## 3. Validação e Testes
- Compilação do NestJS (`npm run build`) validada sem erros.
- Compilação do Vite SPA (`npm run build`) validada sem erros.
- Deploy automatizado nos contêineres Docker (`oasis-backend`, `oasis-frontend` e `oasis-banco`).
- Teste ponta a ponta automatizado executado com sucesso cobrindo:
  1. Abertura do chamado pelo morador Carlos Silva.
  2. Triagem e resposta oficial pela síndica Ana Souza.
  3. Réplica do morador na thread.
  4. Finalização como `REALIZADA` com registro de data de fechamento e persistência no banco.

