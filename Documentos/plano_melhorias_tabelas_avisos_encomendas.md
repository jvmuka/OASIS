# Plano de Implementação: Paginação, Filtros e Anexos

Este documento detalha o planejamento e a execução das melhorias solicitadas no sistema **OASIS**:
1. **Paginação limitada a até 20 itens por página** em todas as tabelas e listagens do sistema.
2. **Priorização de avisos não lidos** na tabela/mural de avisos, com filtro "Todos" para consulta geral.
3. **Priorização de encomendas não retiradas** na tabela de encomendas (portaria e morador).
4. **Anexos em avisos** com suporte a upload de imagens (JPG, PNG, WebP) e arquivos PDF.

---

## 1. Paginação Limitada a 20 Itens por Página

### Componente Central
- Criação do componente reutilizável `Paginacao` em `frontend/src/components/ui.tsx`.
- Parâmetros:
  - `paginaAtual`: número da página ativa (1-based).
  - `totalItens`: total de registros filtrados.
  - `itensPorPagina`: fixado em `20` por padrão.
  - `aoMudarPagina(novaPagina)`: callback de transição.
- Recursos visuais:
  - Indicador *"Exibindo X a Y de Z registros"*.
  - Botões de navegação "Anterior", números de página e "Próxima".
  - Ocultação dos controles quando o total de itens for <= 20.
  - Reset para a página 1 ao alterar filtros de busca ou abas.

### Telas e Listas Afetadas
1. `sindico/Pessoas.tsx`: Lista principal de moradores e aprovações.
2. `sindico/Areas.tsx`: Tabelas de áreas ativas, áreas inativas e bloqueios de manutenção.
3. `sindico/Painel.tsx`: Tabela de histórico recente de agendamentos.
4. `sindico/PublicarAviso.tsx`: Lista de comunicados e avisos publicados/agendados/expirados.
5. `morador/Mural.tsx`: Lista de cards de avisos do condomínio.
6. `porteiro/Encomendas.tsx`: Lista de encomendas na portaria.
7. `morador/Encomendas.tsx`: Lista de encomendas da unidade.
8. `porteiro/Chaves.tsx`: Grid de chaves físicas e histórico.
9. `porteiro/Portaria.tsx`: Agenda de reservas do dia.
10. `morador/MinhasReservas.tsx`: Lista de reservas do morador.
11. `porteiro/AreasLivres.tsx`: Lista de reservas por área.
12. `morador/Dependentes.tsx`: Lista de dependentes.

---

## 2. Inversão na Tabela de Avisos

### Requisito
- Exibir os avisos não lidos primeiro.
- Manter o filtro de "Todos os avisos" disponível para consulta.

### Ações
- **Frontend (`morador/Mural.tsx`)**:
  - Filtro padrão inicial alterado para `'NAO_LIDOS'` (ou ordenação com não lidos no topo).
  - Botão de filtro **"Não Lidos"** em destaque na primeira posição.
  - Botão de filtro **"Todos os Avisos"** para visualização completa.
  - Ordenação prioritária: fixados -> não lidos -> data de publicação decrescente.
- **Backend (`avisos.module.ts`)**:
  - Ajuste na ordenação da rota `GET /avisos/meus`.

---

## 3. Encomendas: Não Retiradas Primeiro

### Requisito
- Exibir prioritariamente na tabela de encomendas aquelas que ainda não foram retiradas.

### Ações
- **Backend (`portaria.module.ts`)**:
  - Ajuste na query `GET /portaria/encomendas` para ordenar `AGUARDANDO_RETIRADA` primeiro via SQL:
    `ORDER BY (CASE WHEN e.status = 'AGUARDANDO_RETIRADA' THEN 0 ELSE 1 END), e.data_hora_recebimento DESC`.
- **Frontend Portaria (`porteiro/Encomendas.tsx`)**:
  - Filtro inicial padrão alterado para `'AGUARDANDO'`.
  - Na visualização `'TODAS'`, manter a ordenação com aguardando retirada no topo.
- **Frontend Morador (`morador/Encomendas.tsx`)**:
  - Manter aba padrão em `'AGUARDANDO'` e garantir ordenação com pendências primeiro.

---

## 4. Anexos de PDF e Imagens na Funcionalidade de Avisos

### Banco de Dados
- Adição de colunas na tabela `aviso`:
  - `anexo_url VARCHAR(255)`
  - `anexo_nome VARCHAR(255)`
  - `anexo_tipo VARCHAR(50)`
- Atualização em `banco/02_tabelas.sql` e `banco/oasis_banco_completo.sql`.

### Backend
- Criação do endpoint `POST /avisos/upload-anexo` usando Multer com `memoryStorage` ou `diskStorage`.
- Validação de tipos: PDF (`application/pdf`) e imagens (`image/jpeg`, `image/png`, `image/webp`, `image/gif`).
- Persistência em `/uploads/avisos/` com nomes únicos.
- Remoção do anexo do disco em caso de exclusão do aviso (`DELETE /avisos/:id`).
- Atualização dos endpoints `GET /avisos` e `GET /avisos/meus` para incluir as colunas de anexo.

### Frontend
- **Síndico (`PublicarAviso.tsx`)**:
  - Campo de upload de anexo no modal de publicação com preview (miniatura para imagens, card com ícone para PDF).
  - Botão de remover anexo antes de publicar.
  - Coluna/indicador na listagem com link/botão para visualizar ou baixar o anexo.
- **Morador (`Mural.tsx`)**:
  - Exibição de imagens anexadas diretamente no card do aviso com opção de expansão.
  - Card estilizado para download/visualização de arquivos PDF.

---

## 5. Cronograma e Fases de Execução

1. **Fase 1**: Criar componente `Paginacao` e aplicar limite de 20 itens em todas as tabelas.
2. **Fase 2**: Ajustar ordenação e filtros de encomendas na portaria e morador.
3. **Fase 3**: Ajustar ordenação e filtros de avisos no mural.
4. **Fase 4**: Implementar suporte a anexos (SQL, backend e frontends de Síndico e Morador).
5. **Fase 5**: Validação de compilação, testes e checklist final.
