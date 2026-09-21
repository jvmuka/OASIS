# Relatório de Alterações de Commit

## 1. Identificação
- **Branch**: `correcoes-e-melhorias-gerais`
- **Data e Horário**: 2026-09-21 18:35 (UTC-3)
- **Mensagem do Commit**: `feat: filtros de reservas e agenda, graficos sem fade e correcao de exclusao de usuarios`

---

## 2. Objetivo
Atender às solicitações de melhorias no Painel Geral do Administrador e Painel da Portaria (inserção de filtros avançados por morador, apartamento, área comum, status e mês de referência), reformular os gráficos analíticos (removendo estilo de gradiente/fade e corrigindo responsividade do donut), bem como solucionar a impossibilidade de exclusão de usuários (eliminando erros SQL de coluna inexistente e enums) e aprimorar a mensagem de validação de CPF duplicado.

---

## 3. Resumo das Alterações

### A. Filtros Avançados de Reservas e Agenda (`Painel.tsx`, `Portaria.tsx`, `relatorios.module.ts`, `portaria.module.ts`)
- **Painel da Portaria (`Portaria.tsx`)**:
  - Filtro da Agenda do Dia expandido para carregar todas as áreas comuns registradas via `GET /areas` (substituindo a listagem estática que continha apenas Academia).
  - Adicionados filtros combinados para busca textual por Morador ou Apartamento.
  - Filtro por Status da reserva (Todas, Concluída, Ativa, Cancelada).
  - Filtro temporal por Mês com menu dropdown e atalhos rápidos: `[ Este Mês ]`, `[ Hoje ]` e `[ Qualquer data ]`.
  - Layout reformulado com `flex-wrap` e larguras mínimas fluidas, evitando campos espremidos.
- **Painel Geral do Administrador (`Painel.tsx` & `relatorios.module.ts`)**:
  - Adicionado seletor de Mês de Análise no topo do painel, permitindo ao síndico visualizar métricas históricas de meses anteriores.
  - Tabela de Reservas Recentes enriquecida com a mesma barra de filtros completa: busca por Morador/Apto, filtro por Área, filtro por Status e filtro por Mês.
  - Removido efeito de fade/gradiente do botão de Novo Morador e Ações Rápidas.

### B. Reformulação dos Gráficos Analíticos (`Graficos.tsx`)
- **Gráfico de Evolução Mensal**:
  - Removido o efeito de fade/gradiente sobreposto.
  - Substituído por colunas verticais sólidas com paleta Navy (`#1f3864`) e Sky Blue (`#0284c7`), com tooltips e indicadores de valor no hover.
- **Gráfico Donut de Status**:
  - Corrigido o corte horizontal de textos na legenda através de empilhamento vertical responsivo (`flex-col items-center w-full`).
  - Cores semânticas consolidadas: Verde Esmeralda (Concluídas), Azul Céu (Ativas) e Rosa/Vermelho (Canceladas).

### C. Correção do Fluxo de Exclusão de Usuários (`cadastros.module.ts`, `db.service.ts`, `Pessoas.tsx`)
- **Correção da Consulta SQL de Chaves (Eliminação do Erro 42703)**:
  - Substituída a coluna inexistente `ec.id_perfil_retirada` pelas colunas reais `id_perfil_solicitante`, `id_perfil_entrega` e `id_perfil_recebimento`.
- **Compatibilidade com Enum PostgreSQL (Eliminação do Erro 22P02)**:
  - Substituída a verificação `tipo_perfil IN ('SINDICO', 'ADMINISTRADOR')` por `tipo_perfil = 'SINDICO'`, em conformidade com os valores aceitos por `tipo_perfil_enum`.
- **Proteção e Integridade Referencial**:
  - Proteção contra auto-exclusão do administrador logado e contra exclusão do único administrador ativo do condomínio.
  - Bloqueio orientativo para preservação de auditoria caso o usuário possua reservas, correspondências ou retiradas de chaves registradas (orientando uso de "Inativar").
  - Bloqueio de exclusão de titular com dependentes vinculados, informando nominalmente os dependentes para prévia transferência.
  - Limpeza segura em cascata: desvinculação de gerador em códigos de ativação, remoção de registros de leitura de avisos, vínculos de unidade, perfis e pessoa.
- **Experiência do Usuário (Frontend)**:
  - Botão **"Excluir"** disponibilizado diretamente na aba de Usuários Ativos (permitindo apagar erros de digitação sem inativar antes).
  - Botão **"Excluir Usuário"** adicionado ao rodapé do modal de edição.
  - Botão **"Excluir Definitivamente"** disponível no modal de detalhes para ativos e inativos.
  - Mensagens orientativas no modal de aviso caso a exclusão seja impedida por regras de auditoria condominial.

### D. Validação Amigável de CPF Duplicado (`cadastros.module.ts`, `db.service.ts`)
- Mapeada a restrição de unicidade (`uid_firebase`) para mensagem amigável em português:
  - `"Erro de cadastro: O CPF informado (XXX.XXX.XXX-XX) já está cadastrado no sistema para '[Nome do Morador]'. Cada morador ou dependente deve possuir um CPF próprio e exclusivo."`

---

## 4. Arquivos Modificados e Novos

### Backend
- `backend/src/cadastros/cadastros.module.ts`: Correção de consultas SQL de exclusão, enum de perfil e validação amigável de duplicidade.
- `backend/src/db/db.service.ts`: Tratamento de erro para constraint de `uid_firebase` e log aprimorado.
- `backend/src/portaria/portaria.module.ts`: Suporte a parâmetros flexíveis de consulta da agenda da portaria.
- `backend/src/relatorios/relatorios.module.ts`: Suporte a filtro por mês (`?mes=YYYY-MM`) nos indicadores e gráficos do painel.

### Frontend
- `frontend/src/components/Graficos.tsx`: Reformulação das colunas sólidas e layout do donut.
- `frontend/src/components/Layout.tsx`: Ajustes gerais de layout e navegação.
- `frontend/src/pages/porteiro/Portaria.tsx`: Filtros dinâmicos de áreas comuns, morador/apartamento, status e mês na agenda.
- `frontend/src/pages/sindico/Painel.tsx`: Barra de filtros de reservas, seletor de mês de análise e remoção de fade.
- `frontend/src/pages/sindico/Pessoas.tsx`: Botões de exclusão em ativos/edição e avisos contextuais.

### Documentação
- `Documentos/relatorios_commits/commit_filtros_painel_graficos_e_exclusao_usuarios_2026-09-21.md`: Este relatório técnico.

---

## 5. Procedimento de Validação

1. **Testes Automatizados de Exclusão (API)**:
   - Tentativa de auto-exclusão do administrador: HTTP 400 (bloqueada).
   - Tentativa de exclusão de morador com histórico de reservas: HTTP 400 com aviso para inativação.
   - Exclusão definitiva de morador de teste sem histórico (`teste 3`): HTTP 200 (sucesso) e verificação de 0 registros órfãos no PostgreSQL.
2. **Validação de Duplicidade de CPF**:
   - Tentativa de cadastro com CPF já existente: HTTP 400 retornando o nome do morador detentor do CPF.
3. **Builds e Deploy**:
   - `npm run build` no backend NestJS (compilação limpa).
   - `npm run build` no frontend Vite/React (compilação limpa).
   - Containers `oasis-backend` e `oasis-frontend` atualizados e validados.
