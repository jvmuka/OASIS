# Relatório de Alterações de Commit

## 1. Identificação
- **Branch**: `correcoes-e-melhorias-gerais`
- **Data e Horário**: 2026-09-21 23:55 (UTC-3)
- **Mensagem do Commit**: `feat: limites periodicos de reservas, reservas simultaneas por horario e mural no menu de morador`

---

## 2. Objetivo
Implementar a flexibilização da periodicidade do limite de reservas por unidade (permitindo definir se a cota máxima é Diária, Semanal ou Mensal), viabilizar reservas concorrentes/múltiplas no mesmo horário por unidades distintas (ex.: até 2 unidades treinando na Academia ao mesmo tempo), garantir o bloqueio estrito por capacidade total de pessoas somadas da área comum (`RN04`) e integrar o item "Mural de Avisos" diretamente à lista de navegação do perfil de Morador no menu lateral.

---

## 3. Resumo das Alterações

### A. Banco de Dados (PostgreSQL)
- **Novas Colunas na Tabela `area_comum`**:
  - `tipo_limite_reserva VARCHAR(20) NOT NULL DEFAULT 'SEMANAL'`: armazena o período de controle do limite (`'DIARIO'`, `'SEMANAL'`, `'MENSAL'`), validado pela constraint `ck_area_tipo_limite`.
  - `max_unidades_simultaneas INTEGER NOT NULL DEFAULT 1`: define a quantidade máxima de unidades distintas que podem reservar simultaneamente um mesmo horário, validado por `ck_area_max_simultaneas CHECK (max_unidades_simultaneas >= 1)`.
- **Atualização da Trigger Function `fn_valida_reserva()`**:
  - **RN01-A (Bloqueio Mesma Unidade)**: Impede que a mesma unidade possua duas reservas ativas concorrentes no mesmo intervalo de horário.
  - **RN01-B (Unidades Simultâneas)**: Garante que o total de reservas ativas de unidades distintas no horário não ultrapasse `area.max_unidades_simultaneas`.
  - **RN04 (Lotação Máxima Somada)**: Valida `SUM(r.numero_pessoas) + NEW.numero_pessoas <= area.capacidade`. Se uma unidade preencher a capacidade total de pessoas da área (ou a soma de pessoas atingir o teto), o horário fica bloqueado para novas reservas.
  - **RN07 (Periodicidade Dinâmica)**: Agrupa e valida o limite máximo de reservas da unidade por dia (`r.data_hora_inicio::date`), semana (`date_trunc('week', ...)`) ou mês (`date_trunc('month', ...)`), conforme `tipo_limite_reserva`.
- **Sincronização DDL**:
  - Atualizados `banco/02_tabelas.sql`, `banco/04_gatilhos.sql` e `banco/oasis_banco_completo.sql`.

### B. Backend (NestJS)
- **Módulo de Áreas (`backend/src/areas/areas.module.ts`)**:
  - Métodos `criar()` e `editar()` atualizados para receber, validar e persistir `tipo_limite_reserva` e `max_unidades_simultaneas`.
- **Módulo de Reservas (`backend/src/reservas/reservas.module.ts`)**:
  - Endpoint `GET /reservas/disponibilidade`:
    - Identifica se a unidade autenticada já possui reserva no horário (`JA_RESERVADO_POR_VOCE`).
    - Calcula em tempo real para cada slot: `vagas_totais`, `vagas_ocupadas`, `vagas_restantes`, `capacidade_total`, `pessoas_agendadas` e `pessoas_restantes`.
    - Bloqueia com status `OCUPADO` quando as vagas de unidades esgotam ou quando a soma de pessoas atinge a capacidade total da área.

### C. Frontend (React + TypeScript + Tailwind)
- **Tipagem (`frontend/src/types/areas.ts`)**:
  - Adicionados `tipo_limite_reserva?: 'DIARIO' | 'SEMANAL' | 'MENSAL'` e `max_unidades_simultaneas?: number` na interface `Area`.
  - Atualizada a interface `SlotReserva` para incluir status `'JA_RESERVADO_POR_VOCE'` e métricas de vagas e pessoas restantes.
- **Painel do Síndico (`frontend/src/pages/sindico/Areas.tsx`)**:
  - Modais de Criação e Edição com novos campos integrados:
    - Campo `Unidades Simultâneas / Horário` com dica orientativa.
    - Seletor de `Período do Limite` (Diário, Semanal ou Mensal) com rótulo dinâmico para o campo de quantidade.
    - Alerta visual explicativo sobre funcionamento de reservas compartilhadas e lotação de pessoas.
  - Listagem de Áreas: exibição da periodicidade (`Máx. Xx/dia`, `Máx. Xx/semana`, `Máx. Xx/mês`) e badge informativo `👥 Até X unid./horário`.
- **Tela de Nova Reserva (`frontend/src/pages/morador/NovaReserva.tsx`)**:
  - Indicação clara de vagas parciais disponíveis no botão do slot: `Reservado (resta 1 vaga • até X pessoas)` com badge `X VAGA(S) DISP.`
  - Bloqueio orientativo para a própria unidade: `SUA RESERVA`.
  - Bloqueio por lotação de pessoas: `LOTADO (Capacidade máxima de pessoas atingida)`.
  - Campo de quantidade de pessoas limita dinamicamente seu teto ao número de `pessoas_restantes`.
  - Rótulos informativos nas regras da área refletindo o período correto e a modalidade compartilhada.
- **Menu Lateral (`frontend/src/components/Layout.tsx`)**:
  - Item **"Mural de Avisos"** movido diretamente para a seção **MORADOR**.
  - Removido o bloco isolado "COMUNICAÇÃO" para usuários com perfil de morador.

---

## 4. Arquivos Modificados e Novos

| Arquivo | Descrição |
|---|---|
| `banco/02_tabelas.sql` | Novas colunas e constraints na tabela `area_comum` |
| `banco/04_gatilhos.sql` | Atualização da trigger `fn_valida_reserva()` com RN01-A, RN01-B, RN04 e RN07 |
| `banco/oasis_banco_completo.sql` | DDL consolidado atualizado com os novos campos e gatilho |
| `backend/src/areas/areas.module.ts` | Suporte a `tipo_limite_reserva` e `max_unidades_simultaneas` em criação e edição |
| `backend/src/reservas/reservas.module.ts` | Cálculo de vagas/pessoas restantes e status `JA_RESERVADO_POR_VOCE` em disponibilidade |
| `frontend/src/types/areas.ts` | Extensão das interfaces `Area` e `SlotReserva` |
| `frontend/src/pages/sindico/Areas.tsx` | Formulários e listagem de áreas com novos controles de limite e concorrência |
| `frontend/src/pages/morador/NovaReserva.tsx` | Visualização de slots com vagas parciais, lotação de pessoas e bloqueio por unidade |
| `frontend/src/components/Layout.tsx` | Integração do Mural de Avisos na seção de Morador |
| `Documentos/relatorios_commits/commit_limite_periodico_reservas_multiplas_2026-09-21.md` | Relatório técnico das alterações |
