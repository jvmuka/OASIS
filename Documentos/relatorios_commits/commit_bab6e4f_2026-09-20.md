# Relatório de Alterações de Commit

## 1. Identificação
- **Branch**: `correcoes-e-melhorias-gerais`
- **Data e Horário**: 2026-09-20 15:30 (UTC-3)

---

## 2. Objetivo
Aprimorar a experiência de reserva e gerenciamento de áreas comuns e controle de chaves:
1. Suporte a reservas até 23h59 (ajuste no gatilho do banco `fn_valida_reserva` e regras de negócio).
2. Tratamento proativo de antecedência mínima na seleção de horários (destaque em laranja e aviso claro sem disparar erro).
3. Exibição clara e destacada no Painel Inicial (`Inicio.tsx`) das chaves em posse do morador ou de seus familiares/unidade.
4. Renomeação do perfil de visualização de "Síndico" para "Administrador" em toda a interface e rotas.
5. Correção de erro 500 ao editar chaves emprestadas (expansão do campo `codigo` e tratamento de campos nulos).
6. Unificação e simplificação da configuração de horários e turnos nas áreas comuns com detecção visual instantânea de conflitos.

---

## 3. Resumo das Alterações

### A. Reservas até 23h59 & Correção do Gatilho RN05
- **Trigger `fn_valida_reserva` (`banco/04_gatilhos.sql`, `banco/oasis_banco_completo.sql`)**:
  - Ajuste para aceitar `hora_fim` até `23:59:59` quando o horário de término cadastrado for às 23:59:00.
  - Normalização dos horários cadastrados para `23:59:59` no banco.
- **Antecedência Mínima Proativa (`NovaReserva.tsx`, `areas.module.ts`, `reservas.module.ts`)**:
  - Retorno do status `ANTECEDENCIA_MINIMA` na consulta de horários disponíveis.
  - Renderização dos horários bloqueados por antecedência mínima em tom laranja com badge de aviso explicativo, impedindo tentativas inválidas e melhorando a usabilidade.

### B. Chaves da Unidade/Família no Painel Inicial
- **Novo Endpoint `GET /portaria/minhas-chaves` (`portaria.module.ts`)**:
  - Busca chaves físicas ativas emprestadas tanto para o morador logado quanto para outros moradores da mesma unidade residencial.
- **Banner e Card de Chaves em `Inicio.tsx`**:
  - Banner de alerta âmbar no topo da tela inicial destacando chaves em posse da residência, exibindo quem retirou, código, data/hora do empréstimo e orientações de devolução.
  - Ajuste no card de resumo para diferenciar chaves em posse da família versus métricas gerais da portaria.

### C. Ajuste do Perfil "Administrador"
- Adequação dos rótulos de navegação, cabeçalhos, títulos de páginas e telas de autenticação (`Layout.tsx`, `App.tsx`, `Login.tsx`, `Pessoas.tsx`, `Areas.tsx`) de "Síndico" para "Administrador", preservando retrocompatibilidade dos papéis no backend (`sindico`).

### D. Correção de Erro na Edição de Chaves
- Ajuste de integridade em `chave.codigo` (`VARCHAR(100)`) e tratamento seguro de valores `null` em observações no `backend/src/portaria/portaria.module.ts`.

---

## 4. Detalhamento dos Arquivos Modificados
- `backend/src/areas/areas.module.ts`
- `backend/src/auth/guards.ts`
- `backend/src/portaria/portaria.module.ts`
- `backend/src/reservas/reservas.module.ts`
- `banco/01_banco_e_tipos.sql`
- `banco/02_tabelas.sql`
- `banco/04_gatilhos.sql`
- `banco/oasis_banco_completo.sql`
- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `frontend/src/components/Layout.tsx`
- `frontend/src/pages/Inicio.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/morador/NovaReserva.tsx`
- `frontend/src/pages/porteiro/Chaves.tsx`
- `frontend/src/pages/sindico/Areas.tsx`
- `frontend/src/pages/sindico/Pessoas.tsx`
- `Documentos/relatorios_commits/commit_turnos_23h59_chaves_inicio_2026-09-20.md`
