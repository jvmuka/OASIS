# Relatório de Alterações de Commit

## 1. Identificação
- **Hash do Commit**: `7732020`
- **Branch**: `main`
- **Autor**: João Pedro Ramos (`jpbramos50@gmail.com`)
- **Data e Horário**: 2026-09-18 07:50 (UTC-3)

---

## 2. Objetivo
Corrigir a exibição de reservas antigas/passadas no painel do morador (`Minhas Reservas`) e na tela inicial (`Início`), garantindo que agendamentos com data e horário no passado sejam categorizados e exibidos com o status `CONCLUÍDA`, movidos para a aba de Histórico e tenham o botão de cancelamento ocultado, em conformidade com as regras de negócio de cancelamento (`RN08`).

---

## 3. Resumo das Alterações

### Camadas Impactadas
- `frontend`: 
  - Criação de avaliador de ciclo de vida e status temporal em `MinhasReservas.tsx` (`obterStatusReserva`), tratando reservas finalizadas como `CONCLUÍDA` (badge neutro) e reservas em andamento como `EM ANDAMENTO` (badge aviso).
  - Ocultação do botão "Cancelar" para reservas concluídas, em andamento ou que já ultrapassaram o prazo limite de cancelamento (`prazo_cancelamento_horas`).
  - Adequação dos filtros de abas ("Todas", "Ativas / Futuras", "Histórico") para que agendamentos passados fiquem exclusivamente no Histórico.
  - Correção na tela de `Inicio.tsx` para contabilizar apenas reservas ativas futuras no card de resumo "Reservas Ativas".
- `backend`:
  - Proteção adicional no endpoint `PATCH /reservas/:id/cancelar` exigindo `data_hora_inicio > CURRENT_TIMESTAMP` para impedir que requisições tentem cancelar reservas passadas ou já iniciadas.

### Arquivos Modificados
- `frontend/src/pages/morador/MinhasReservas.tsx`
- `frontend/src/pages/Inicio.tsx`
- `backend/src/reservas/reservas.module.ts`

---

## 4. Detalhamento Técnico

1. **Painel de Minhas Reservas (`MinhasReservas.tsx`)**:
   - Implementada a função `obterStatusReserva(r: Reserva)` que avalia `data_hora_inicio`, `data_hora_fim` e `prazo_cancelamento_horas` em relação ao momento atual (`new Date()`).
   - Se a reserva já encerrou (`fim <= agora` ou `r.status === 'CONCLUIDA'`), o status exibido é `CONCLUÍDA`, o badge é configurado como neutro e `podeCancelar` é `false`.
   - Se a reserva está ocorrendo no momento (`inicio <= agora < fim`), o status exibido é `EM ANDAMENTO` e `podeCancelar` é `false`.
   - O botão "Cancelar" é renderizado estritamente quando a reserva é futura e o prazo limite de cancelamento ainda não expirou. Caso o prazo limite tenha expirado, é exibido aviso explicativo discreto em vez do botão.
   - O filtro "Ativas / Futuras" agora filtra por `st.isAtivaOuFutura`, eliminando reservas passadas da listagem de ativas.

2. **Resumo da Tela Inicial (`Inicio.tsx`)**:
   - O contador de `ativas` agora aplica a condição `new Date(r.data_hora_fim) > agora`, evitando que reservas do passado inflem a contagem de agendamentos em aberto.

3. **Backend (`reservas.module.ts`)**:
   - Ajustada a query de cancelamento para validar `data_hora_inicio > CURRENT_TIMESTAMP`, garantindo consistência mesmo se o morador tentar disparar a rota diretamente via API.

---

## 5. Validação
1. Banco de dados sincronizado atualizando reservas expiradas para `CONCLUIDA`.
2. Imagens Docker (`oasis-backend` e `oasis-frontend`) reconstruídas via `docker compose up -d --build`.
3. Verificada a listagem em `Minhas Reservas`: agendamentos anteriores (como dias 10 e 13 de set.) agora figuram com o badge `CONCLUÍDA` e sem o botão de cancelamento.
