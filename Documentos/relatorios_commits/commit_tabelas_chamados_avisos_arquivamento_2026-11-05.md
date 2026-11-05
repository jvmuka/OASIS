# Relatório de Commit: Tabelas Padronizadas de Chamados e Avisos com Arquivamento

**Data:** 05/11/2026  
**Branch:** `feat/arquitetura-multicondominio`  
**Autor:** Antigravity AI  

---

## 1. Contexto e Motivação

O usuário solicitou melhorias fundamentais nas telas de gestão de **Chamados & Ocorrências** e **Mural de Avisos** para o perfil de Síndico/Administrador:
1. **Chamados (Síndico/Administração):**
   - Apresentação padrão focada exclusivamente em chamados pendentes de triagem/resposta da administração (`status = 'EM_ANALISE'` / "Aguardando Análise").
   - Filtros adicionais por período (data início e data fim de abertura).
   - Formato de tabela padronizada com paginação (`<Paginacao />`), status destacados, dados do morador/unidade e botão de atendimento direto.
2. **Mural de Avisos (Síndico/Administração):**
   - Apresentação dos comunicados em tabela padronizada com paginação, filtros de data de publicação (início/fim), status e busca por texto.
   - **Substituição de exclusão definitiva por arquivamento:** ao invés de deletar, o síndico arquiva ou desarquiva comunicados.
   - **Regra de Privacidade Estrita:** avisos arquivados deixam imediatamente de ser exibidos para os moradores (`/api/avisos/meus`), mas permanecem disponíveis no histórico administrativo para auditoria e eventual desarquivamento.
3. **Acesso Rápido em Localhost:**
   - Garantir que os atalhos de login rápido em 1 clique continuem sempre visíveis em ambiente de desenvolvimento local (`localhost`, `127.0.0.1`), controlados via `isLocalhost` e variável de ambiente `VITE_MODO_DEMO`.

---

## 2. Modificações Realizadas

### 2.1. Banco de Dados
- **Migração SQL:** `banco/migracoes/20261108_aviso_arquivamento.sql`
  - `ALTER TABLE aviso ADD COLUMN IF NOT EXISTS arquivado BOOLEAN NOT NULL DEFAULT FALSE;`
  - `ALTER TABLE aviso ADD COLUMN IF NOT EXISTS data_hora_arquivamento TIMESTAMP WITH TIME ZONE;`
  - `CREATE INDEX IF NOT EXISTS idx_aviso_arquivado ON aviso(id_condominio, arquivado);`
- **Inicialização Automática:** Atualizado `backend/src/db/db.service.ts` para aplicar as novas colunas e índices automaticamente na subida da aplicação.

### 2.2. Backend (NestJS)
- **`backend/src/avisos/avisos.module.ts`**:
  - `listarTodos`: adicionados parâmetros `@Query('status')`, `@Query('busca')`, `@Query('data_inicio')` e `@Query('data_fim')`. Por padrão filtra comunicados não arquivados (`a.arquivado = FALSE`), a menos que o síndico selecione a visualização de arquivados ou todos.
  - `meus`: inclusão estrita de `AND a.arquivado = FALSE`, blindando a consulta para que moradores nunca recebam avisos arquivados.
  - `PATCH /api/avisos/:id/arquivar`: endpoint administrativo para alternar o status de arquivamento com emissão SSE de evento `AVISOS` `ATUALIZADO`.
- **`backend/src/chamados/chamados.module.ts`**:
  - `listarTodos`: adicionados parâmetros `@Query('data_inicio')` e `@Query('data_fim')`. Suporte completo à filtragem por período de abertura e contagem de respostas administrativas (`total_respostas_admin`).

### 2.3. Frontend (React + Vite + Tailwind)
- **`frontend/src/pages/sindico/Chamados.tsx`**:
  - Filtro padrão `filtroStatus` inicializado em `'EM_ANALISE'` ("Aguardando Análise").
  - Inputs de filtro por data inicial e data final.
  - Tabela com colunas: *Status*, *Unidade*, *Solicitante*, *Categoria & Assunto*, *Abertura*, *Interações* e *Ação*.
  - Componente de paginação `<Paginacao />` integrado com limite de 10 chamados por página.
  - Gaveta lateral de atendimento individual com chat e alteração de status mantida com fluidez.
- **`frontend/src/pages/sindico/PublicarAviso.tsx`**:
  - Cards expansíveis no estilo original com chevron (`setinha`), expandindo em linha o conteúdo do aviso, fotos e documentos PDF.
  - Abas por categoria ("Todos", "Administrador", "Encomenda") e filtros por status ("Ativos", "Arquivados", "Todos") e período de publicação.
  - Paginação `<Paginacao />` integrada (6 avisos por página) para evitar listas longas e corridas.
  - Substituição do botão "Excluir" por "Arquivar" / "Desarquivar" com `<ModalConfirmacao>`, preservando o histórico e ocultando avisos arquivados dos moradores.

---

## 3. Testes e Validação

- Build do frontend concluído com sucesso (`vite build` gerando bundle sem erros de tipagem).
- Build do backend compilado sem erros (`nest build`).
- **Suíte de Testes Automatizada:**
  - `test_multicondominio_suite.js`: 100% aprovado, sem vazamento entre condomínios.
  - `test_chamados_avisos_tabelas.js`: aprovado com sucesso:
    - Chamados filtrados por padrão em `EM_ANALISE`.
    - Filtro por data funcionando.
    - Arquivamento de aviso comprovadamente oculta o comunicado da visão do morador.
    - Síndico localiza o comunicado nos arquivados e pode desarquivar a qualquer momento.

